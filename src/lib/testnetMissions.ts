// Guided Testnet — declarative mission definitions per role.
// Missions teach the real workflow without mainnet risk. Soft graduation only.

export type TestnetRole = "vendor" | "buyer" | "lender";

export type Mission = {
  id: string;
  title: string;
  description: string;
  /** Action the user takes inside the real testnet UI to complete this mission. */
  cta: string;
  /** Optional deep-link or hash anchor inside the role's dashboard. */
  href?: string;
};

export const TESTNET_MISSIONS: Record<TestnetRole, Mission[]> = {
  vendor: [
    {
      id: "v1_create_offering",
      title: "Create your first offering",
      description:
        "List a sample product or service in your catalog — buyers will use this to fund escrow against you.",
      cta: "Open the offering builder",
      href: "/vendor/offerings/new",
    },
    {
      id: "v2_receive_order",
      title: "Receive a demo order",
      description:
        "Your demo buyer bot will place an order against your offering within ~30 seconds. Review the request and accept it.",
      cta: "Watch the order inbox",
      href: "/vendor/orders",
    },
    {
      id: "v3_complete_milestone",
      title: "Mark a milestone complete",
      description:
        "Upload a deliverable or mark fulfillment done — this is what triggers buyer review on mainnet too.",
      cta: "Open active orders",
      href: "/vendor/orders",
    },
    {
      id: "v4_request_payout",
      title: "Request your first payout",
      description:
        "Once released from escrow, request a settlement to your saved payout wallet to see the full money cycle.",
      cta: "Open the payout wizard",
      href: "/vendor/payouts",
    },
  ],
  buyer: [
    {
      id: "b1_browse_widget",
      title: "Browse a vendor widget",
      description:
        "Open the demo vendor's checkout widget — this is exactly what your real counterparties will embed.",
      cta: "Open the demo widget",
      href: "/buyer/discover",
    },
    {
      id: "b2_fund_escrow",
      title: "Fund an escrow",
      description:
        "Use testnet mock-USDC to fund the escrow. You'll see the 0.5% upfront fee and the on-chain confirmation.",
      cta: "Go to checkout",
      href: "/buyer/cart",
    },
    {
      id: "b3_approve_release",
      title: "Approve release",
      description:
        "When the vendor bot marks the milestone done, approve the release. Funds settle to vendor minus the 1% service fee.",
      cta: "Open active escrows",
      href: "/buyer/dashboard",
    },
    {
      id: "b4_open_dispute",
      title: "Open & resolve a dispute",
      description:
        "Practice opening a dispute on the in-dispute sample transaction so you know the process before it matters.",
      cta: "Open the disputes panel",
      href: "/buyer/disputes",
    },
  ],
  lender: [
    {
      id: "l1_review_application",
      title: "Review a financing application",
      description:
        "Open the demo application and inspect the vendor's risk profile, requested amount, and FlashVet AI forensics.",
      cta: "Open application queue",
      href: "/lender/applications",
    },
    {
      id: "l2_issue_certificate",
      title: "Issue a certificate",
      description:
        "Generate a 90-day lender certificate — this is what real vendors present at checkout to unlock financing.",
      cta: "Open the certificate issuer",
      href: "/lender/certificates",
    },
    {
      id: "l3_track_repayment",
      title: "Track a repayment",
      description:
        "Follow the demo borrower's repayment confirmation through to settlement.",
      cta: "Open repayments",
      href: "/lender/repayments",
    },
    {
      id: "l4_auto_release_demo",
      title: "Watch auto-release fire (compressed clock)",
      description:
        "On testnet, the 14-day tiebreaker fires in ~14 minutes. Observe it on the in-flight sample escrow.",
      cta: "Open portfolio",
      href: "/lender/portfolio",
    },
  ],
};

export function missionsFor(role: TestnetRole): Mission[] {
  return TESTNET_MISSIONS[role] ?? [];
}

export function nextIncompleteMission(
  role: TestnetRole,
  completed: Record<string, string>
): Mission | null {
  return missionsFor(role).find((m) => completed[m.id] !== "done") ?? null;
}

export function progressPercent(
  role: TestnetRole,
  completed: Record<string, string>
): number {
  const ms = missionsFor(role);
  if (ms.length === 0) return 100;
  const done = ms.filter((m) => completed[m.id] === "done").length;
  return Math.round((done / ms.length) * 100);
}
