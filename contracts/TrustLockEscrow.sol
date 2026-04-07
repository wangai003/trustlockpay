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
 *
 *  TRANSACTION_WALLET (0x7A3b...F92d) — receives platform fees at checkout + trickled escrow fees
 *  ESCROW_WALLET      (0x4E1c...A83b) — holds principal + escrow deposit, forwards fees on release
 *
 *  All amounts in stablecoin (6 decimals). All fee rates in basis points (10000 = 100%).
 */
contract TrustLockEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Azix Wallet Addresses (set at deployment) ─────────────
    address public immutable TRANSACTION_WALLET;
    address public immutable ESCROW_WALLET;

    // ─── Supported Tokens (Polygon Mainnet) ──────────────────
    address public constant USDC = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359;
    address public constant USDT = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F;

    mapping(address => bool) public allowedTokens;

    // ─── Fee Constants (basis points) ────────────────────────
    uint256 public constant ESCROW_RELEASE_FEE_BPS = 100; // 1.0% trickle-down on release
    uint256 private constant BPS = 10000;

    uint256 public autoReleasePeriod = 14 days;

    // ─── Operator Access ─────────────────────────────────────
    mapping(address => bool) public operators;

    // ─── Escrow State ────────────────────────────────────────
    struct EscrowRecord {
        address buyer;
        address vendor;
        address token;          // which stablecoin is locked
        uint256 lockedAmount;   // net amount held after platform + processor fees
        uint256 lockTime;
        uint8   milestoneCount;
        bool    released;
        bool    refunded;
        bool    buyerApproved;
    }

    struct Milestone {
        uint256 amount;
        bool    released;
    }

    mapping(bytes32 => EscrowRecord) public escrows;
    mapping(bytes32 => mapping(uint256 => Milestone)) public milestones;

    // ─── Events ──────────────────────────────────────────────
    event FundsLocked(
        bytes32 indexed orderId,
        address indexed token,
        uint256 totalAmount,
        uint256 platformFee,
        uint256 escrowDeposit,
        uint256 processorFee,
        uint256 lockedAmount
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

    event BuyerApproval(bytes32 indexed orderId, address indexed buyer);
    event OperatorUpdated(address indexed operator, bool status);
    event AllowedTokenUpdated(address indexed token, bool status);

    // ─── Modifiers ───────────────────────────────────────────
    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "Not authorized");
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
        address _escrowWallet
    ) Ownable(msg.sender) {
        require(_transactionWallet != address(0), "Invalid transaction wallet");
        require(_escrowWallet != address(0), "Invalid escrow wallet");

        TRANSACTION_WALLET = _transactionWallet;
        ESCROW_WALLET = _escrowWallet;

        allowedTokens[USDC] = true;
        allowedTokens[USDT] = true;
        operators[msg.sender] = true;

        emit AllowedTokenUpdated(USDC, true);
        emit AllowedTokenUpdated(USDT, true);
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
    //  1. LOCK FUNDS — At checkout
    // ═══════════════════════════════════════════════════════════
    function lockFunds(
        bytes32 orderId,
        address token,
        uint256 amount,
        uint256 platformFee,
        uint256 escrowDeposit,
        uint256 processorFee,
        address processor,
        address buyer,
        address vendor
    ) external onlyOperator onlySupportedToken(token) nonReentrant {
        require(escrows[orderId].lockedAmount == 0, "Escrow already exists");
        require(amount > 0, "Amount must be > 0");
        require(buyer != address(0) && vendor != address(0), "Invalid addresses");
        require(platformFee + processorFee < amount, "Fees exceed amount");

        IERC20 stablecoin = IERC20(token);

        // 1. Send platformFee → TRANSACTION_WALLET (immediate)
        if (platformFee > 0) {
            stablecoin.safeTransferFrom(msg.sender, TRANSACTION_WALLET, platformFee);
        }

        // 2. Send processorFee → processor address (immediate)
        if (processorFee > 0 && processor != address(0)) {
            stablecoin.safeTransferFrom(msg.sender, processor, processorFee);
        }

        // 3. Lock remainder in this contract
        uint256 lockedAmount = amount - platformFee - processorFee;
        stablecoin.safeTransferFrom(msg.sender, address(this), lockedAmount);

        // 4. Store escrow record
        escrows[orderId] = EscrowRecord({
            buyer: buyer,
            vendor: vendor,
            token: token,
            lockedAmount: lockedAmount,
            lockTime: block.timestamp,
            milestoneCount: 0,
            released: false,
            refunded: false,
            buyerApproved: false
        });

        emit FundsLocked(orderId, token, amount, platformFee, escrowDeposit, processorFee, lockedAmount);
    }

    // ═══════════════════════════════════════════════════════════
    //  1b. LOCK FUNDS WITH MILESTONES
    // ═══════════════════════════════════════════════════════════
    function lockFundsWithMilestones(
        bytes32 orderId,
        address token,
        uint256 amount,
        uint256 platformFee,
        uint256 escrowDeposit,
        uint256 processorFee,
        address processor,
        address buyer,
        address vendor,
        uint256[] calldata milestoneAmounts
    ) external onlyOperator onlySupportedToken(token) nonReentrant {
        require(escrows[orderId].lockedAmount == 0, "Escrow already exists");
        require(amount > 0 && milestoneAmounts.length > 0, "Invalid params");
        require(platformFee + processorFee < amount, "Fees exceed amount");

        IERC20 stablecoin = IERC20(token);

        if (platformFee > 0) {
            stablecoin.safeTransferFrom(msg.sender, TRANSACTION_WALLET, platformFee);
        }
        if (processorFee > 0 && processor != address(0)) {
            stablecoin.safeTransferFrom(msg.sender, processor, processorFee);
        }

        uint256 lockedAmount = amount - platformFee - processorFee;

        uint256 milestoneSum;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            milestoneSum += milestoneAmounts[i];
        }
        require(milestoneSum == lockedAmount, "Milestone amounts mismatch");

        stablecoin.safeTransferFrom(msg.sender, address(this), lockedAmount);

        escrows[orderId] = EscrowRecord({
            buyer: buyer,
            vendor: vendor,
            token: token,
            lockedAmount: lockedAmount,
            lockTime: block.timestamp,
            milestoneCount: uint8(milestoneAmounts.length),
            released: false,
            refunded: false,
            buyerApproved: false
        });

        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            milestones[orderId][i] = Milestone({
                amount: milestoneAmounts[i],
                released: false
            });
        }

        emit FundsLocked(orderId, token, amount, platformFee, escrowDeposit, processorFee, lockedAmount);
    }

    // ═══════════════════════════════════════════════════════════
    //  BUYER APPROVAL
    // ═══════════════════════════════════════════════════════════
    function approveMilestone(bytes32 orderId) external escrowExists(orderId) notSettled(orderId) {
        require(msg.sender == escrows[orderId].buyer, "Only buyer can approve");
        escrows[orderId].buyerApproved = true;
        emit BuyerApproval(orderId, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════
    //  2. RELEASE FUNDS — Trickle-down 1.0% to TRANSACTION_WALLET
    // ═══════════════════════════════════════════════════════════
    function releaseFunds(
        bytes32 orderId,
        address vendorAddress
    ) external onlyOperator nonReentrant escrowExists(orderId) notSettled(orderId) {
        EscrowRecord storage e = escrows[orderId];
        require(e.buyerApproved, "Buyer has not approved release");
        require(vendorAddress != address(0), "Invalid vendor address");

        IERC20 stablecoin = IERC20(e.token);
        uint256 locked = e.lockedAmount;

        uint256 releaseFee = (locked * ESCROW_RELEASE_FEE_BPS) / BPS;
        uint256 vendorPayout = locked - releaseFee;

        stablecoin.safeTransfer(TRANSACTION_WALLET, releaseFee);
        stablecoin.safeTransfer(vendorAddress, vendorPayout);

        e.released = true;
        e.lockedAmount = 0;

        emit FeeTrickled(orderId, releaseFee, "release");
        emit FundsReleased(orderId, vendorAddress, vendorPayout, releaseFee);
    }

    // ═══════════════════════════════════════════════════════════
    //  3. REFUND BUYER — FULL amount, ZERO fees
    // ═══════════════════════════════════════════════════════════
    function refundBuyer(
        bytes32 orderId,
        address buyerAddress
    ) external onlyOperator nonReentrant escrowExists(orderId) notSettled(orderId) {
        EscrowRecord storage e = escrows[orderId];
        require(buyerAddress != address(0), "Invalid buyer address");

        IERC20 stablecoin = IERC20(e.token);
        uint256 refundAmount = e.lockedAmount;

        stablecoin.safeTransfer(buyerAddress, refundAmount);

        e.refunded = true;
        e.lockedAmount = 0;

        emit FundsRefunded(orderId, buyerAddress, refundAmount);
    }

    // ═══════════════════════════════════════════════════════════
    //  4. SPLIT PAYOUT — 1.0% fee on VENDOR share ONLY
    // ═══════════════════════════════════════════════════════════
    function splitPayout(
        bytes32 orderId,
        address buyerAddress,
        address vendorAddress,
        uint256 vendorShareBps
    ) external onlyOperator nonReentrant escrowExists(orderId) notSettled(orderId) {
        require(vendorShareBps <= BPS, "Invalid bps");
        require(buyerAddress != address(0) && vendorAddress != address(0), "Invalid addresses");

        EscrowRecord storage e = escrows[orderId];
        IERC20 stablecoin = IERC20(e.token);
        uint256 locked = e.lockedAmount;

        uint256 vendorGross = (locked * vendorShareBps) / BPS;
        uint256 buyerAmount = locked - vendorGross;

        uint256 vendorFee = (vendorGross * ESCROW_RELEASE_FEE_BPS) / BPS;
        uint256 vendorNet = vendorGross - vendorFee;

        stablecoin.safeTransfer(TRANSACTION_WALLET, vendorFee);
        stablecoin.safeTransfer(vendorAddress, vendorNet);
        if (buyerAmount > 0) {
            stablecoin.safeTransfer(buyerAddress, buyerAmount);
        }

        e.released = true;
        e.lockedAmount = 0;

        emit FeeTrickled(orderId, vendorFee, "split_payout");
        emit FundsSplit(orderId, vendorAddress, buyerAddress, vendorNet, buyerAmount, vendorFee);
    }

    // ═══════════════════════════════════════════════════════════
    //  RELEASE MILESTONE
    // ═══════════════════════════════════════════════════════════
    function releaseMilestone(
        bytes32 orderId,
        uint256 milestoneIndex,
        address vendorAddress
    ) external onlyOperator nonReentrant escrowExists(orderId) notSettled(orderId) {
        EscrowRecord storage e = escrows[orderId];
        require(e.buyerApproved, "Buyer has not approved");
        require(milestoneIndex < e.milestoneCount, "Invalid milestone");
        require(vendorAddress != address(0), "Invalid vendor address");

        Milestone storage m = milestones[orderId][milestoneIndex];
        require(!m.released, "Already released");
        require(m.amount > 0, "Zero milestone");

        IERC20 stablecoin = IERC20(e.token);

        uint256 releaseFee = (m.amount * ESCROW_RELEASE_FEE_BPS) / BPS;
        uint256 vendorPayout = m.amount - releaseFee;

        stablecoin.safeTransfer(TRANSACTION_WALLET, releaseFee);
        stablecoin.safeTransfer(vendorAddress, vendorPayout);

        m.released = true;
        e.lockedAmount -= m.amount;

        if (e.lockedAmount == 0) {
            e.released = true;
        }

        emit FeeTrickled(orderId, releaseFee, "milestone_release");
        emit MilestoneReleased(orderId, milestoneIndex, vendorPayout, releaseFee);
    }

    // ═══════════════════════════════════════════════════════════
    //  REFUND MILESTONE — Return single milestone to buyer
    // ═══════════════════════════════════════════════════════════
    function refundMilestone(
        bytes32 orderId,
        uint256 milestoneIndex,
        address buyerAddress
    ) external onlyOperator nonReentrant escrowExists(orderId) notSettled(orderId) {
        EscrowRecord storage e = escrows[orderId];
        require(milestoneIndex < e.milestoneCount, "Invalid milestone");
        require(buyerAddress != address(0), "Invalid buyer address");

        Milestone storage m = milestones[orderId][milestoneIndex];
        require(!m.released, "Already released");
        require(m.amount > 0, "Zero milestone");

        IERC20 stablecoin = IERC20(e.token);

        stablecoin.safeTransfer(buyerAddress, m.amount);

        m.released = true;
        e.lockedAmount -= m.amount;

        if (e.lockedAmount == 0) {
            e.refunded = true;
        }

        emit FundsRefunded(orderId, buyerAddress, m.amount);
    }

    // ═══════════════════════════════════════════════════════════
    //  AUTO-RELEASE (batch — 14-day timeout)
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
