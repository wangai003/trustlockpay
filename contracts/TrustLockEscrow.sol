// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TrustLockEscrow
 * @author TrustLock OS
 * @notice Escrow contract for USDC on Polygon supporting both atomic (single-release)
 *         and milestone-based (partial-release) transactions across all TrustLock industries.
 * @dev All amounts are in micro-USDC (6 decimals). Only the authorised operator
 *      (backend Edge Function signer) can trigger release/refund actions.
 *
 *      Fee routing:
 *        • Platform fee  → deducted at lock time, sent to transactionFeeWallet
 *        • Escrow service fee (1%) → deducted at END OF RELEASE (post buyer-authorization),
 *          atomically split in the same transaction block:
 *            - 99% principal → vendor (direct or via processor for fiat conversion)
 *            - 1% fee → trickles to transactionFeeWallet (USDC, no conversion)
 *        • Refunds → 0% fee, full principal returned to buyer
 *        • Splits → 1% fee from vendor's share only, buyer receives full split amount
 */
contract TrustLockEscrow is ReentrancyGuard {
    // ──────────────────────────────────────────────
    //  Enums
    // ──────────────────────────────────────────────

    /// @notice Distinguishes single-release from multi-stage escrow
    enum EscrowType { ATOMIC, MILESTONE }

    /// @notice Lifecycle status of an escrow
    enum EscrowStatus { LOCKED, RELEASED, REFUNDED, DISPUTED }

    // ──────────────────────────────────────────────
    //  Structs
    // ──────────────────────────────────────────────

    /// @notice Core escrow record (used by both atomic and milestone flows)
    struct Escrow {
        address buyer;
        address vendor;
        uint256 amount;          // principal locked (after platform fee)
        EscrowStatus status;
        EscrowType escrowType;
        uint256 createdAt;
    }

    /// @notice Individual milestone within a milestone-based escrow
    struct MilestoneData {
        uint8   index;
        uint256 amount;
        bool    released;
        bool    buyerApproved;
        bool    vendorApproved;
        uint256 fulfilledAt;     // timestamp when vendor marks fulfilled (0 = not yet)
    }

    // ──────────────────────────────────────────────
    //  State Variables
    // ──────────────────────────────────────────────

    /// @notice USDC token contract
    IERC20 public immutable usdc;

    /// @notice Authorised operator (Edge Function signer)
    address public operator;

    /// @notice Wallet receiving platform fees & trickle-down escrow service fees
    address public transactionFeeWallet;

    /// @notice Wallet temporarily holding escrowed principal
    address public escrowFeeWallet;

    /// @notice Platform fee in basis points (e.g. 150 = 1.5%)
    uint256 public platformFeeBps;

    /// @notice Escrow service fee in basis points (100 = 1.0%)
    uint256 public constant ESCROW_SERVICE_FEE_BPS = 100;

    /// @notice 14-day auto-release window (in seconds)
    uint256 public constant AUTO_RELEASE_WINDOW = 14 days;

    /// @notice Core escrow data by escrowId
    mapping(bytes32 => Escrow) public escrows;

    /// @notice Milestone array per escrowId
    mapping(bytes32 => MilestoneData[]) public milestones;

    /// @notice Total milestone count per escrowId
    mapping(bytes32 => uint8) public milestoneCount;

    // ──────────────────────────────────────────────
    //  Events — Atomic
    // ──────────────────────────────────────────────

    event FundsLocked(bytes32 indexed escrowId, address buyer, address vendor, uint256 amount);
    event FundsReleased(bytes32 indexed escrowId, uint256 amount);
    event BuyerRefunded(bytes32 indexed escrowId, uint256 amount);
    event PayoutSplit(bytes32 indexed escrowId, uint256 buyerAmount, uint256 vendorAmount);

    // ──────────────────────────────────────────────
    //  Events — Milestone
    // ──────────────────────────────────────────────

    event MilestoneLocked(bytes32 indexed escrowId, uint8 count, uint256 totalAmount);
    event MilestoneApproved(bytes32 indexed escrowId, uint8 index, address approver);
    event MilestoneReleased(bytes32 indexed escrowId, uint8 index, uint256 amount);
    event MilestoneRefunded(bytes32 indexed escrowId, uint8 index, uint256 amount);
    event MilestoneSplit(bytes32 indexed escrowId, uint8 index, uint256 buyerAmt, uint256 vendorAmt);

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier onlyOperator() {
        require(msg.sender == operator, "TL: caller is not operator");
        _;
    }

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    /**
     * @param _usdc                USDC token address on Polygon
     * @param _operator            Authorised signer (Edge Function wallet)
     * @param _transactionFeeWallet Wallet for platform + trickle-down fees
     * @param _escrowFeeWallet     Wallet holding escrowed principal
     * @param _platformFeeBps      Platform fee in basis points
     */
    constructor(
        address _usdc,
        address _operator,
        address _transactionFeeWallet,
        address _escrowFeeWallet,
        uint256 _platformFeeBps
    ) {
        require(_usdc != address(0), "TL: zero USDC address");
        require(_operator != address(0), "TL: zero operator");
        require(_transactionFeeWallet != address(0), "TL: zero txn wallet");
        require(_escrowFeeWallet != address(0), "TL: zero escrow wallet");

        usdc = IERC20(_usdc);
        operator = _operator;
        transactionFeeWallet = _transactionFeeWallet;
        escrowFeeWallet = _escrowFeeWallet;
        platformFeeBps = _platformFeeBps;
    }

    // ══════════════════════════════════════════════
    //  ATOMIC FUNCTIONS (existing — kept as-is)
    // ══════════════════════════════════════════════

    /**
     * @notice Lock funds for an atomic (single-release) escrow transaction.
     * @param escrowId   Unique identifier (e.g. keccak256 of TL-{timestamp})
     * @param buyer      Buyer address
     * @param vendor     Vendor address
     * @param totalAmount Total USDC amount INCLUDING platform fee
     */
    function lockFunds(
        bytes32 escrowId,
        address buyer,
        address vendor,
        uint256 totalAmount
    ) external onlyOperator nonReentrant {
        require(escrows[escrowId].createdAt == 0, "TL: escrow exists");
        require(totalAmount > 0, "TL: zero amount");

        // Calculate and route platform fee
        uint256 platformFee = (totalAmount * platformFeeBps) / 10000;
        uint256 principal = totalAmount - platformFee;

        // Transfer total from buyer
        require(usdc.transferFrom(buyer, address(this), totalAmount), "TL: transfer failed");

        // Route platform fee immediately
        if (platformFee > 0) {
            require(usdc.transfer(transactionFeeWallet, platformFee), "TL: fee transfer failed");
        }

        // Store escrow
        escrows[escrowId] = Escrow({
            buyer: buyer,
            vendor: vendor,
            amount: principal,
            status: EscrowStatus.LOCKED,
            escrowType: EscrowType.ATOMIC,
            createdAt: block.timestamp
        });

        emit FundsLocked(escrowId, buyer, vendor, principal);
    }

    /**
     * @notice Release full funds to vendor for an atomic escrow.
     * @dev Deducts 1% escrow service fee and routes it via the TRICKLE-DOWN mechanism:
     *
     *      DUAL SEED TOKEN ARCHITECTURE:
     *      ─────────────────────────────
     *      • OS Pay seed token  → hardwired to transactionFeeWallet (0x7A3b...F92d)
     *        Purpose: Collects platform revenue, processor fees, taxes
     *        Accepts: Fiat via processor APIs + stablecoins (USDC) directly
     *
     *      • OS Payout seed token → hardwired to escrowFeeWallet (0x4E1c...A83b)
     *        Purpose: Holds escrowed principal during transaction lifecycle
     *        Accepts: USDC locked from buyer at checkout
     *
     *      TRICKLE-DOWN FEE FLOW:
     *      ─────────────────────
     *      On RELEASE: escrowFeeWallet deducts 1% service fee from principal
     *                  → transfers fee (stablecoins/USDC) to transactionFeeWallet
     *                  → NO conversion needed — both wallets accept USDC natively
     *                  → this transfer follows the OS Pay token's hardwire route
     *
     *      On REFUND:  escrowFeeWallet returns 100% principal to buyer
     *                  → 0% fee → NO trickle-down to transactionFeeWallet
     *
     *      On SPLIT:   1% fee deducted from VENDOR's share only
     *                  → fee trickles to transactionFeeWallet
     *                  → buyer receives full split amount
     *
     * @param escrowId The escrow to release
     */
    function releaseFunds(bytes32 escrowId) external onlyOperator nonReentrant {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.LOCKED, "TL: not locked");
        require(e.escrowType == EscrowType.ATOMIC, "TL: not atomic");

        uint256 serviceFee = (e.amount * ESCROW_SERVICE_FEE_BPS) / 10000;
        uint256 vendorPayout = e.amount - serviceFee;

        e.status = EscrowStatus.RELEASED;

        // TRICKLE-DOWN: escrow service fee (stablecoins) → transactionFeeWallet
        // This is a direct USDC transfer — no conversion required because
        // the transactionFeeWallet (OS Pay token hardwire) accepts stablecoins natively
        if (serviceFee > 0) {
            require(usdc.transfer(transactionFeeWallet, serviceFee), "TL: trickle-down fee transfer failed");
        }
        require(usdc.transfer(e.vendor, vendorPayout), "TL: vendor transfer failed");

        emit FundsReleased(escrowId, vendorPayout);
    }

    /**
     * @notice Full refund to buyer for an atomic escrow. 0% escrow fee.
     * @param escrowId The escrow to refund
     */
    function refundBuyer(bytes32 escrowId) external onlyOperator nonReentrant {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.LOCKED, "TL: not locked");
        require(e.escrowType == EscrowType.ATOMIC, "TL: not atomic");

        e.status = EscrowStatus.REFUNDED;

        require(usdc.transfer(e.buyer, e.amount), "TL: refund transfer failed");

        emit BuyerRefunded(escrowId, e.amount);
    }

    /**
     * @notice Split payout for atomic dispute arbitration.
     * @dev Escrow service fee (1%) is deducted from VENDOR's share only,
     *      then trickled to transactionFeeWallet in USDC (no conversion).
     *      Buyer receives full split amount with zero fee deduction.
     * @param escrowId     The escrow to split
     * @param buyerAmount  Amount returned to buyer (no fees deducted)
     * @param vendorAmount Amount sent to vendor (before 1% escrow fee deduction)
     */
    function splitPayout(
        bytes32 escrowId,
        uint256 buyerAmount,
        uint256 vendorAmount
    ) external onlyOperator nonReentrant {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.LOCKED, "TL: not locked");
        require(e.escrowType == EscrowType.ATOMIC, "TL: not atomic");
        require(buyerAmount + vendorAmount == e.amount, "TL: amounts mismatch");

        e.status = EscrowStatus.DISPUTED;

        // TRICKLE-DOWN on split: 1% fee from vendor's share only → transactionFeeWallet
        uint256 vendorServiceFee = (vendorAmount * ESCROW_SERVICE_FEE_BPS) / 10000;
        uint256 vendorNet = vendorAmount - vendorServiceFee;

        if (buyerAmount > 0) {
            require(usdc.transfer(e.buyer, buyerAmount), "TL: buyer split failed");
        }
        if (vendorServiceFee > 0) {
            require(usdc.transfer(transactionFeeWallet, vendorServiceFee), "TL: split trickle-down failed");
        }
        if (vendorNet > 0) {
            require(usdc.transfer(e.vendor, vendorNet), "TL: vendor split failed");
        }

        emit PayoutSplit(escrowId, buyerAmount, vendorNet);
    }

    // ══════════════════════════════════════════════
    //  MILESTONE FUNCTIONS (new)
    // ══════════════════════════════════════════════

    /**
     * @notice Lock funds for a milestone-based escrow transaction.
     * @dev Platform fee is deducted and routed immediately (same as atomic).
     *      Sum of milestoneAmounts must equal totalAmount minus platform fee.
     * @param escrowId          Unique identifier
     * @param buyer             Buyer address
     * @param vendor            Vendor address
     * @param totalAmount       Total USDC amount INCLUDING platform fee
     * @param _milestoneCount   Number of milestones (must match array length)
     * @param milestoneAmounts  Array of per-milestone principal amounts
     */
    function lockFundsWithMilestones(
        bytes32 escrowId,
        address buyer,
        address vendor,
        uint256 totalAmount,
        uint8 _milestoneCount,
        uint256[] calldata milestoneAmounts
    ) external onlyOperator nonReentrant {
        require(escrows[escrowId].createdAt == 0, "TL: escrow exists");
        require(totalAmount > 0, "TL: zero amount");
        require(_milestoneCount > 0 && _milestoneCount <= 20, "TL: invalid milestone count");
        require(milestoneAmounts.length == _milestoneCount, "TL: array length mismatch");

        // Calculate and route platform fee
        uint256 platformFee = (totalAmount * platformFeeBps) / 10000;
        uint256 principal = totalAmount - platformFee;

        // Validate milestone amounts sum to principal
        uint256 sum = 0;
        for (uint8 i = 0; i < _milestoneCount; i++) {
            require(milestoneAmounts[i] > 0, "TL: zero milestone amount");
            sum += milestoneAmounts[i];
        }
        require(sum == principal, "TL: milestone amounts != principal");

        // Transfer total from buyer
        require(usdc.transferFrom(buyer, address(this), totalAmount), "TL: transfer failed");

        // Route platform fee immediately
        if (platformFee > 0) {
            require(usdc.transfer(transactionFeeWallet, platformFee), "TL: fee transfer failed");
        }

        // Store escrow
        escrows[escrowId] = Escrow({
            buyer: buyer,
            vendor: vendor,
            amount: principal,
            status: EscrowStatus.LOCKED,
            escrowType: EscrowType.MILESTONE,
            createdAt: block.timestamp
        });

        milestoneCount[escrowId] = _milestoneCount;

        // Initialise each milestone as unreleased
        for (uint8 i = 0; i < _milestoneCount; i++) {
            milestones[escrowId].push(MilestoneData({
                index: i,
                amount: milestoneAmounts[i],
                released: false,
                buyerApproved: false,
                vendorApproved: false,
                fulfilledAt: 0
            }));
        }

        emit MilestoneLocked(escrowId, _milestoneCount, principal);
    }

    /**
     * @notice Record buyer or vendor approval for a specific milestone.
     * @dev When BOTH parties have approved, the milestone becomes releasable.
     *      The operator calls this on behalf of the approving party.
     * @param escrowId       The escrow identifier
     * @param milestoneIndex Zero-based index of the milestone
     * @param isBuyer        true = buyer is approving, false = vendor is approving
     */
    function approveMilestone(
        bytes32 escrowId,
        uint8 milestoneIndex,
        bool isBuyer
    ) external onlyOperator {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.LOCKED, "TL: not locked");
        require(e.escrowType == EscrowType.MILESTONE, "TL: not milestone type");
        require(milestoneIndex < milestoneCount[escrowId], "TL: index out of bounds");

        MilestoneData storage m = milestones[escrowId][milestoneIndex];
        require(!m.released, "TL: already released");

        if (isBuyer) {
            require(!m.buyerApproved, "TL: buyer already approved");
            m.buyerApproved = true;
            emit MilestoneApproved(escrowId, milestoneIndex, e.buyer);
        } else {
            require(!m.vendorApproved, "TL: vendor already approved");
            m.vendorApproved = true;
            // Record fulfilledAt when vendor first approves (marks work as done)
            if (m.fulfilledAt == 0) {
                m.fulfilledAt = block.timestamp;
            }
            emit MilestoneApproved(escrowId, milestoneIndex, e.vendor);
        }
    }

    /**
     * @notice Release a specific milestone's funds to the vendor.
     * @dev Only callable after both buyer and vendor have approved.
     *      Deducts 1% escrow service fee per milestone.
     * @param escrowId       The escrow identifier
     * @param milestoneIndex Zero-based index of the milestone
     */
    function releaseMilestone(
        bytes32 escrowId,
        uint8 milestoneIndex
    ) external onlyOperator nonReentrant {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.LOCKED, "TL: not locked");
        require(e.escrowType == EscrowType.MILESTONE, "TL: not milestone type");
        require(milestoneIndex < milestoneCount[escrowId], "TL: index out of bounds");

        MilestoneData storage m = milestones[escrowId][milestoneIndex];
        require(!m.released, "TL: already released");
        require(m.buyerApproved && m.vendorApproved, "TL: not fully approved");

        m.released = true;

        // Zero-amount checkpoints: no funds move, no fee
        if (m.amount == 0) {
            // If all milestones released, mark escrow as RELEASED
            if (_allMilestonesReleased(escrowId)) {
                e.status = EscrowStatus.RELEASED;
            }
            emit MilestoneReleased(escrowId, milestoneIndex, 0);
            return;
        }

        // Payment milestone: deduct fractional escrow service fee
        // Fee = 1% of THIS milestone's amount (totals to 1% of principal
        // only across payment milestones, since checkpoints have amount=0)
        uint256 serviceFee = (m.amount * ESCROW_SERVICE_FEE_BPS) / 10000;
        uint256 vendorPayout = m.amount - serviceFee;

        // Trickle-down: service fee → transaction wallet
        if (serviceFee > 0) {
            require(usdc.transfer(transactionFeeWallet, serviceFee), "TL: fee transfer failed");
        }
        require(usdc.transfer(e.vendor, vendorPayout), "TL: vendor transfer failed");

        // If all milestones released, mark escrow as RELEASED
        if (_allMilestonesReleased(escrowId)) {
            e.status = EscrowStatus.RELEASED;
        }

        emit MilestoneReleased(escrowId, milestoneIndex, vendorPayout);
    }

    /**
     * @notice Auto-release a milestone after the 14-day window has elapsed.
     * @dev Only applies if vendor has marked fulfilled (fulfilledAt > 0)
     *      and 14 days have passed without buyer dispute.
     * @param escrowId       The escrow identifier
     * @param milestoneIndex Zero-based index of the milestone
     */
    function autoReleaseMilestone(
        bytes32 escrowId,
        uint8 milestoneIndex
    ) external onlyOperator nonReentrant {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.LOCKED, "TL: not locked");
        require(e.escrowType == EscrowType.MILESTONE, "TL: not milestone type");
        require(milestoneIndex < milestoneCount[escrowId], "TL: index out of bounds");

        MilestoneData storage m = milestones[escrowId][milestoneIndex];
        require(!m.released, "TL: already released");
        require(m.fulfilledAt > 0, "TL: not fulfilled");
        require(block.timestamp >= m.fulfilledAt + AUTO_RELEASE_WINDOW, "TL: 14-day window not elapsed");

        m.released = true;
        m.buyerApproved = true;  // implied by auto-release
        m.vendorApproved = true;

        uint256 serviceFee = (m.amount * ESCROW_SERVICE_FEE_BPS) / 10000;
        uint256 vendorPayout = m.amount - serviceFee;

        if (serviceFee > 0) {
            require(usdc.transfer(transactionFeeWallet, serviceFee), "TL: fee transfer failed");
        }
        require(usdc.transfer(e.vendor, vendorPayout), "TL: vendor transfer failed");

        if (_allMilestonesReleased(escrowId)) {
            e.status = EscrowStatus.RELEASED;
        }

        emit MilestoneReleased(escrowId, milestoneIndex, vendorPayout);
    }

    /**
     * @notice Batch auto-release multiple milestones across multiple escrows.
     * @dev Arrays must be the same length. Each pair is processed independently.
     * @param escrowIds        Array of escrow identifiers
     * @param milestoneIndexes Array of milestone indexes (parallel to escrowIds)
     */
    function autoReleaseMilestonesBatch(
        bytes32[] calldata escrowIds,
        uint8[] calldata milestoneIndexes
    ) external onlyOperator nonReentrant {
        require(escrowIds.length == milestoneIndexes.length, "TL: array length mismatch");

        for (uint256 i = 0; i < escrowIds.length; i++) {
            bytes32 eid = escrowIds[i];
            uint8 midx = milestoneIndexes[i];

            Escrow storage e = escrows[eid];
            if (e.status != EscrowStatus.LOCKED) continue;
            if (e.escrowType != EscrowType.MILESTONE) continue;
            if (midx >= milestoneCount[eid]) continue;

            MilestoneData storage m = milestones[eid][midx];
            if (m.released) continue;
            if (m.fulfilledAt == 0) continue;
            if (block.timestamp < m.fulfilledAt + AUTO_RELEASE_WINDOW) continue;

            m.released = true;
            m.buyerApproved = true;
            m.vendorApproved = true;

            uint256 serviceFee = (m.amount * ESCROW_SERVICE_FEE_BPS) / 10000;
            uint256 vendorPayout = m.amount - serviceFee;

            if (serviceFee > 0) {
                usdc.transfer(transactionFeeWallet, serviceFee);
            }
            usdc.transfer(e.vendor, vendorPayout);

            if (_allMilestonesReleased(eid)) {
                e.status = EscrowStatus.RELEASED;
            }

            emit MilestoneReleased(eid, midx, vendorPayout);
        }
    }

    /**
     * @notice Refund a specific unreleased milestone to the buyer. 0% escrow fee.
     * @param escrowId       The escrow identifier
     * @param milestoneIndex Zero-based index of the milestone
     */
    function refundMilestone(
        bytes32 escrowId,
        uint8 milestoneIndex
    ) external onlyOperator nonReentrant {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.LOCKED, "TL: not locked");
        require(e.escrowType == EscrowType.MILESTONE, "TL: not milestone type");
        require(milestoneIndex < milestoneCount[escrowId], "TL: index out of bounds");

        MilestoneData storage m = milestones[escrowId][milestoneIndex];
        require(!m.released, "TL: already released");

        m.released = true; // mark as settled (refunded)

        // Full amount back to buyer — no escrow fee on refunds
        require(usdc.transfer(e.buyer, m.amount), "TL: refund transfer failed");

        // Check if all milestones are now settled
        if (_allMilestonesReleased(escrowId)) {
            e.status = EscrowStatus.REFUNDED;
        }

        emit MilestoneRefunded(escrowId, milestoneIndex, m.amount);
    }

    /**
     * @notice Split a milestone's funds between buyer and vendor (arbitration).
     * @dev buyerAmount + vendorAmount must equal the milestone amount.
     *      Escrow service fee is deducted from the vendor's share only.
     * @param escrowId       The escrow identifier
     * @param milestoneIndex Zero-based index of the milestone
     * @param buyerAmount    Amount to return to buyer
     * @param vendorAmount   Amount to send to vendor (before service fee)
     */
    function splitMilestone(
        bytes32 escrowId,
        uint8 milestoneIndex,
        uint256 buyerAmount,
        uint256 vendorAmount
    ) external onlyOperator nonReentrant {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.LOCKED, "TL: not locked");
        require(e.escrowType == EscrowType.MILESTONE, "TL: not milestone type");
        require(milestoneIndex < milestoneCount[escrowId], "TL: index out of bounds");

        MilestoneData storage m = milestones[escrowId][milestoneIndex];
        require(!m.released, "TL: already released");
        require(buyerAmount + vendorAmount == m.amount, "TL: amounts mismatch");

        m.released = true;

        // Buyer gets full share (no fee on buyer's portion)
        if (buyerAmount > 0) {
            require(usdc.transfer(e.buyer, buyerAmount), "TL: buyer split failed");
        }

        // Vendor share: deduct escrow service fee
        if (vendorAmount > 0) {
            uint256 serviceFee = (vendorAmount * ESCROW_SERVICE_FEE_BPS) / 10000;
            uint256 vendorPayout = vendorAmount - serviceFee;

            if (serviceFee > 0) {
                require(usdc.transfer(transactionFeeWallet, serviceFee), "TL: fee transfer failed");
            }
            require(usdc.transfer(e.vendor, vendorPayout), "TL: vendor split failed");
        }

        if (_allMilestonesReleased(escrowId)) {
            e.status = EscrowStatus.DISPUTED;
        }

        emit MilestoneSplit(escrowId, milestoneIndex, buyerAmount, vendorAmount);
    }

    // ══════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ══════════════════════════════════════════════

    /**
     * @notice Get all milestone data for a given escrow.
     * @param escrowId The escrow identifier
     * @return Array of MilestoneData structs
     */
    function getMilestoneStatus(bytes32 escrowId)
        external
        view
        returns (MilestoneData[] memory)
    {
        return milestones[escrowId];
    }

    /**
     * @notice Get core escrow details.
     * @param escrowId The escrow identifier
     * @return buyer, vendor, amount, status, escrowType, createdAt
     */
    function getEscrow(bytes32 escrowId)
        external
        view
        returns (
            address buyer,
            address vendor,
            uint256 amount,
            EscrowStatus status,
            EscrowType escrowType,
            uint256 createdAt
        )
    {
        Escrow storage e = escrows[escrowId];
        return (e.buyer, e.vendor, e.amount, e.status, e.escrowType, e.createdAt);
    }

    // ══════════════════════════════════════════════
    //  ADMIN FUNCTIONS
    // ══════════════════════════════════════════════

    /**
     * @notice Update the operator address.
     * @param newOperator New authorised signer
     */
    function setOperator(address newOperator) external onlyOperator {
        require(newOperator != address(0), "TL: zero address");
        operator = newOperator;
    }

    /**
     * @notice Update the platform fee rate.
     * @param newFeeBps New fee in basis points (max 500 = 5%)
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOperator {
        require(newFeeBps <= 500, "TL: fee too high");
        platformFeeBps = newFeeBps;
    }

    // ══════════════════════════════════════════════
    //  INTERNAL HELPERS
    // ══════════════════════════════════════════════

    /**
     * @dev Check if all milestones in an escrow have been settled (released/refunded/split).
     */
    function _allMilestonesReleased(bytes32 escrowId) internal view returns (bool) {
        uint8 count = milestoneCount[escrowId];
        for (uint8 i = 0; i < count; i++) {
            if (!milestones[escrowId][i].released) {
                return false;
            }
        }
        return true;
    }
}
