
## Wire Complete Blockchain Proof Anchoring (14-Block Protocol)

### Already Done ✅
- Shipping confirmed (manage-transaction)
- Delivery confirmed (manage-transaction)
- Vendor rejection + refund (manage-transaction)
- Dispute opened (manage-transaction)

### Phase 1: Fix manage-transaction gaps
- Add anchoring to `unfreeze_transaction` (compliance resolution proof)
- Add anchoring to `compliance_reject_refund` (compliance rejection + refund proof)

### Phase 2: Survey & wire remaining edge functions
Read and add `anchorProof` calls to:
- `escrow-manager` — milestone release, cancellation, fund locking
- `manage-dispute` — dispute resolution/ruling outcome
- `process-payment` — invoice creation, price lock snapshot
- `manage-kyc` — KYC approval/rejection outcomes
- `transak-offramp` / payout functions — payout completion events
- `auto-signature-protocol` — contract signing (digital signatures)
- `acknowledgement-form` — acknowledgement form signing
- `document-scanner` — document upload verification
- `sanctions-screening` — AML screening results
- `checkout-widget` — initial order/invoice creation

### Phase 3: Verify all 14 record types are covered
1. Invoice ← checkout-widget / process-payment
2. Contract ← auto-signature-protocol
3. Digital Signatures ← auto-signature-protocol
4. Milestones ← escrow-manager
5. Observer Sign-offs ← escrow-manager
6. Dispute Rulings ← manage-dispute
7. Document Uploads ← document-scanner
8. Acknowledgement Forms ← acknowledgement-form
9. Payout Events ← transak-offramp / payout functions
10. AML Screening ← sanctions-screening
11. GPS Verification ← escrow-manager (shipment)
12. Price Lock Snapshots ← process-payment / checkout-widget
13. Rejection Records ← manage-transaction ✅
14. Integrity Checkpoints ← registry-anchor (batch job) ✅
