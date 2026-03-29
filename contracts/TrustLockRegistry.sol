// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TrustLockRegistry
 * @notice Immutable on-chain record-keeping for TrustLock trade documents.
 *         Stores SHA-256 content hashes of invoices, contracts, signatures,
 *         milestone completions, observer sign-offs, and dispute rulings.
 *         No sensitive data is stored — only cryptographic proofs.
 *
 * @dev Deploy on Polygon PoS for low-cost anchoring (~$0.001 per record).
 *      The operator address is the only entity that can write records,
 *      ensuring all anchoring originates from TrustLock backend.
 */

contract TrustLockRegistry {
    // ─── Types ────────────────────────────────────────────────
    enum RecordType {
        INVOICE,            // 0 — Proforma or standalone invoice
        CONTRACT,           // 1 — Pre-order signatory contract
        SIGNATURE,          // 2 — Digital signature event
        MILESTONE,          // 3 — Milestone completion
        OBSERVER_SIGNOFF,   // 4 — Third-party observer verification
        DISPUTE_RULING,     // 5 — Arbitration or dispute resolution
        DOCUMENT_UPLOAD,    // 6 — KYC, certificate, evidence upload
        ACKNOWLEDGEMENT,    // 7 — Acknowledgement form signed
        PAYOUT,             // 8 — Fund release or refund
        AML_SCREENING,      // 9 — Sanctions/AML check result
        GPS_VERIFICATION,   // 10 — Location proof at milestone
        PRICE_LOCK,         // 11 — Commodity price snapshot
        REJECTION,          // 12 — Vendor order rejection
        HASH_CHAIN_ANCHOR   // 13 — Periodic hash-chain checkpoint
    }

    struct Record {
        bytes32 contentHash;    // SHA-256 hash of the document/event data
        bytes32 prevHash;       // Hash of the previous record (chain link)
        RecordType recordType;  // Category of the record
        uint48 timestamp;       // Block timestamp when anchored
        bytes32 txRef;          // TrustLock internal transaction reference
    }

    // ─── State ────────────────────────────────────────────────
    address public operator;
    uint256 public recordCount;

    // All records in insertion order
    mapping(uint256 => Record) public records;

    // Lookup: contentHash → recordId (for verification)
    mapping(bytes32 => uint256) public hashToRecordId;

    // Lookup: txRef → array of recordIds (all records for a transaction)
    mapping(bytes32 => uint256[]) public txRecords;

    // Latest hash in the chain (for linking)
    bytes32 public latestHash;

    // ─── Events ───────────────────────────────────────────────
    event RecordAnchored(
        uint256 indexed recordId,
        bytes32 indexed contentHash,
        bytes32 indexed txRef,
        RecordType recordType,
        uint48 timestamp
    );

    event OperatorTransferred(address indexed oldOperator, address indexed newOperator);

    // ─── Modifiers ────────────────────────────────────────────
    modifier onlyOperator() {
        require(msg.sender == operator, "TLR: caller is not operator");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────
    constructor(address _operator) {
        require(_operator != address(0), "TLR: zero address");
        operator = _operator;
        latestHash = bytes32(0);
    }

    // ─── Core Functions ───────────────────────────────────────

    /**
     * @notice Anchor a single record on-chain.
     * @param contentHash SHA-256 hash of the document/event JSON
     * @param txRef       TrustLock transaction reference (bytes32 of tx_id)
     * @param recordType  Category enum value
     * @return recordId   The sequential ID of the anchored record
     */
    function anchorRecord(
        bytes32 contentHash,
        bytes32 txRef,
        RecordType recordType
    ) external onlyOperator returns (uint256 recordId) {
        require(contentHash != bytes32(0), "TLR: empty hash");
        require(hashToRecordId[contentHash] == 0 || recordCount == 0, "TLR: duplicate hash");

        recordId = recordCount;

        records[recordId] = Record({
            contentHash: contentHash,
            prevHash: latestHash,
            recordType: recordType,
            timestamp: uint48(block.timestamp),
            txRef: txRef
        });

        hashToRecordId[contentHash] = recordId + 1; // +1 so 0 means "not found"
        txRecords[txRef].push(recordId);
        latestHash = contentHash;
        recordCount++;

        emit RecordAnchored(recordId, contentHash, txRef, recordType, uint48(block.timestamp));
    }

    /**
     * @notice Anchor multiple records in a single transaction (gas-efficient batch).
     * @param contentHashes Array of SHA-256 hashes
     * @param txRefs        Array of transaction references
     * @param recordTypes   Array of record type enums
     */
    function anchorBatch(
        bytes32[] calldata contentHashes,
        bytes32[] calldata txRefs,
        RecordType[] calldata recordTypes
    ) external onlyOperator {
        uint256 len = contentHashes.length;
        require(len == txRefs.length && len == recordTypes.length, "TLR: length mismatch");
        require(len <= 50, "TLR: batch too large");

        for (uint256 i = 0; i < len; i++) {
            bytes32 h = contentHashes[i];
            require(h != bytes32(0), "TLR: empty hash in batch");

            uint256 rid = recordCount;

            records[rid] = Record({
                contentHash: h,
                prevHash: latestHash,
                recordType: recordTypes[i],
                timestamp: uint48(block.timestamp),
                txRef: txRefs[i]
            });

            hashToRecordId[h] = rid + 1;
            txRecords[txRefs[i]].push(rid);
            latestHash = h;
            recordCount++;

            emit RecordAnchored(rid, h, txRefs[i], recordTypes[i], uint48(block.timestamp));
        }
    }

    // ─── View Functions ───────────────────────────────────────

    /**
     * @notice Verify if a content hash exists on-chain.
     * @return exists    Whether the hash was anchored
     * @return recordId  The record ID (valid only if exists == true)
     */
    function verifyHash(bytes32 contentHash) external view returns (bool exists, uint256 recordId) {
        uint256 rid = hashToRecordId[contentHash];
        if (rid == 0) {
            return (false, 0);
        }
        return (true, rid - 1);
    }

    /**
     * @notice Get all record IDs associated with a transaction reference.
     */
    function getTransactionRecords(bytes32 txRef) external view returns (uint256[] memory) {
        return txRecords[txRef];
    }

    /**
     * @notice Get full record details by ID.
     */
    function getRecord(uint256 recordId) external view returns (Record memory) {
        require(recordId < recordCount, "TLR: invalid recordId");
        return records[recordId];
    }

    /**
     * @notice Verify the hash chain integrity between two record IDs.
     * @return valid True if each record's prevHash matches the prior record's contentHash
     */
    function verifyChain(uint256 fromId, uint256 toId) external view returns (bool valid) {
        require(fromId <= toId && toId < recordCount, "TLR: invalid range");
        for (uint256 i = fromId + 1; i <= toId; i++) {
            if (records[i].prevHash != records[i - 1].contentHash) {
                return false;
            }
        }
        return true;
    }

    // ─── Admin ────────────────────────────────────────────────

    /**
     * @notice Transfer operator role to a new address.
     */
    function transferOperator(address newOperator) external onlyOperator {
        require(newOperator != address(0), "TLR: zero address");
        emit OperatorTransferred(operator, newOperator);
        operator = newOperator;
    }
}
