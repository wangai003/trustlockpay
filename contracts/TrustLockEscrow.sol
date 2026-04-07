// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrustLockEscrow
 * @author TrustLock OS — Azix Holdings
 * @notice Dual-wallet escrow with circular revenue loop on Polygon (USDC + USDT, 6 decimals)
 *         Gasless via ERC-2771 meta-transactions — all MATIC gas paid by TrustLock Relayer.
 *
 *  Fee Architecture (off-chain → on-chain boundary):
 *    0.5% TrustLock Transaction Fee  → kept off-chain by Transaction Wallet BEFORE funds enter contract
 *    Processor Fee (0–2.9%)          → deducted by processor BEFORE funds reach TrustLock
 *    Gas Fee ($0)                    → MATIC paid by Relayer, never deducted from stablecoins
 *    1.0% Escrow Service Fee         → ONLY fee the contract manages, extracted at release/split
 *    Refund Fee ($0)                 → full locked amount returned, zero deduction
 *
 *  The contract receives ONLY the net principal (after all off-chain deductions).
 *  It locks that principal and extracts 1% at release → TRANSACTION_WALLET.
 *
 *  ERC-2771 Meta-Transactions:
 *    A trustedForwarder (TrustLock Relayer Wallet) can forward user calls.
 *    The Relayer pays MATIC gas on behalf of users. The contract extracts the
 *    original sender from the last 20 bytes of calldata when called by the forwarder.
 *    NO stablecoin amounts are ever deducted for gas — gas is a separate MATIC concern.
 */
