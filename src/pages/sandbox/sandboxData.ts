// Pre-loaded demo data for the sandbox environment

type MilestoneStatus = "completed" | "in_progress" | "pending";
type OrderStatus = "escrow_locked" | "completed" | "pending_payment" | "disputed" | "released";

interface SandboxMilestone {
  id: string;
  title: string;
  status: MilestoneStatus;
  percentage: number;
}

export interface SandboxOrder {
  id: string;
  item: string;
  buyer: string;
  buyerEmail: string;
  amount: number;
  currency: string;
  fee: number;
  status: OrderStatus;
  paymentMethod: string;
  createdAt: string;
  milestones: SandboxMilestone[];
}

export const SANDBOX_VENDOR = {
  id: "SBX-VND-001",
  name: "Kente Craft Ltd",
  email: "vendor@sandbox.trustlock.test",
  plan: "Professional",
  industry: "Textiles & Fashion",
};

export const SANDBOX_ORDERS: SandboxOrder[] = [
  {
    id: "SBX-ORD-1001",
    item: "Custom Kente Cloth — 3 Yards",
    buyer: "Michael Evans",
    buyerEmail: "michael@sandbox.test",
    amount: 450.00,
    currency: "USD",
    fee: 6.75,
    status: "escrow_locked" as const,
    paymentMethod: "Card (Visa ****4242)",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    milestones: [
      { id: "m1", title: "Order Confirmed", status: "completed" as const, percentage: 20 },
      { id: "m2", title: "Production Started", status: "in_progress" as const, percentage: 30 },
      { id: "m3", title: "Quality Check", status: "pending" as const, percentage: 20 },
      { id: "m4", title: "Shipped & Delivered", status: "pending" as const, percentage: 30 },
    ],
  },
  {
    id: "SBX-ORD-1002",
    item: "Handmade Bead Necklace Set",
    buyer: "Amara Johnson",
    buyerEmail: "amara@sandbox.test",
    amount: 120.00,
    currency: "USD",
    fee: 1.80,
    status: "completed" as const,
    paymentMethod: "USDC (Polygon)",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    milestones: [
      { id: "m1", title: "Payment Received", status: "completed" as const, percentage: 50 },
      { id: "m2", title: "Delivered", status: "completed" as const, percentage: 50 },
    ],
  },
  {
    id: "SBX-ORD-1003",
    item: "Bulk Shea Butter — 10 KG",
    buyer: "Trade Corp Inc.",
    buyerEmail: "ops@tradecorp.test",
    amount: 780.00,
    currency: "USD",
    fee: 11.70,
    status: "pending_payment" as const,
    paymentMethod: "Pending",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    milestones: [
      { id: "m1", title: "Invoice Sent", status: "in_progress" as const, percentage: 100 },
    ],
  },
];

export const SANDBOX_MESSAGES = [
  {
    id: "msg-1",
    from: "Michael Evans",
    subject: "Kente Cloth — Color Confirmation",
    preview: "Hi, I wanted to confirm the gold and black pattern for my 3-yard order...",
    orderId: "SBX-ORD-1001",
    time: "2h ago",
    unread: true,
  },
  {
    id: "msg-2",
    from: "TrustLock System",
    subject: "Escrow Locked — Order #SBX-ORD-1001",
    preview: "Funds of $450.00 have been secured in escrow. You may begin production.",
    orderId: "SBX-ORD-1001",
    time: "2d ago",
    unread: false,
  },
  {
    id: "msg-3",
    from: "Amara Johnson",
    subject: "Thank you!",
    preview: "The necklace set arrived beautifully packaged. Really appreciate the quality.",
    orderId: "SBX-ORD-1002",
    time: "5d ago",
    unread: false,
  },
];

export type SandboxOrder = typeof SANDBOX_ORDERS[number];
export type SandboxMessage = typeof SANDBOX_MESSAGES[number];

export const statusLabels: Record<string, { label: string; color: string }> = {
  escrow_locked: { label: "Escrow Locked", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  completed: { label: "Completed", color: "text-green-600 bg-green-50 border-green-200" },
  pending_payment: { label: "Awaiting Payment", color: "text-blue-600 bg-blue-50 border-blue-200" },
  disputed: { label: "Disputed", color: "text-red-600 bg-red-50 border-red-200" },
  released: { label: "Funds Released", color: "text-green-600 bg-green-50 border-green-200" },
};

export const milestoneStatusColors: Record<string, string> = {
  completed: "bg-green-500",
  in_progress: "bg-yellow-500",
  pending: "bg-muted",
};
