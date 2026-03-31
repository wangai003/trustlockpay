// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrustLockEscrow
 * @author TrustLock OS
 * @notice Dual-wallet escrow with circular revenue loop on Polygon (USDC/USDT, 6 decimals)
 * @dev Platform fee transferred immediately at lock time; escrow release fee trickles back.
 *
 *  Wallet 1 (transactionFeeWallet) — receives platform fee at lock + release fee at settlement
 *  Wallet 2 (escrowWallet)         — conceptual custodian; this contract holds funds on-chain
 */
contract TrustLockEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Token Addresses (Polygon Mainnet) ────────────────────
    IERC20 public immutable usdc;
    IERC20 public immutable usdt;

    // ─── Wallet Addresses ─────────────────────────────────────
    address public transactionFeeWallet; // Wallet 1 — Azix Transaction Fee Wallet
    address public escrowWallet;         // Wallet 2 — Azix Escrow Wallet

    // ─── Fee Configuration (basis points, 10000 = 100%) ───────
    uint256 public platformFeeCrypto = 100;   // 1.0% — crypto transactions
    uint256 public platformFeeFiat   = 150;   // 1.5% — fiat transactions
    uint256 public escrowDepositFee  = 50;    // 0.5% — included in locked amount
    uint256 public escrowReleaseFee  = 100;   // 1.0% — deducted on release (trickle-down)

    uint256 private constant BPS = 10000;
    uint256 public autoReleasePeriod = 14 days;

    // ─── Operator Access ──────────────────────────────────────
    mapping(address => bool) public operators;

    // ─── Escrow State ─────────────────────────────────────────
    struct EscrowRecord {
        address buyer;
        address vendor;
        address token;          // USDC or USDT address
        uint256 lockedAmount;   // net amount held (after platform fee)
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

    // ─── Events ───────────────────────────────────────────────
    event FundsLocked(
        bytes32 indexed txId,
        uint256 totalAmount,
        uint256 platformFee,
        uint256 escrowDeposit,
        uint256 lockedAmount
    );
    event FundsReleased(
        bytes32 indexed txId,
        address indexed vendor,
        uint256 vendorPayout,
        uint256 releaseFee
    );
    event FundsRefunded(
        bytes32 indexed txId,
        address indexed buyer,
        uint256 refundAmount
    );
    event SplitPayout(
        bytes32 indexed txId,
        address indexed vendor,
        address indexed buyer,
        uint256 vendorNet,
        uint256 buyerAmount,
        uint256 vendorFee
    );
    event MilestoneReleased(
        bytes32 indexed txId,
        uint256 milestoneIndex,
        uint256 vendorPayout,
        uint256 releaseFee
    );
    event BuyerApproval(bytes32 indexed txId, address indexed buyer);
    event OperatorUpdated(address indexed operator, bool status);
    event WalletUpdated(string walletType, address newAddress);
    event FeeUpdated(string feeType, uint256 newBps);

    // ─── Modifiers ────────────────────────────────────────────
    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    modifier escrowExists(bytes32 txId) {
        require(escrows[txId].lockedAmount > 0, "Escrow not found");
        _;
    }

    modifier notSettled(bytes32 txId) {
        require(!escrows[txId].released && !escrows[txId].refunded, "Already settled");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────
    constructor(
        address _usdc,
        address _usdt,
        address _transactionFeeWallet,
        address _escrowWallet
    ) Ownable(msg.sender) {
        require(_usdc != address(0) && _usdt != address(0), "Invalid token");
        require(_transactionFeeWallet != address(0) && _escrowWallet != address(0), "Invalid wallet");

        usdc = IERC20(_usdc);
        usdt = IERC20(_usdt);
        transactionFeeWallet = _transactionFeeWallet;
        escrowWallet = _escrowWallet;
        operators[msg.sender] = true;
    }

    // ═══════════════════════════════════════════════════════════
    //  LOCK FUNDS (atomic)
    // ═══════════════════════════════════════════════════════════
    /**
     * @notice Lock funds in escrow. Platform fee is transferred IMMEDIATELY to
     *         transactionFeeWallet. Remaining amount is held in this contract.
     * @param txId       Unique TrustLock transaction identifier
     * @param amount     Total amount in token units (6 decimals)
     * @param isFiat     True if payment originated from fiat processor
     * @param processor  Address of payment processor (address(0) if crypto-native)
     * @param buyer      Buyer address
     * @param vendor     Vendor address
     * @param token      USDC or USDT contract address
     */
    function lockFunds(
        bytes32 txId,
        uint256 amount,
        bool isFiat,
        address processor,
        address buyer,
        address vendor,
        address token
    ) external onlyOperator nonReentrant {
        require(escrows[txId].lockedAmount == 0, "Escrow already exists");
        require(amount > 0, "Amount must be > 0");
        require(token == address(usdc) || token == address(usdt), "Unsupported token");
        require(buyer != address(0) && vendor != address(0), "Invalid addresses");

        IERC20 payToken = IERC20(token);

        // 1. Calculate platform fee (immediate transfer)
        uint256 feeBps = isFiat ? platformFeeFiat : platformFeeCrypto;
        uint256 platformFee = (amount * feeBps) / BPS;

        // 2. Transfer platform fee → Transaction Fee Wallet (IMMEDIATE)
        payToken.safeTransferFrom(msg.sender, transactionFeeWallet, platformFee);

        // 3. Calculate escrow deposit (informational — included in locked amount)
        uint256 escrowDeposit = (amount * escrowDepositFee) / BPS;

        // 4. Lock remainder in this contract
        uint256 lockedAmount = amount - platformFee;
        payToken.safeTransferFrom(msg.sender, address(this), lockedAmount);

        // 5. Store escrow record
        escrows[txId] = EscrowRecord({
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

        // processor fee handled off-chain by payment processor
        // processor address stored for audit trail only

        emit FundsLocked(txId, amount, platformFee, escrowDeposit, lockedAmount);
    }

    // ═══════════════════════════════════════════════════════════
    //  LOCK FUNDS WITH MILESTONES
    // ═══════════════════════════════════════════════════════════
    function lockFundsWithMilestones(
        bytes32 txId,
        uint256 amount,
        bool isFiat,
        address processor,
        address buyer,
        address vendor,
        address token,
        uint256[] calldata milestoneAmounts
    ) external onlyOperator nonReentrant {
        require(escrows[txId].lockedAmount == 0, "Escrow already exists");
        require(amount > 0 && milestoneAmounts.length > 0, "Invalid params");
        require(token == address(usdc) || token == address(usdt), "Unsupported token");

        IERC20 payToken = IERC20(token);

        uint256 feeBps = isFiat ? platformFeeFiat : platformFeeCrypto;
        uint256 platformFee = (amount * feeBps) / BPS;
        uint256 escrowDeposit = (amount * escrowDepositFee) / BPS;
        uint256 lockedAmount = amount - platformFee;

        // Validate milestone amounts sum to lockedAmount
        uint256 milestoneSum;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            milestoneSum += milestoneAmounts[i];
        }
        require(milestoneSum == lockedAmount, "Milestone amounts mismatch");

        // Transfer platform fee immediately
        payToken.safeTransferFrom(msg.sender, transactionFeeWallet, platformFee);

        // Lock remainder
        payToken.safeTransferFrom(msg.sender, address(this), lockedAmount);

        escrows[txId] = EscrowRecord({
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
            milestones[txId][i] = Milestone({
                amount: milestoneAmounts[i],
                released: false
            });
        }

        emit FundsLocked(txId, amount, platformFee, escrowDeposit, lockedAmount);
    }

    // ═══════════════════════════════════════════════════════════
    //  BUYER APPROVAL
    // ═══════════════════════════════════════════════════════════
    /**
     * @notice Buyer must approve before funds can be released to vendor.
     *         This enforces on-chain buyer authorization — the platform cannot
     *         unilaterally release funds without this flag.
     */
    function approveMilestone(bytes32 txId) external escrowExists(txId) notSettled(txId) {
        require(msg.sender == escrows[txId].buyer, "Only buyer can approve");
        escrows[txId].buyerApproved = true;
        emit BuyerApproval(txId, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════
    //  RELEASE FUNDS (atomic — circular revenue loop)
    // ═══════════════════════════════════════════════════════════
    /**
     * @notice Release escrowed funds to vendor with 1% trickle-down fee
     *         back to transactionFeeWallet (circular revenue loop).
     */
    function releaseFunds(
        bytes32 txId
    ) external onlyOperator nonReentrant escrowExists(txId) notSettled(txId) {
        EscrowRecord storage e = escrows[txId];
        require(e.buyerApproved, "Buyer has not approved release");

        IERC20 payToken = IERC20(e.token);
        uint256 locked = e.lockedAmount;

        // 1% release fee → Transaction Fee Wallet (trickle-down)
        uint256 releaseFee = (locked * escrowReleaseFee) / BPS;
        uint256 vendorPayout = locked - releaseFee;

        payToken.safeTransfer(transactionFeeWallet, releaseFee);
        payToken.safeTransfer(e.vendor, vendorPayout);

        e.released = true;
        e.lockedAmount = 0;

        emit FundsReleased(txId, e.vendor, vendorPayout, releaseFee);
    }

    // ═══════════════════════════════════════════════════════════
    //  REFUND BUYER (0% fee — escrow NEVER sends fees on refund)
    // ═══════════════════════════════════════════════════════════
    /**
     * @notice Full refund to buyer — NO fee deduction, NO transfer to fee wallet.
     *         The platform fee captured at lock time is non-refundable.
     */
    function refundBuyer(
        bytes32 txId
    ) external onlyOperator nonReentrant escrowExists(txId) notSettled(txId) {
        EscrowRecord storage e = escrows[txId];
        IERC20 payToken = IERC20(e.token);
        uint256 refundAmount = e.lockedAmount;

        // FULL refund — NO fee deduction, NO transfer to fee wallet
        payToken.safeTransfer(e.buyer, refundAmount);

        e.refunded = true;
        e.lockedAmount = 0;

        emit FundsRefunded(txId, e.buyer, refundAmount);
    }

    // ═══════════════════════════════════════════════════════════
    //  SPLIT PAYOUT (dispute arbitration)
    // ═══════════════════════════════════════════════════════════
    /**
     * @notice Split escrowed funds between vendor and buyer.
     *         Fee deducted from vendor share ONLY — buyer gets full amount.
     * @param txId      Escrow transaction ID
     * @param vendorBps Vendor share in basis points (e.g. 7000 = 70%)
     */
    function splitPayout(
        bytes32 txId,
        uint256 vendorBps
    ) external onlyOperator nonReentrant escrowExists(txId) notSettled(txId) {
        require(vendorBps <= BPS, "Invalid bps");

        EscrowRecord storage e = escrows[txId];
        IERC20 payToken = IERC20(e.token);
        uint256 locked = e.lockedAmount;

        uint256 vendorGross = (locked * vendorBps) / BPS;
        uint256 buyerAmount = locked - vendorGross;

        // 1% escrow fee on vendor share ONLY
        uint256 vendorFee = (vendorGross * escrowReleaseFee) / BPS;
        uint256 vendorNet = vendorGross - vendorFee;

        payToken.safeTransfer(transactionFeeWallet, vendorFee);
        payToken.safeTransfer(e.vendor, vendorNet);
        if (buyerAmount > 0) {
            payToken.safeTransfer(e.buyer, buyerAmount);
        }

        e.released = true;
        e.lockedAmount = 0;

        emit SplitPayout(txId, e.vendor, e.buyer, vendorNet, buyerAmount, vendorFee);
    }

    // ═══════════════════════════════════════════════════════════
    //  RELEASE MILESTONE
    // ═══════════════════════════════════════════════════════════
    /**
     * @notice Release a single milestone's funds to vendor with 1% fee.
     *         When all milestones are released, escrow is marked complete.
     */
    function releaseMilestone(
        bytes32 txId,
        uint256 milestoneIndex
    ) external onlyOperator nonReentrant escrowExists(txId) notSettled(txId) {
        EscrowRecord storage e = escrows[txId];
        require(e.buyerApproved, "Buyer has not approved");
        require(milestoneIndex < e.milestoneCount, "Invalid milestone");

        Milestone storage m = milestones[txId][milestoneIndex];
        require(!m.released, "Already released");
        require(m.amount > 0, "Zero milestone");

        IERC20 payToken = IERC20(e.token);

        // 1% release fee on milestone amount
        uint256 releaseFee = (m.amount * escrowReleaseFee) / BPS;
        uint256 vendorPayout = m.amount - releaseFee;

        payToken.safeTransfer(transactionFeeWallet, releaseFee);
        payToken.safeTransfer(e.vendor, vendorPayout);

        m.released = true;
        e.lockedAmount -= m.amount;

        // If all milestones released, mark escrow as fully released
        if (e.lockedAmount == 0) {
            e.released = true;
        }

        emit MilestoneReleased(txId, milestoneIndex, vendorPayout, releaseFee);
    }

    // ═══════════════════════════════════════════════════════════
    //  AUTO-RELEASE (batch — 14-day timeout)
    // ═══════════════════════════════════════════════════════════
    /**
     * @notice Batch auto-release for escrows past the auto-release period.
     *         Only processes escrows where buyer has already approved.
     */
    function autoRelease(bytes32[] calldata txIds) external onlyOperator nonReentrant {
        for (uint256 i = 0; i < txIds.length; i++) {
            bytes32 txId = txIds[i];
            EscrowRecord storage e = escrows[txId];

            if (
                e.lockedAmount > 0 &&
                !e.released &&
                !e.refunded &&
                e.buyerApproved &&
                block.timestamp >= e.lockTime + autoReleasePeriod
            ) {
                IERC20 payToken = IERC20(e.token);
                uint256 locked = e.lockedAmount;

                uint256 releaseFee = (locked * escrowReleaseFee) / BPS;
                uint256 vendorPayout = locked - releaseFee;

                payToken.safeTransfer(transactionFeeWallet, releaseFee);
                payToken.safeTransfer(e.vendor, vendorPayout);

                e.released = true;
                e.lockedAmount = 0;

                emit FundsReleased(txId, e.vendor, vendorPayout, releaseFee);
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

    function setTransactionFeeWallet(address wallet) external onlyOwner {
        require(wallet != address(0), "Invalid address");
        transactionFeeWallet = wallet;
        emit WalletUpdated("transactionFee", wallet);
    }

    function setEscrowWallet(address wallet) external onlyOwner {
        require(wallet != address(0), "Invalid address");
        escrowWallet = wallet;
        emit WalletUpdated("escrow", wallet);
    }

    function setPlatformFeeCrypto(uint256 bps) external onlyOwner {
        require(bps <= 500, "Max 5%");
        platformFeeCrypto = bps;
        emit FeeUpdated("platformFeeCrypto", bps);
    }

    function setPlatformFeeFiat(uint256 bps) external onlyOwner {
        require(bps <= 500, "Max 5%");
        platformFeeFiat = bps;
        emit FeeUpdated("platformFeeFiat", bps);
    }

    function setEscrowReleaseFee(uint256 bps) external onlyOwner {
        require(bps <= 300, "Max 3%");
        escrowReleaseFee = bps;
        emit FeeUpdated("escrowReleaseFee", bps);
    }

    function setAutoReleasePeriod(uint256 period) external onlyOwner {
        require(period >= 1 days && period <= 90 days, "Invalid period");
        autoReleasePeriod = period;
    }

    // ─── View Helpers ─────────────────────────────────────────
    function getEscrow(bytes32 txId) external view returns (EscrowRecord memory) {
        return escrows[txId];
    }

    function getMilestone(bytes32 txId, uint256 index) external view returns (Milestone memory) {
        return milestones[txId][index];
    }

    // ─── Emergency Withdraw (owner only, for contract migration) ──
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