contract TrustLockEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Azix Wallet Addresses (set at deployment) ───────────
    address public immutable TRANSACTION_WALLET;
    address public immutable ESCROW_WALLET;

    // ─── Supported Tokens (Polygon Mainnet) ──────────────────
    address public constant USDC = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359;
    address public constant USDT = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F;

    // ─── ERC-2771 Trusted Forwarder (Gasless Meta-Transactions) ─
    address public trustedForwarder;

    mapping(address => bool) public allowedTokens;

    // ─── Fee Constants (basis points) ────────────────────────
    uint256 public constant ESCROW_RELEASE_FEE_BPS = 100; // 1.0% trickle-down on release
    uint256 private constant BPS = 10000;

    uint256 public autoReleasePeriod = 14 days;

    // ─── Operator Access ─────────────────────────────────────
    mapping(address => bool) public operators;

    // ─── Events ──────────────────────────────────────────────
    event TrustedForwarderUpdated(address indexed oldForwarder, address indexed newForwarder);

    // ─── Escrow State ────────────────────────────────────────
    struct EscrowRecord {
        address buyer;
        address vendor;
        address token;
        uint256 lockedAmount;
        uint256 totalPrincipal;    // original total locked (immutable after lock)
        uint256 totalFeesCollected; // running sum of fees extracted across milestones
        uint256 lockTime;
        uint8   milestoneCount;
        uint8   milestonesResolved; // count of completed + refunded milestones
        bool    released;
        bool    refunded;
        bool    buyerApproved;  // global approval (atomic escrows)
    }

    struct Milestone {
        uint256 amount;
        bool    released;
        bool    refunded;       // true if milestone was refunded to buyer
        bool    buyerApproved;  // per-milestone buyer approval
        bool    vendorApproved; // per-milestone vendor approval
    }

    mapping(bytes32 => EscrowRecord) public escrows;
    mapping(bytes32 => mapping(uint256 => Milestone)) public milestones;

    // ─── Events ──────────────────────────────────────────────
    event FundsLocked(
        bytes32 indexed orderId,
        address indexed token,
        address buyer,
        address vendor,
        uint256 lockedAmount,
        uint8   milestoneCount
    );

    event FundsReleased(
        bytes32 indexed orderId,
        address indexed vendor,
        uint256 vendorPayout,
        uint256 releaseFee
    );

    event FundsRefunded(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 refundAmount
    );

    event FundsSplit(
        bytes32 indexed orderId,
        address indexed vendor,
        address indexed buyer,
        uint256 vendorNet,
        uint256 buyerAmount,
        uint256 vendorFee
    );

    event FeeTrickled(
        bytes32 indexed orderId,
        uint256 amount,
        string  reason
    );

    event MilestoneReleased(
        bytes32 indexed orderId,
        uint256 milestoneIndex,
        uint256 vendorPayout,
        uint256 releaseFee
    );

    event MilestoneRefunded(
        bytes32 indexed orderId,
        uint256 milestoneIndex,
        uint256 refundAmount
    );
    event BuyerApproval(bytes32 indexed orderId, address indexed buyer);
    event OperatorUpdated(address indexed operator, bool status);
    event AllowedTokenUpdated(address indexed token, bool status);

    // ─── ERC-2771: Trusted Forwarder Check ─────────────────────
    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return forwarder == trustedForwarder;
    }

    // ─── ERC-2771: Extract original sender from forwarded call ──
    function _msgSender() internal view override returns (address sender) {
        if (isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
            // The original sender is appended as the last 20 bytes of calldata
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            sender = msg.sender;
        }
    }

    // ─── ERC-2771: Extract original calldata from forwarded call ──
    function _msgData() internal view override returns (bytes calldata) {
        if (isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
            return msg.data[:msg.data.length - 20];
        }
        return msg.data;
    }

    // ─── Modifiers ───────────────────────────────────────────
    modifier onlyOperator() {
        require(operators[_msgSender()] || _msgSender() == owner(), "Not authorized");
        _;
    }

    modifier onlySupportedToken(address token) {
        require(allowedTokens[token], "Token not supported");
        _;
    }

    modifier escrowExists(bytes32 orderId) {
        require(escrows[orderId].lockedAmount > 0, "Escrow not found");
        _;
    }

    modifier notSettled(bytes32 orderId) {
        require(!escrows[orderId].released && !escrows[orderId].refunded, "Already settled");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────
    constructor(
        address _transactionWallet,
        address _escrowWallet,
        address _trustedForwarder
    ) Ownable(msg.sender) {
        require(_transactionWallet != address(0), "Invalid transaction wallet");
        require(_escrowWallet != address(0), "Invalid escrow wallet");

        TRANSACTION_WALLET = _transactionWallet;
        ESCROW_WALLET = _escrowWallet;
        trustedForwarder = _trustedForwarder; // Can be address(0) initially

        allowedTokens[USDC] = true;
        allowedTokens[USDT] = true;
        operators[msg.sender] = true;

        emit AllowedTokenUpdated(USDC, true);
        emit AllowedTokenUpdated(USDT, true);
        if (_trustedForwarder != address(0)) {
            emit TrustedForwarderUpdated(address(0), _trustedForwarder);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  TOKEN MANAGEMENT
    // ═══════════════════════════════════════════════════════════
    function setAllowedToken(address token, bool status) external onlyOwner {
        require(token != address(0), "Invalid token address");
        allowedTokens[token] = status;
        emit AllowedTokenUpdated(token, status);
    }

    // ═══════════════════════════════════════════════════════════
    //  1. LOCK FUNDS — Net principal only (fees already deducted off-chain)
    // ═══════════════════════════════════════════════════════════
    /**
     * @param orderId    Unique TrustLock order identifier (bytes32 of tx_id)
     * @param token      USDC or USDT address
     * @param buyer      Buyer wallet address
     * @param vendor     Vendor wallet address
     * @param amount     Net principal to lock (after platform + processor fees deducted off-chain)
     */
    function lockFunds(
        bytes32 orderId,
        address token,
        address buyer,
        address vendor,
        uint256 amount
    ) external onlyOperator onlySupportedToken(token) nonReentrant {
        require(escrows[orderId].lockedAmount == 0, "Escrow already exists");
        require(amount > 0, "Amount must be > 0");
        require(buyer != address(0) && vendor != address(0), "Invalid addresses");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        escrows[orderId] = EscrowRecord({
            buyer: buyer,
            vendor: vendor,
            token: token,
            lockedAmount: amount,
            totalPrincipal: amount,
            totalFeesCollected: 0,
            lockTime: block.timestamp,
            milestoneCount: 0,
            milestonesResolved: 0,
            released: false,
            refunded: false,
            buyerApproved: false
        });

        emit FundsLocked(orderId, token, buyer, vendor, amount, 0);
    }

    // ═══════════════════════════════════════════════════════════
    //  1b. LOCK FUNDS WITH MILESTONES
    // ═══════════════════════════════════════════════════════════
    function lockFundsWithMilestones(
        bytes32 orderId,
        address token,
        address buyer,
        address vendor,
        uint256 amount,
        uint256[] calldata milestoneAmounts
    ) external onlyOperator onlySupportedToken(token) nonReentrant {
        require(escrows[orderId].lockedAmount == 0, "Escrow already exists");
        require(amount > 0 && milestoneAmounts.length > 0, "Invalid params");

        // Validate milestone amounts sum to total
        uint256 milestoneSum;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            milestoneSum += milestoneAmounts[i];
        }
        require(milestoneSum == amount, "Milestone amounts mismatch");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        escrows[orderId] = EscrowRecord({
            buyer: buyer,
            vendor: vendor,
            token: token,
            lockedAmount: amount,
            totalPrincipal: amount,
            totalFeesCollected: 0,
            lockTime: block.timestamp,
            milestoneCount: uint8(milestoneAmounts.length),
            milestonesResolved: 0,
            released: false,
            refunded: false,
            buyerApproved: false
        });

        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            milestones[orderId][i] = Milestone({
                amount: milestoneAmounts[i],
                released: false,
                refunded: false,
                buyerApproved: false,
                vendorApproved: false
            });
        }

        emit FundsLocked(orderId, token, buyer, vendor, amount, milestoneCount);
    }

    // ═══════════════════════════════════════════════════════════
    //  APPROVAL — Per-milestone dual-party OR global (atomic escrows)
    // ═══════════════════════════════════════════════════════════
    /**
     * @notice Approve a specific milestone or the entire escrow.
     * @param orderId       The escrow order
     * @param milestoneIndex Which milestone to approve (ignored for atomic escrows)
     * @param isBuyer       true = buyer approving, false = vendor approving
     *
     * For atomic (non-milestone) escrows: sets global buyerApproved.
     * For milestone escrows: sets per-milestone buyer/vendor approval.
     */
    function approveMilestone(
        bytes32 orderId,
        uint256 milestoneIndex,
        bool isBuyer
    ) external escrowExists(orderId) notSettled(orderId) {
        EscrowRecord storage e = escrows[orderId];

        if (isBuyer) {
            require(_msgSender() == e.buyer, "Only buyer can approve");
        } else {
            require(_msgSender() == e.vendor, "Only vendor can approve");
        }

        // Atomic escrow (no milestones) — set global approval
        if (e.milestoneCount == 0) {
            if (isBuyer) {
                e.buyerApproved = true;
            }
            emit BuyerApproval(orderId, _msgSender());
            return;
        }

        // Milestone escrow — per-milestone approval
        require(milestoneIndex < e.milestoneCount, "Invalid milestone");
        Milestone storage m = milestones[orderId][milestoneIndex];
        require(!m.released && !m.refunded, "Already settled");

        if (isBuyer) {
            m.buyerApproved = true;
        } else {
            m.vendorApproved = true;
        }

        emit BuyerApproval(orderId, _msgSender());
    }

    // ═══════════════════════════════════════════════════════════
    //  2. RELEASE FUNDS — 1.0% escrow fee → TRANSACTION_WALLET
    // ═══════════════════════════════════════════════════════════
    function releaseFunds(
        bytes32 orderId
    ) external onlyOperator nonReentrant escrowExists(orderId) notSettled(orderId) {
        EscrowRecord storage e = escrows[orderId];
        require(e.buyerApproved, "Buyer has not approved release");

        IERC20 stablecoin = IERC20(e.token);
        uint256 locked = e.lockedAmount;

        uint256 releaseFee = (locked * ESCROW_RELEASE_FEE_BPS) / BPS;
        uint256 vendorPayout = locked - releaseFee;

        stablecoin.safeTransfer(TRANSACTION_WALLET, releaseFee);
        stablecoin.safeTransfer(e.vendor, vendorPayout);

        e.released = true;
        e.lockedAmount = 0;

        emit FeeTrickled(orderId, releaseFee, "release");
        emit FundsReleased(orderId, e.vendor, vendorPayout, releaseFee);
    }

    // ═══════════════════════════════════════════════════════════
    //  3. REFUND BUYER — FULL locked amount, ZERO fees, NO trickle
    // ═══════════════════════════════════════════════════════════
    function refundBuyer(
        bytes32 orderId
    ) external onlyOperator nonReentrant escrowExists(orderId) notSettled(orderId) {
        EscrowRecord storage e = escrows[orderId];

        IERC20 stablecoin = IERC20(e.token);
        uint256 refundAmount = e.lockedAmount;

        stablecoin.safeTransfer(e.buyer, refundAmount);

        e.refunded = true;
        e.lockedAmount = 0;

        emit FundsRefunded(orderId, e.buyer, refundAmount);
    }

    // ═══════════════════════════════════════════════════════════
    //  4. SPLIT PAYOUT — Pre-calculated amounts, 1.0% fee on vendor share
    // ═══════════════════════════════════════════════════════════
    /**
     * @notice Split escrowed funds (dispute resolution). Backend pre-calculates amounts.
     * @param orderId       The escrow order
     * @param buyerAmount   Exact amount to return to buyer (0 fees)
     * @param vendorAmount  Gross amount for vendor (1% escrow fee deducted from this)
     */
    function splitPayout(
        bytes32 orderId,
        uint256 buyerAmount,
        uint256 vendorAmount
    ) external onlyOperator nonReentrant escrowExists(orderId) notSettled(orderId) {
        EscrowRecord storage e = escrows[orderId];
        require(buyerAmount + vendorAmount == e.lockedAmount, "Amounts must equal locked total");

        IERC20 stablecoin = IERC20(e.token);

        // 1% escrow fee on vendor share only
        uint256 vendorFee = (vendorAmount * ESCROW_RELEASE_FEE_BPS) / BPS;
        uint256 vendorNet = vendorAmount - vendorFee;

        stablecoin.safeTransfer(TRANSACTION_WALLET, vendorFee);
        stablecoin.safeTransfer(e.vendor, vendorNet);
        if (buyerAmount > 0) {
            stablecoin.safeTransfer(e.buyer, buyerAmount);
        }

        e.released = true;
        e.lockedAmount = 0;

        emit FeeTrickled(orderId, vendorFee, "split_payout");
        emit FundsSplit(orderId, e.vendor, e.buyer, vendorNet, buyerAmount, vendorFee);
    }

    // ═══════════════════════════════════════════════════════════
    //  RELEASE MILESTONE — Fractionalized 1% fee across milestones
    //  fractionalFee = (totalPrincipal × 100 bps) ÷ (BPS × milestoneCount)
    //  Final financial milestone absorbs rounding remainder → total = exactly 1%
    // ═══════════════════════════════════════════════════════════
    function releaseMilestone(
        bytes32 orderId,
        uint256 milestoneIndex
    ) external onlyOperator nonReentrant escrowExists(orderId) notSettled(orderId) {
        EscrowRecord storage e = escrows[orderId];
        require(milestoneIndex < e.milestoneCount, "Invalid milestone");

        Milestone storage m = milestones[orderId][milestoneIndex];
        require(m.buyerApproved, "Buyer has not approved this milestone");
        require(!m.released && !m.refunded, "Already settled");

        // $0 checkpoint milestones — documentation only, skip financial routing
        if (m.amount == 0) {
            m.released = true;
            e.milestonesResolved++;
            _checkAllResolved(orderId, e);
            emit MilestoneReleased(orderId, milestoneIndex, 0, 0);
            return;
        }

        IERC20 stablecoin = IERC20(e.token);

        // Fractionalized fee: 1% of total principal ÷ milestone count
        uint256 totalEscrowFee = (e.totalPrincipal * ESCROW_RELEASE_FEE_BPS) / BPS;
        uint256 fractionalFee = totalEscrowFee / uint256(e.milestoneCount);

        // Remainder absorption: if this is the last financial milestone, absorb remainder
        uint256 releaseFee;
        if (_countRemainingFinancial(orderId, e) == 1) {
            releaseFee = totalEscrowFee - e.totalFeesCollected;
        } else {
            releaseFee = fractionalFee;
        }

        uint256 vendorPayout = m.amount - releaseFee;

        stablecoin.safeTransfer(TRANSACTION_WALLET, releaseFee);
        stablecoin.safeTransfer(e.vendor, vendorPayout);

        m.released = true;
        e.lockedAmount -= m.amount;
        e.totalFeesCollected += releaseFee;
        e.milestonesResolved++;

        _checkAllResolved(orderId, e);

        emit FeeTrickled(orderId, releaseFee, "milestone_release");
        emit MilestoneReleased(orderId, milestoneIndex, vendorPayout, releaseFee);
    }

    // ═══════════════════════════════════════════════════════════
    //  REFUND MILESTONE — Full milestone amount to buyer, $0 fees, no trickle
    // ═══════════════════════════════════════════════════════════
    function refundMilestone(
        bytes32 orderId,
        uint256 milestoneIndex
    ) external onlyOperator nonReentrant escrowExists(orderId) notSettled(orderId) {
        EscrowRecord storage e = escrows[orderId];
        require(milestoneIndex < e.milestoneCount, "Invalid milestone");

        Milestone storage m = milestones[orderId][milestoneIndex];
        require(!m.released && !m.refunded, "Already settled");

        // $0 checkpoint — just mark resolved
        if (m.amount == 0) {
            m.refunded = true;
            e.milestonesResolved++;
            _checkAllResolved(orderId, e);
            emit MilestoneRefunded(orderId, milestoneIndex, 0);
            return;
        }

        IERC20(e.token).safeTransfer(e.buyer, m.amount);

        m.refunded = true;
        e.lockedAmount -= m.amount;
        e.milestonesResolved++;

        _checkAllResolved(orderId, e);

        emit MilestoneRefunded(orderId, milestoneIndex, m.amount);
    }

    // ─── Internal: auto-settle when all milestones resolved ──────
    function _checkAllResolved(bytes32 orderId, EscrowRecord storage e) internal {
        if (e.milestonesResolved >= e.milestoneCount && e.lockedAmount == 0) {
            bool anyReleased = false;
            for (uint256 i = 0; i < e.milestoneCount; i++) {
                if (milestones[orderId][i].released) {
                    anyReleased = true;
                    break;
                }
            }
            if (anyReleased) {
                e.released = true;
            } else {
                e.refunded = true;
            }
        }
    }

    // ─── Internal: count remaining financial milestones (amount > 0) ──
    function _countRemainingFinancial(bytes32 orderId, EscrowRecord storage e) internal view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < e.milestoneCount; i++) {
            Milestone storage m = milestones[orderId][i];
            if (!m.released && !m.refunded && m.amount > 0) {
                count++;
            }
        }
        return count;
    }

    // ═══════════════════════════════════════════════════════════
    //  AUTO-RELEASE (batch — adaptive timeout)
    // ═══════════════════════════════════════════════════════════
    function autoRelease(bytes32[] calldata orderIds) external onlyOperator nonReentrant {
        for (uint256 i = 0; i < orderIds.length; i++) {
            bytes32 oid = orderIds[i];
            EscrowRecord storage e = escrows[oid];

            if (
                e.lockedAmount > 0 &&
                !e.released &&
                !e.refunded &&
                e.buyerApproved &&
                block.timestamp >= e.lockTime + autoReleasePeriod
            ) {
                IERC20 stablecoin = IERC20(e.token);
                uint256 locked = e.lockedAmount;
                uint256 releaseFee = (locked * ESCROW_RELEASE_FEE_BPS) / BPS;
                uint256 vendorPayout = locked - releaseFee;

                stablecoin.safeTransfer(TRANSACTION_WALLET, releaseFee);
                stablecoin.safeTransfer(e.vendor, vendorPayout);

                e.released = true;
                e.lockedAmount = 0;

                emit FeeTrickled(oid, releaseFee, "auto_release");
                emit FundsReleased(oid, e.vendor, vendorPayout, releaseFee);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════
    function setOperator(address op, bool status) external onlyOwner {
        operators[op] = status;
        emit OperatorUpdated(op, status);
    }

    function setAutoReleasePeriod(uint256 period) external onlyOwner {
        require(period >= 1 days && period <= 90 days, "Invalid period");
        autoReleasePeriod = period;
    }

    /// @notice Update the trusted forwarder address for ERC-2771 key rotation
    function setTrustedForwarder(address _newForwarder) external onlyOwner {
        address old = trustedForwarder;
        trustedForwarder = _newForwarder;
        emit TrustedForwarderUpdated(old, _newForwarder);
    }

    // ─── View Helpers ────────────────────────────────────────
    function getEscrow(bytes32 orderId) external view returns (EscrowRecord memory) {
        return escrows[orderId];
    }

    function getMilestone(bytes32 orderId, uint256 index) external view returns (Milestone memory) {
        return milestones[orderId][index];
    }

    // ─── Emergency Withdraw (owner only, for contract migration) ──
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner onlySupportedToken(token) {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
