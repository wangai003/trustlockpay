// Department definitions — mirrors the admin_departments table
export interface Department {
  slug: string;
  name: string;
  description: string;
  canMessageClients: boolean;
}

export const DEPARTMENTS: Department[] = [
  { slug: "executive", name: "Executive Office", description: "Full platform access — Chief Admin oversight", canMessageClients: true },
  { slug: "technical", name: "Technical & Engineering", description: "System health, bug triage, infrastructure & blockchain anchoring", canMessageClients: false },
  { slug: "correspondence", name: "Correspondence & Client Relations", description: "Client messaging, onboarding support", canMessageClients: true },
  { slug: "disputes", name: "Disputes & Arbitration", description: "Case management, arbitrator portal, rulings", canMessageClients: false },
  { slug: "finance", name: "Finance & Payouts", description: "OS Pay, payouts, tax remittance, gas treasury", canMessageClients: false },
  { slug: "compliance", name: "Compliance & Risk", description: "KYC/KYB, sanctions, document scanning", canMessageClients: false },
  { slug: "operations", name: "Operations & Workflow", description: "Transactions, milestones, vendor/buyer accounts", canMessageClients: false },
];

// Module slug → sidebar route mapping for access control
export const MODULE_ROUTE_MAP: Record<string, string> = {
  overview: "/trustlock/admin",
  transactions: "/trustlock/admin/transactions",
  disputes: "/trustlock/admin/disputes",
  workflow: "/trustlock/admin/workflow",
  emmanuel: "/trustlock/admin/emmanuel",
  vendors: "/trustlock/admin/vendors",
  buyers: "/trustlock/admin/buyers",
  compliance: "/trustlock/admin/compliance",
  analytics: "/trustlock/admin/analytics",
  reports: "/trustlock/admin/reports",
  "platform-analytics": "/trustlock/admin/platform-analytics",
  documents: "/trustlock/admin/documents",
  finance: "/trustlock/admin/os-pay",
  payout: "/trustlock/admin/os-pay",
  audit: "/trustlock/admin/audit",
  "industry-playbook": "/trustlock/admin/industry-playbook",
  "tl-id": "/trustlock/admin/tl-id",
  tax: "/trustlock/admin/tax-remittance",
  blockchain: "/trustlock/admin/blockchain-proofs",
  gas: "/trustlock/admin/gas-treasury",
  messages: "/trustlock/admin/messages",
  accountability: "/trustlock/admin/accountability",
  training: "/trustlock/admin/training-manual",
  sandbox: "/trustlock/admin/sandbox-leads",
  platforms: "/trustlock/admin/platforms",
  "system-health": "/trustlock/admin/system-health",
  "autonomous-fixer": "/trustlock/admin/autonomous-fixer",
  settings: "/trustlock/admin/settings",
  staff: "/trustlock/admin/settings",
};

// Reverse lookup: given a route, which module slug does it map to?
export function getModuleForRoute(route: string): string | null {
  for (const [mod, path] of Object.entries(MODULE_ROUTE_MAP)) {
    if (route === path) return mod;
  }
  return null;
}

export function getDepartmentBySlug(slug: string): Department | undefined {
  return DEPARTMENTS.find(d => d.slug === slug);
}
