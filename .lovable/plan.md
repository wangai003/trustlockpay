

# Fund Flow Alignment: Subtotal-Only Escrow Routing

## Current State — Already Correct

After reviewing the full stack (feeEngine.ts, wallet-routing-bridge, escrow-bridge, TrustLockEscrow.sol), the system **already implements** the exact model you described:

```text
CHECKOUT FLOW:
  Buyer pays: Subtotal + 0.5% platform fee + processor fee + taxes
                    ↓
  Processor takes their cut (before funds reach TrustLock)
                    ↓
  ALL remaining funds → Transaction Fee Wallet
                    ↓
  TX Wallet keeps: 0.5% platform fee + taxes
  TX Wallet routes: EXACT SUBTOTAL → Escrow Wallet (smart contract)
                    ↓
  Contract locks: EXACT SUBTOTAL (no fees baked in upfront)

RELEASE FLOW (Atomic):
  Contract extracts 1% from locked subtotal → TX Wallet (fee loop)
  Vendor receives: subtotal - 1% = net payout

RELEASE FLOW (Milestone):
  Each milestone release: fractional fee = 1% ÷ total milestones
  Final milestone absorbs rounding remainder
  All fractional fees route back to TX Wallet (fee loop)
```

### What is already wired correctly

1. **feeEngine.ts** — `escrowWalletReceives: escrowPrincipal` (the agreed subtotal, nothing more)
2. **wallet-routing-bridge** — Routes only `escrowPrincipal` from TX Wallet to Escrow Wallet
3. **escrow-bridge** — Calculates `escrowFee = amount * 1%` at release, `vendorPayout = amount - escrowFee`
4. **TrustLockEscrow.sol** — `ESCROW_RELEASE_FEE_BPS = 100` (1%), extracted at `releaseFunds` and `releaseMilestone`, sent to `TRANSACTION_WALLET`
5. **Milestone fractionalization** — `fractionalFee = totalEscrowFee / milestoneCount`, remainder absorption on last milestone
6. **Refunds** — $0 fees, full principal returned
7. **Split payouts** — 1% on vendor share only, buyer gets full amount

### Minor Cleanup Items (3 small fixes)

These are comment/documentation clarifications, not logic bugs:

1. **feeEngine.ts line 5-8**: Comments say "1% escrow fee baked in" — misleading. The escrow fee is NOT baked into the principal sent to the escrow wallet. It is extracted at release. Update comments to say: "Escrow Wallet holds vendor principal. On release, 1% is extracted and trickled back to Transaction Fee Wallet."

2. **wallet-routing-bridge line 19**: Same misleading comment about "pre-paid escrow fee." Update to: "Holds vendor principal until release. 1% escrow service fee extracted only upon deal completion."

3. **InvoiceFeeCalculator.tsx**: The `Escrow Service Fee (1.0%)` line should include a note like: "Deducted from vendor payout only when the deal is completed — never deducted upfront." (This is partially done but could be more explicit.)

### No structural changes needed

The architecture already ensures:
- Only the exact subtotal leaves the TX Wallet to the Escrow Wallet
- The 1% is never deducted until a deal is complete (release or milestone completion)
- The fee loops back to the TX Wallet (circular revenue model)
- Milestone fees are fractionalized per the formula you described

### Implementation steps

1. Update misleading comments in `feeEngine.ts`, `wallet-routing-bridge`, and `InvoiceFeeCalculator.tsx` to clearly state: escrow fee is deferred until deal completion
2. Add an explicit `escrowFeeDeferred: true` flag to the `InvoiceFeeCalculation` interface for frontend clarity
3. Update the invoice UI note to read: "This fee is only collected when the deal is marked complete — never upfront"

