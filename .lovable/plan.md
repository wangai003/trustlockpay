

# TrustLock Smart Contract & Backend Audit Report

## Executive Summary
After a full audit of both Solidity contracts (TrustLockEscrow.sol, TrustLockRegistry.sol), 65 edge functions, and all database triggers/functions, the system is architecturally sound. The fee model, milestone logic, and hash-chain anchoring are correctly aligned across all three layers. However, there are **3 bugs requiring urgent fixes**, **4 moderate issues**, and **5 items remaining to complete end-to-end deployment**.

---

## URGENT BUGS (Must Fix)

### 1. Smart Contract: Undefined Variable `milestoneCount` (Line 308)
**File:** `contracts/TrustLockEscrow.sol`, line 308
**Bug:** `lockFundsWithMilestones()` emits `FundsLocked` with `milestoneCount` — but no local variable by that name exists. Should be `uint8(milestoneAmounts.length)`. This will cause a **compilation failure**.
```
// Line 308 — BROKEN:
emit FundsLocked(orderId, token, buyer, vendor, amount, milestoneCount);
// FIX:
emit FundsLocked(orderId, token, buyer, vendor, amount, uint8(milestoneAmounts.length));
```

### 2. Smart Contract: Milestone Fee Can Exceed Milestone Amount
**File:** `contracts/TrustLockEscrow.sol`, lines 466-478
**Bug:** The fractionalized fee divides the total 1% fee equally across ALL milestones (including $0 checkpoints). If a small financial milestone exists alongside checkpoints, the fee share could exceed the milestone amount, causing an underflow revert on `vendorPayout = m.amount - releaseFee`.
**Fix:** Divide the fee by the count of *financial* milestones only (those with `amount > 0`), not `milestoneCount`.

### 3. Escrow Bridge: SHA-256 Used Instead of Keccak-256 for Escrow ID
**File:** `supabase/functions/escrow-bridge/index.ts`, lines 43-55
**Bug:** The `txToEscrowId()` function uses `crypto.subtle.digest("SHA-256")` but the contract comment says it should use `keccak256(abi.encodePacked("TL-", txId))`. When the contract goes live, the escrow IDs won't match between the backend and the smart contract, meaning every lock/release/refund call will fail with "Escrow not found."
**Fix:** Replace with ethers.js `keccak256(toUtf8Bytes(...))` — ethers is already imported in registry-anchor, so it's available.

---

## MODERATE ISSUES

### 4. Registry Anchor: `anchorBatch` Processes Records One-By-One
**File:** `supabase/functions/registry-anchor/index.ts`, lines 341-371
**Issue:** The `anchor_batch` action loops through queued records and calls `sendPolygonTx()` individually instead of using the contract's `anchorBatch()` function. This wastes gas — a batch of 50 records costs 50x the gas instead of ~5x.
**Fix:** Accumulate arrays and call `contract.anchorBatch(hashes, txRefs, types)` in a single transaction.

### 5. Registry Anchor: `verifyHash` Return Signature Mismatch
**File:** The contract's `verifyHash()` returns `(bool exists, uint256 recordId)` but the edge function ABI declares it returns only `(bool)`. On-chain verification calls will fail when the contract is deployed.

### 6. Auto-Release: Missing `buyerApproved` Safety Check
**File:** `supabase/functions/escrow-manager/index.ts`, lines 1393-1502
**Issue:** The `checkAutoRelease()` function releases funds for expired transactions without checking if the buyer ever interacted with the order. The memory doc states: *"if a buyer has remained completely inactive and never interacted, funds are not released automatically."* This safety gate is missing from the backend — it only exists in the smart contract's `autoRelease()` function.
**Fix:** Add a check for buyer activity (e.g., `buyerApproved` flag, or any notification read/action taken) before auto-releasing.

### 7. Wallet Routing Bridge: `transferOnChain` is Stubbed
**File:** `supabase/functions/wallet-routing-bridge/index.ts`, lines 73-92
**Issue:** The actual on-chain transfer function is a stub that always returns `"queued"`. This is expected for pre-deployment, but it means NO real fund movement happens. When going live, this needs to be wired to ethers.js with the deployer wallet.

---

## ITEMS REMAINING FOR END-TO-END COMPLETION

### A. Contract Deployment (Not Yet Done)
- Neither `TrustLockEscrow.sol` nor `TrustLockRegistry.sol` have been deployed
- The following secrets need to be set after deployment:
  - `ESCROW_CONTRACT_ADDRESS`
  - `REGISTRY_CONTRACT_ADDRESS`
  - `POLYGON_RELAYER_PRIVATE_KEY` (set, needs funded wallet)
  - `POLYGON_RPC_URL` (set for Amoy testnet)
  - `DEPLOYER_WALLET_PRIVATE_KEY` (for wallet-routing-bridge)
- **Testnet first**, then mainnet migration

### B. Wire `escrow-bridge` to Live Contract
- Replace `sendContractCall()` stub with actual ethers.js signing
- Wire all 8 actions (lock, release, refund, split, approve, release_milestone, refund_milestone) to real contract calls

### C. Wire `wallet-routing-bridge` to Live Transfers
- Replace `transferOnChain()` stub with real ERC-20 `safeTransfer` calls via ethers.js
- Implement the Relayer's ERC-2771 forwarding for gasless UX

### D. Batch Anchor Cron Job
- The `batch-anchor-blockchain-proofs` cron references `registry-anchor` with `action: anchor_batch`
- This works but uses one-by-one anchoring (see Issue #4) — needs the batch call wired

### E. MinimalForwarder Contract
- ERC-2771 gasless architecture is referenced in the escrow contract but the `MinimalForwarder` companion contract is not in the codebase
- Needs to be deployed alongside the escrow contract, and its address passed as `trustedForwarder`

---

## WHAT'S WORKING CORRECTLY

- Fee model is consistent across all 3 layers (contract, escrow-manager, wallet-routing-bridge): 0.5% upfront + 1% at settlement
- Fractionalized milestone fee logic matches between contract and backend (including final-milestone remainder absorption)
- Refund = 100% to buyer, $0 fees — enforced in both contract and backend
- Split payout applies 1% only to vendor share — correct in both layers
- Hash chain integrity (SHA-256 linking) is correct in registry-anchor
- 14 record types map identically between contract enums, edge function constants, and frontend hook
- Database linter: **zero issues** — all RLS policies are properly configured
- Compliance pre-checks (AML thresholds, velocity, KYC tier limits) are wired correctly
- All 161 migrations are clean

---

## Implementation Plan

1. **Fix 3 urgent bugs** — compilation error, fee underflow, and escrow ID hash mismatch
2. **Fix 4 moderate issues** — batch anchoring, ABI mismatch, auto-release safety gate, and transfer stub annotation
3. **Deploy contracts to Amoy testnet** — requires funded relayer wallet
4. **Wire escrow-bridge and wallet-routing-bridge** to live contract calls
5. **Deploy MinimalForwarder** for gasless UX
6. **End-to-end test** on testnet before mainnet migration

