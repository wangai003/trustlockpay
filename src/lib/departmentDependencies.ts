// Cross-department dependency chains
// When department X completes action Y, auto-route alert to department Z

export interface DependencyRoute {
  trigger: string;           // e.g. "kyc_approved"
  sourceDept: string;        // department that triggers
  targetDept: string;        // department that receives
  alertType: string;
  titleTemplate: string;     // supports {entity_id} placeholder
  messageTemplate: string;
  priority: "normal" | "high" | "critical";
}

export const DEPENDENCY_ROUTES: DependencyRoute[] = [
  // Compliance → Finance: KYC cleared, unblock payouts
  {
    trigger: "kyc_approved",
    sourceDept: "compliance",
    targetDept: "finance",
    alertType: "kyc_cleared",
    titleTemplate: "KYC Approved — Unblock Payouts",
    messageTemplate: "Compliance has approved KYC for vendor. Review and release any held payouts for orders above $5,000 threshold.",
    priority: "high",
  },
  // Compliance → Operations: KYC cleared, update transaction statuses
  {
    trigger: "kyc_approved",
    sourceDept: "compliance",
    targetDept: "operations",
    alertType: "kyc_cleared",
    titleTemplate: "KYC Cleared — Update Held Transactions",
    messageTemplate: "KYC approved. Verify all kyc_hold transactions have been transitioned to 'locked' status.",
    priority: "normal",
  },
  // Disputes → Finance: Arbitration fee required
  {
    trigger: "arbitration_requested",
    sourceDept: "disputes",
    targetDept: "finance",
    alertType: "arbitration_fee",
    titleTemplate: "Arbitration Fee Collection Required",
    messageTemplate: "A dispute has escalated to arbitration. Verify OS Pay fee collection and confirm payment before arbitrator assignment.",
    priority: "high",
  },
  // Finance → Operations: Payout processed
  {
    trigger: "payout_processed",
    sourceDept: "finance",
    targetDept: "operations",
    alertType: "payout_complete",
    titleTemplate: "Payout Processed — Update Transaction",
    messageTemplate: "Funds have been disbursed. Mark the transaction as 'released' and notify both parties.",
    priority: "normal",
  },
  // Finance → Compliance: Large transaction flagged
  {
    trigger: "large_transaction",
    sourceDept: "finance",
    targetDept: "compliance",
    alertType: "large_tx_review",
    titleTemplate: "Large Transaction — Compliance Review",
    messageTemplate: "A transaction exceeding the review threshold has been detected. Perform EDD checks and sanctions screening.",
    priority: "high",
  },
  // Disputes → Operations: Dispute resolved, update order
  {
    trigger: "dispute_resolved",
    sourceDept: "disputes",
    targetDept: "operations",
    alertType: "dispute_resolved",
    titleTemplate: "Dispute Resolved — Update Order Status",
    messageTemplate: "Dispute has been resolved. Apply the ruling to the transaction: refund, partial release, or full release as determined.",
    priority: "high",
  },
  // Operations → Correspondence: Order status change, notify client
  {
    trigger: "order_status_changed",
    sourceDept: "operations",
    targetDept: "correspondence",
    alertType: "client_notification",
    titleTemplate: "Client Notification Required",
    messageTemplate: "Order status has changed. Send appropriate update to the buyer/vendor through the client messaging system.",
    priority: "normal",
  },
  // Compliance → Executive: Critical compliance flag
  {
    trigger: "critical_compliance_flag",
    sourceDept: "compliance",
    targetDept: "executive",
    alertType: "compliance_escalation",
    titleTemplate: "🚨 Critical Compliance Flag — Executive Review",
    messageTemplate: "A critical compliance issue has been detected requiring immediate executive attention. Review and determine if override action is needed.",
    priority: "critical",
  },
  // Disputes → Executive: High-value dispute escalation
  {
    trigger: "dispute_escalated",
    sourceDept: "disputes",
    targetDept: "executive",
    alertType: "dispute_escalation",
    titleTemplate: "🚨 Dispute Escalated to Executive",
    messageTemplate: "A high-priority dispute has been escalated. Executive override may be required.",
    priority: "critical",
  },
  // Compliance → Disputes: Sanctions hit on disputed party
  {
    trigger: "sanctions_hit_dispute",
    sourceDept: "compliance",
    targetDept: "disputes",
    alertType: "sanctions_alert",
    titleTemplate: "Sanctions Hit on Disputed Party",
    messageTemplate: "A sanctions screening match was found for a party involved in an active dispute. Freeze case and await compliance guidance.",
    priority: "critical",
  },
];

// Get routes triggered by a specific event
export function getRoutesForTrigger(trigger: string): DependencyRoute[] {
  return DEPENDENCY_ROUTES.filter(r => r.trigger === trigger);
}
