/**
 * TrustLock Unique Identifier (TL-ID) Registry
 * 
 * Format: TL-{ROLE}-{PAGE}-{TYPE}-{NAME}
 * 
 * ROLE: V (Vendor), B (Buyer), S (Shared), A (Admin)
 * PAGE: OVW (Overview), TXN (Transactions), DOC (Documents), ORD (Orders),
 *       SET (Settings), DSP (Disputes), ANL (Analytics), TMS (Teams),
 *       AST (Assistant), HLP (Help), KYC (KYC), ONB (Onboarding),
 *       PYO (Payout), PAY (OS Pay), BIL (Bill Pay), CHK (Checkout),
 *       SIT (Sites), LNK (Standalone Links), PRC (Pricing), WFL (Workflow),
 *       PLB (Playbook), RPT (Reports), CMP (Compliance), AUD (Audit)
 * TYPE: BTN (Button), TAB (Tab), DRP (Dropdown/Select), UPL (Upload),
 *       LNK (Link), FRM (Form), INP (Input), TBL (Table Row), 
 *       BDG (Badge), CRD (Card), TGL (Toggle/Switch), CHK (Checkbox),
 *       MDL (Modal/Dialog), SRC (Search), FLT (Filter), ACT (Action),
 *       STS (Status), NAV (Navigation), MNU (Menu), IND (Indicator)
 * NAME: descriptive short name (e.g., SHIP, TRACK, CONFIRM, UPLOAD_DOC)
 */

export interface TLIdEntry {
  id: string;
  label: string;
  description: string;
  page: string;
  role: "vendor" | "buyer" | "shared" | "admin";
  type: string;
  component?: string;
}

// Master registry — maps TL-ID codes to their descriptions
export const TL_ID_REGISTRY: Record<string, TLIdEntry> = {
  // ============ VENDOR OVERVIEW ============
  "TL-V-OVW-CRD-WELCOME": { id: "TL-V-OVW-CRD-WELCOME", label: "Welcome Card", description: "Vendor welcome banner with plan info and quick stats", page: "Vendor Overview", role: "vendor", type: "card" },
  "TL-V-OVW-CRD-STATS-ESCROW": { id: "TL-V-OVW-CRD-STATS-ESCROW", label: "Escrow Balance Stat", description: "Card showing total funds currently locked in escrow", page: "Vendor Overview", role: "vendor", type: "card" },
  "TL-V-OVW-CRD-STATS-ORDERS": { id: "TL-V-OVW-CRD-STATS-ORDERS", label: "Active Orders Stat", description: "Card showing count of active orders", page: "Vendor Overview", role: "vendor", type: "card" },
  "TL-V-OVW-CRD-STATS-RELEASED": { id: "TL-V-OVW-CRD-STATS-RELEASED", label: "Released Funds Stat", description: "Card showing total released funds", page: "Vendor Overview", role: "vendor", type: "card" },
  "TL-V-OVW-CRD-STATS-DISPUTES": { id: "TL-V-OVW-CRD-STATS-DISPUTES", label: "Disputes Stat", description: "Card showing open dispute count", page: "Vendor Overview", role: "vendor", type: "card" },
  "TL-V-OVW-BTN-VIEW-ALL-TX": { id: "TL-V-OVW-BTN-VIEW-ALL-TX", label: "View All Transactions", description: "Button navigating to full transaction list", page: "Vendor Overview", role: "vendor", type: "button" },
  "TL-V-OVW-CRD-WORKLOG": { id: "TL-V-OVW-CRD-WORKLOG", label: "Work Log Card", description: "Pending contract actions requiring vendor response", page: "Vendor Overview", role: "vendor", type: "card" },
  "TL-V-OVW-BTN-ACCEPT-CONTRACT": { id: "TL-V-OVW-BTN-ACCEPT-CONTRACT", label: "Accept Contract", description: "Button to accept a pending pre-order contract", page: "Vendor Overview", role: "vendor", type: "button" },
  "TL-V-OVW-BTN-REJECT-CONTRACT": { id: "TL-V-OVW-BTN-REJECT-CONTRACT", label: "Reject Contract", description: "Button to reject a pending pre-order contract", page: "Vendor Overview", role: "vendor", type: "button" },
  "TL-V-OVW-CRD-ONBOARDING": { id: "TL-V-OVW-CRD-ONBOARDING", label: "Onboarding Checklist", description: "Task card showing remaining setup steps", page: "Vendor Overview", role: "vendor", type: "card" },

  // ============ VENDOR TRANSACTIONS ============
  "TL-V-TXN-SRC-SEARCH": { id: "TL-V-TXN-SRC-SEARCH", label: "Transaction Search", description: "Search bar to filter transactions by TX ID, buyer name, or item", page: "Vendor Transactions", role: "vendor", type: "search" },
  "TL-V-TXN-FLT-STATUS": { id: "TL-V-TXN-FLT-STATUS", label: "Status Filter", description: "Dropdown to filter transactions by status (locked, shipped, released, disputed)", page: "Vendor Transactions", role: "vendor", type: "filter" },
  "TL-V-TXN-FLT-INDUSTRY": { id: "TL-V-TXN-FLT-INDUSTRY", label: "Industry Filter", description: "Dropdown to filter transactions by industry type", page: "Vendor Transactions", role: "vendor", type: "filter" },
  "TL-V-TXN-BTN-SHIP": { id: "TL-V-TXN-BTN-SHIP", label: "Mark Shipped", description: "Button to mark an order as shipped", page: "Vendor Transactions", role: "vendor", type: "button" },
  "TL-V-TXN-BTN-TRACK": { id: "TL-V-TXN-BTN-TRACK", label: "Add Tracking", description: "Button to add tracking information to a shipped order", page: "Vendor Transactions", role: "vendor", type: "button" },
  "TL-V-TXN-BTN-DOCS": { id: "TL-V-TXN-BTN-DOCS", label: "View Documents", description: "Button to expand/collapse transaction documents section", page: "Vendor Transactions", role: "vendor", type: "button" },
  "TL-V-TXN-BTN-EXPAND": { id: "TL-V-TXN-BTN-EXPAND", label: "Expand Order", description: "Button to expand order detail panel", page: "Vendor Transactions", role: "vendor", type: "button" },
  "TL-V-TXN-CHK-SELECT": { id: "TL-V-TXN-CHK-SELECT", label: "Select Order", description: "Checkbox to select an order for bulk actions", page: "Vendor Transactions", role: "vendor", type: "checkbox" },
  "TL-V-TXN-BTN-BULK-REJECT": { id: "TL-V-TXN-BTN-BULK-REJECT", label: "Bulk Reject", description: "Button to reject multiple selected orders at once", page: "Vendor Transactions", role: "vendor", type: "button" },
  "TL-V-TXN-BTN-EXPORT": { id: "TL-V-TXN-BTN-EXPORT", label: "Export Transactions", description: "Button to download transaction data as CSV/PDF", page: "Vendor Transactions", role: "vendor", type: "button" },
  "TL-V-TXN-CRD-MILESTONE": { id: "TL-V-TXN-CRD-MILESTONE", label: "Milestone Panel", description: "Milestone work order panel within expanded transaction view", page: "Vendor Transactions", role: "vendor", type: "card" },
  "TL-V-TXN-BTN-MILESTONE-FULFILL": { id: "TL-V-TXN-BTN-MILESTONE-FULFILL", label: "Mark Milestone Fulfilled", description: "Button to mark a specific milestone as fulfilled", page: "Vendor Transactions", role: "vendor", type: "button" },
  "TL-V-TXN-UPL-EVIDENCE": { id: "TL-V-TXN-UPL-EVIDENCE", label: "Upload Evidence", description: "Upload zone for milestone evidence documents", page: "Vendor Transactions", role: "vendor", type: "upload" },
  "TL-V-TXN-BTN-INVITE-OBSERVER": { id: "TL-V-TXN-BTN-INVITE-OBSERVER", label: "Invite Observer", description: "Button to invite third-party observer to a milestone", page: "Vendor Transactions", role: "vendor", type: "button" },

  // ============ VENDOR DOCUMENTS ============
  "TL-V-DOC-UPL-MAIN": { id: "TL-V-DOC-UPL-MAIN", label: "Document Upload", description: "Main document upload zone for receipts, shipping proof, etc.", page: "Vendor Documents", role: "vendor", type: "upload" },
  "TL-V-DOC-BTN-ACK-PREVIEW": { id: "TL-V-DOC-BTN-ACK-PREVIEW", label: "Acknowledgement Preview", description: "Button to toggle preview of the Escrow Acknowledgement Form", page: "Vendor Documents", role: "vendor", type: "button" },
  "TL-V-DOC-BTN-ACK-PDF": { id: "TL-V-DOC-BTN-ACK-PDF", label: "Download Ack PDF", description: "Button to purchase/download Acknowledgement Form as PDF ($0.50)", page: "Vendor Documents", role: "vendor", type: "button" },
  "TL-V-DOC-BTN-CONSENT-PREVIEW": { id: "TL-V-DOC-BTN-CONSENT-PREVIEW", label: "Consent Form Preview", description: "Button to toggle preview of the Vendor Consent Form", page: "Vendor Documents", role: "vendor", type: "button" },
  "TL-V-DOC-BTN-CONTRACT-PREVIEW": { id: "TL-V-DOC-BTN-CONTRACT-PREVIEW", label: "Contract Preview", description: "Button to toggle preview of the Pre-Order Signatory Contract", page: "Vendor Documents", role: "vendor", type: "button" },
  "TL-V-DOC-DRP-INDUSTRY": { id: "TL-V-DOC-DRP-INDUSTRY", label: "Industry Selector", description: "Dropdown to select industry for document preview", page: "Vendor Documents", role: "vendor", type: "dropdown" },
  "TL-V-DOC-CRD-POLICY": { id: "TL-V-DOC-CRD-POLICY", label: "Policy Document", description: "Card displaying a vendor policy document (TOS, Fee Schedule, etc.)", page: "Vendor Documents", role: "vendor", type: "card" },
  "TL-V-DOC-BTN-ARCHIVE": { id: "TL-V-DOC-BTN-ARCHIVE", label: "View Archives", description: "Button to view archived protection documents", page: "Vendor Documents", role: "vendor", type: "button" },

  // ============ VENDOR ONBOARDING ============
  "TL-V-ONB-DRP-INDUSTRY": { id: "TL-V-ONB-DRP-INDUSTRY", label: "Industry Select", description: "Dropdown to select primary industry during vendor onboarding", page: "Vendor Onboarding", role: "vendor", type: "dropdown" },
  "TL-V-ONB-BTN-NEXT": { id: "TL-V-ONB-BTN-NEXT", label: "Next Step", description: "Button to proceed to next onboarding step", page: "Vendor Onboarding", role: "vendor", type: "button" },
  "TL-V-ONB-BTN-PREV": { id: "TL-V-ONB-BTN-PREV", label: "Previous Step", description: "Button to go back to previous onboarding step", page: "Vendor Onboarding", role: "vendor", type: "button" },
  "TL-V-ONB-INP-SITE-NAME": { id: "TL-V-ONB-INP-SITE-NAME", label: "Site Name Input", description: "Input field for vendor's business/site name", page: "Vendor Onboarding", role: "vendor", type: "input" },
  "TL-V-ONB-INP-SITE-URL": { id: "TL-V-ONB-INP-SITE-URL", label: "Site URL Input", description: "Input field for vendor's website URL", page: "Vendor Onboarding", role: "vendor", type: "input" },
  "TL-V-ONB-CRD-ORDER-TYPE": { id: "TL-V-ONB-CRD-ORDER-TYPE", label: "Order Type Card", description: "Card for selecting order type (Simple, Milestone, Hybrid)", page: "Vendor Onboarding", role: "vendor", type: "card" },

  // ============ VENDOR SETTINGS ============
  "TL-V-SET-BTN-SAVE": { id: "TL-V-SET-BTN-SAVE", label: "Save Settings", description: "Button to save vendor profile settings", page: "Vendor Settings", role: "vendor", type: "button" },
  "TL-V-SET-TGL-NOTIFICATIONS": { id: "TL-V-SET-TGL-NOTIFICATIONS", label: "Notification Toggle", description: "Toggle switch for enabling/disabling notifications", page: "Vendor Settings", role: "vendor", type: "toggle" },
  "TL-V-SET-TGL-AUTO-DELIVERY": { id: "TL-V-SET-TGL-AUTO-DELIVERY", label: "Auto-Delivery Toggle", description: "Toggle switch for auto-delivery confirmation", page: "Vendor Settings", role: "vendor", type: "toggle" },

  // ============ VENDOR SITES ============
  "TL-V-SIT-BTN-ADD-SITE": { id: "TL-V-SIT-BTN-ADD-SITE", label: "Add Site", description: "Button to add a new vendor site/store", page: "Vendor Sites", role: "vendor", type: "button" },
  "TL-V-SIT-BTN-INSTALL-WIDGET": { id: "TL-V-SIT-BTN-INSTALL-WIDGET", label: "Install Widget", description: "Button to install TrustLock checkout widget on a site", page: "Vendor Sites", role: "vendor", type: "button" },

  // ============ VENDOR KYC ============
  "TL-V-KYC-UPL-DOC": { id: "TL-V-KYC-UPL-DOC", label: "KYC Upload", description: "Upload zone for KYC verification documents", page: "Vendor KYC", role: "vendor", type: "upload" },
  "TL-V-KYC-BTN-SUBMIT": { id: "TL-V-KYC-BTN-SUBMIT", label: "Submit KYC", description: "Button to submit KYC documents for review", page: "Vendor KYC", role: "vendor", type: "button" },

  // ============ VENDOR PAYOUT ============
  "TL-V-PYO-BTN-REQUEST": { id: "TL-V-PYO-BTN-REQUEST", label: "Request Payout", description: "Button to initiate a payout request", page: "Vendor Payout", role: "vendor", type: "button" },
  "TL-V-PYO-DRP-METHOD": { id: "TL-V-PYO-DRP-METHOD", label: "Payout Method", description: "Dropdown to select payout method (bank, mobile money, crypto)", page: "Vendor Payout", role: "vendor", type: "dropdown" },
  "TL-V-PYO-DRP-COUNTRY": { id: "TL-V-PYO-DRP-COUNTRY", label: "Payout Country", description: "Dropdown to select destination country for payout", page: "Vendor Payout", role: "vendor", type: "dropdown" },

  // ============ VENDOR OS PAY ============
  "TL-V-PAY-BTN-PAY": { id: "TL-V-PAY-BTN-PAY", label: "Pay Button", description: "Button to submit OS Pay payment", page: "Vendor OS Pay", role: "vendor", type: "button" },
  "TL-V-PAY-DRP-SERVICE": { id: "TL-V-PAY-DRP-SERVICE", label: "Service Select", description: "Dropdown to select service for OS Pay payment", page: "Vendor OS Pay", role: "vendor", type: "dropdown" },

  // ============ VENDOR TEAMS ============
  "TL-V-TMS-BTN-CREATE-WORKSPACE": { id: "TL-V-TMS-BTN-CREATE-WORKSPACE", label: "Create Workspace", description: "Button to create a new team workspace", page: "Vendor Teams", role: "vendor", type: "button" },
  "TL-V-TMS-DRP-INDUSTRY": { id: "TL-V-TMS-DRP-INDUSTRY", label: "Workspace Industry", description: "Dropdown to select industry for team workspace", page: "Vendor Teams", role: "vendor", type: "dropdown" },
  "TL-V-TMS-BTN-ADD-MEMBER": { id: "TL-V-TMS-BTN-ADD-MEMBER", label: "Add Member", description: "Button to add a team member to workspace", page: "Vendor Teams", role: "vendor", type: "button" },
  "TL-V-TMS-BTN-ASSIGN-TASK": { id: "TL-V-TMS-BTN-ASSIGN-TASK", label: "Assign Task", description: "Button to assign a task to team member", page: "Vendor Teams", role: "vendor", type: "button" },
  "TL-V-TMS-UPL-BULK-IMPORT": { id: "TL-V-TMS-UPL-BULK-IMPORT", label: "Bulk Import", description: "Upload zone for CSV bulk import of team members", page: "Vendor Teams", role: "vendor", type: "upload" },

  // ============ VENDOR CHECKOUT ============
  "TL-V-CHK-BTN-GENERATE-LINK": { id: "TL-V-CHK-BTN-GENERATE-LINK", label: "Generate Link", description: "Button to generate a standalone checkout link", page: "Vendor Checkout", role: "vendor", type: "button" },
  "TL-V-CHK-INP-AMOUNT": { id: "TL-V-CHK-INP-AMOUNT", label: "Amount Input", description: "Input field for checkout amount", page: "Vendor Checkout", role: "vendor", type: "input" },

  // ============ VENDOR STANDALONE LINKS ============
  "TL-V-LNK-BTN-CREATE": { id: "TL-V-LNK-BTN-CREATE", label: "Create Link", description: "Button to create a new standalone invoice link", page: "Vendor Links", role: "vendor", type: "button" },
  "TL-V-LNK-BTN-COPY": { id: "TL-V-LNK-BTN-COPY", label: "Copy Link", description: "Button to copy standalone link URL to clipboard", page: "Vendor Links", role: "vendor", type: "button" },

  // ============ VENDOR ANALYTICS ============
  "TL-V-ANL-DRP-RANGE": { id: "TL-V-ANL-DRP-RANGE", label: "Date Range", description: "Dropdown to select analytics date range", page: "Vendor Analytics", role: "vendor", type: "dropdown" },
  "TL-V-ANL-BTN-EXPORT": { id: "TL-V-ANL-BTN-EXPORT", label: "Export Report", description: "Button to export analytics data", page: "Vendor Analytics", role: "vendor", type: "button" },

  // ============ VENDOR DISPUTES ============
  "TL-V-DSP-BTN-RESPOND": { id: "TL-V-DSP-BTN-RESPOND", label: "Respond to Dispute", description: "Button to submit dispute response", page: "Vendor Disputes", role: "vendor", type: "button" },
  "TL-V-DSP-UPL-EVIDENCE": { id: "TL-V-DSP-UPL-EVIDENCE", label: "Upload Evidence", description: "Upload zone for dispute evidence files", page: "Vendor Disputes", role: "vendor", type: "upload" },

  // ============ VENDOR ASSISTANT ============
  "TL-V-AST-INP-CHAT": { id: "TL-V-AST-INP-CHAT", label: "Chat Input", description: "Text input for messaging Amani AI assistant", page: "Vendor Assistant", role: "vendor", type: "input" },
  "TL-V-AST-BTN-SEND": { id: "TL-V-AST-BTN-SEND", label: "Send Message", description: "Button to send message to AI assistant", page: "Vendor Assistant", role: "vendor", type: "button" },

  // ============ VENDOR PRICING ============
  "TL-V-PRC-BTN-UPGRADE": { id: "TL-V-PRC-BTN-UPGRADE", label: "Upgrade Plan", description: "Button to upgrade vendor subscription plan", page: "Vendor Pricing", role: "vendor", type: "button" },

  // ============ VENDOR BILL PAYMENTS ============
  "TL-V-BIL-BTN-PAY": { id: "TL-V-BIL-BTN-PAY", label: "Pay Bill", description: "Button to submit bill payment", page: "Vendor Bill Pay", role: "vendor", type: "button" },
  "TL-V-BIL-INP-AMOUNT": { id: "TL-V-BIL-INP-AMOUNT", label: "Bill Amount", description: "Input field for bill payment amount", page: "Vendor Bill Pay", role: "vendor", type: "input" },

  // ============ VENDOR HELP CENTER ============
  "TL-V-HLP-SRC-SEARCH": { id: "TL-V-HLP-SRC-SEARCH", label: "Help Search", description: "Search bar for help articles and guides", page: "Vendor Help", role: "vendor", type: "search" },

  // ============ VENDOR PLAYBOOK ============
  "TL-V-PLB-SRC-SEARCH": { id: "TL-V-PLB-SRC-SEARCH", label: "Playbook Search", description: "Search bar for filtering industry playbooks", page: "Vendor Playbook", role: "vendor", type: "search" },

  // ======================================================================
  // BUYER DASHBOARD
  // ======================================================================

  // ============ BUYER OVERVIEW ============
  "TL-B-OVW-CRD-WELCOME": { id: "TL-B-OVW-CRD-WELCOME", label: "Welcome Card", description: "Buyer welcome banner with escrow protection status", page: "Buyer Overview", role: "buyer", type: "card" },
  "TL-B-OVW-CRD-STATS-ACTIVE": { id: "TL-B-OVW-CRD-STATS-ACTIVE", label: "Active Orders Stat", description: "Card showing count of active orders", page: "Buyer Overview", role: "buyer", type: "card" },
  "TL-B-OVW-CRD-STATS-ESCROW": { id: "TL-B-OVW-CRD-STATS-ESCROW", label: "Funds in Escrow", description: "Card showing total funds locked in escrow", page: "Buyer Overview", role: "buyer", type: "card" },
  "TL-B-OVW-CRD-STATS-COMPLETED": { id: "TL-B-OVW-CRD-STATS-COMPLETED", label: "Completed Orders", description: "Card showing count of completed orders", page: "Buyer Overview", role: "buyer", type: "card" },
  "TL-B-OVW-CRD-STATS-DISPUTES": { id: "TL-B-OVW-CRD-STATS-DISPUTES", label: "Open Disputes", description: "Card showing count of open disputes", page: "Buyer Overview", role: "buyer", type: "card" },
  "TL-B-OVW-BTN-CONFIRM-DELIVERY": { id: "TL-B-OVW-BTN-CONFIRM-DELIVERY", label: "Confirm Delivery", description: "Button to confirm delivery and release escrow funds", page: "Buyer Overview", role: "buyer", type: "button" },
  "TL-B-OVW-BTN-VIEW-ALL": { id: "TL-B-OVW-BTN-VIEW-ALL", label: "View All Orders", description: "Button navigating to full order list", page: "Buyer Overview", role: "buyer", type: "button" },
  "TL-B-OVW-CRD-ONBOARDING": { id: "TL-B-OVW-CRD-ONBOARDING", label: "Onboarding Checklist", description: "Task card showing remaining setup steps", page: "Buyer Overview", role: "buyer", type: "card" },

  // ============ BUYER ORDERS ============
  "TL-B-ORD-SRC-SEARCH": { id: "TL-B-ORD-SRC-SEARCH", label: "Order Search", description: "Search bar to filter orders by TX ID, vendor name", page: "Buyer Orders", role: "buyer", type: "search" },
  "TL-B-ORD-FLT-STATUS": { id: "TL-B-ORD-FLT-STATUS", label: "Status Filter", description: "Filter buttons for order status (all, locked, shipped, delivered, released, disputed)", page: "Buyer Orders", role: "buyer", type: "filter" },
  "TL-B-ORD-BTN-CONFIRM": { id: "TL-B-ORD-BTN-CONFIRM", label: "Confirm Receipt", description: "Button to confirm delivery of an order", page: "Buyer Orders", role: "buyer", type: "button" },
  "TL-B-ORD-BTN-DISPUTE": { id: "TL-B-ORD-BTN-DISPUTE", label: "Open Dispute", description: "Button to open a dispute on an order", page: "Buyer Orders", role: "buyer", type: "button" },
  "TL-B-ORD-BTN-EXPAND": { id: "TL-B-ORD-BTN-EXPAND", label: "Expand Order", description: "Button to expand order detail panel", page: "Buyer Orders", role: "buyer", type: "button" },
  "TL-B-ORD-INP-CLAIM": { id: "TL-B-ORD-INP-CLAIM", label: "Claim Code Input", description: "Input field for claiming an order with order number or confirmation code", page: "Buyer Orders", role: "buyer", type: "input" },
  "TL-B-ORD-BTN-CLAIM": { id: "TL-B-ORD-BTN-CLAIM", label: "Claim Order", description: "Button to claim an order using a code", page: "Buyer Orders", role: "buyer", type: "button" },
  "TL-B-ORD-CRD-MILESTONE": { id: "TL-B-ORD-CRD-MILESTONE", label: "Milestone Panel", description: "Milestone work order panel within expanded order view", page: "Buyer Orders", role: "buyer", type: "card" },
  "TL-B-ORD-BTN-RELEASE-MILESTONE": { id: "TL-B-ORD-BTN-RELEASE-MILESTONE", label: "Release Milestone", description: "Button to release payment for a completed milestone", page: "Buyer Orders", role: "buyer", type: "button" },

  // ============ BUYER DOCUMENTS ============
  "TL-B-DOC-UPL-MAIN": { id: "TL-B-DOC-UPL-MAIN", label: "Document Upload", description: "Main document upload zone for receipts, photos, evidence", page: "Buyer Documents", role: "buyer", type: "upload" },
  "TL-B-DOC-BTN-ACK-PREVIEW": { id: "TL-B-DOC-BTN-ACK-PREVIEW", label: "Acknowledgement Preview", description: "Button to toggle preview of the Escrow Acknowledgement Form", page: "Buyer Documents", role: "buyer", type: "button" },
  "TL-B-DOC-BTN-ACK-PDF": { id: "TL-B-DOC-BTN-ACK-PDF", label: "Download Ack PDF", description: "Button to purchase/download Acknowledgement Form as PDF ($0.50)", page: "Buyer Documents", role: "buyer", type: "button" },
  "TL-B-DOC-BTN-CONTRACT-PREVIEW": { id: "TL-B-DOC-BTN-CONTRACT-PREVIEW", label: "Contract Preview", description: "Button to toggle preview of the Pre-Order Signatory Contract", page: "Buyer Documents", role: "buyer", type: "button" },
  "TL-B-DOC-DRP-INDUSTRY": { id: "TL-B-DOC-DRP-INDUSTRY", label: "Industry Selector", description: "Dropdown to select industry for document preview", page: "Buyer Documents", role: "buyer", type: "dropdown" },
  "TL-B-DOC-CRD-POLICY": { id: "TL-B-DOC-CRD-POLICY", label: "Policy Document", description: "Card displaying a buyer policy document", page: "Buyer Documents", role: "buyer", type: "card" },
  "TL-B-DOC-BTN-ARCHIVE": { id: "TL-B-DOC-BTN-ARCHIVE", label: "View Archives", description: "Button to view archived protection documents", page: "Buyer Documents", role: "buyer", type: "button" },

  // ============ BUYER DISPUTES ============
  "TL-B-DSP-BTN-FILE": { id: "TL-B-DSP-BTN-FILE", label: "File Dispute", description: "Button to file a new dispute", page: "Buyer Disputes", role: "buyer", type: "button" },
  "TL-B-DSP-UPL-EVIDENCE": { id: "TL-B-DSP-UPL-EVIDENCE", label: "Upload Evidence", description: "Upload zone for dispute evidence files", page: "Buyer Disputes", role: "buyer", type: "upload" },
  "TL-B-DSP-DRP-REASON": { id: "TL-B-DSP-DRP-REASON", label: "Dispute Reason", description: "Dropdown to select reason for dispute", page: "Buyer Disputes", role: "buyer", type: "dropdown" },

  // ============ BUYER SETTINGS ============
  "TL-B-SET-BTN-SAVE": { id: "TL-B-SET-BTN-SAVE", label: "Save Settings", description: "Button to save buyer profile settings", page: "Buyer Settings", role: "buyer", type: "button" },
  "TL-B-SET-TGL-NOTIFICATIONS": { id: "TL-B-SET-TGL-NOTIFICATIONS", label: "Notification Toggle", description: "Toggle for enabling/disabling notifications", page: "Buyer Settings", role: "buyer", type: "toggle" },

  // ============ BUYER PAYOUT ============
  "TL-B-PYO-BTN-REQUEST": { id: "TL-B-PYO-BTN-REQUEST", label: "Request Payout", description: "Button to initiate a buyer payout/refund request", page: "Buyer Payout", role: "buyer", type: "button" },

  // ============ BUYER OS PAY ============
  "TL-B-PAY-BTN-PAY": { id: "TL-B-PAY-BTN-PAY", label: "Pay Button", description: "Button to submit OS Pay payment", page: "Buyer OS Pay", role: "buyer", type: "button" },

  // ============ BUYER TEAMS ============
  "TL-B-TMS-BTN-CREATE-WORKSPACE": { id: "TL-B-TMS-BTN-CREATE-WORKSPACE", label: "Create Workspace", description: "Button to create a new team workspace", page: "Buyer Teams", role: "buyer", type: "button" },
  "TL-B-TMS-DRP-INDUSTRY": { id: "TL-B-TMS-DRP-INDUSTRY", label: "Workspace Industry", description: "Dropdown to select industry for team workspace", page: "Buyer Teams", role: "buyer", type: "dropdown" },
  "TL-B-TMS-BTN-ADD-MEMBER": { id: "TL-B-TMS-BTN-ADD-MEMBER", label: "Add Member", description: "Button to add a team member", page: "Buyer Teams", role: "buyer", type: "button" },

  // ============ BUYER ASSISTANT ============
  "TL-B-AST-INP-CHAT": { id: "TL-B-AST-INP-CHAT", label: "Chat Input", description: "Text input for messaging Zawadi AI assistant", page: "Buyer Assistant", role: "buyer", type: "input" },
  "TL-B-AST-BTN-SEND": { id: "TL-B-AST-BTN-SEND", label: "Send Message", description: "Button to send message to AI assistant", page: "Buyer Assistant", role: "buyer", type: "button" },

  // ============ BUYER ANALYTICS ============
  "TL-B-ANL-DRP-RANGE": { id: "TL-B-ANL-DRP-RANGE", label: "Date Range", description: "Dropdown for analytics date range selection", page: "Buyer Analytics", role: "buyer", type: "dropdown" },

  // ============ BUYER BILL PAYMENTS ============
  "TL-B-BIL-BTN-PAY": { id: "TL-B-BIL-BTN-PAY", label: "Pay Bill", description: "Button to submit bill payment", page: "Buyer Bill Pay", role: "buyer", type: "button" },

  // ============ BUYER HELP CENTER ============
  "TL-B-HLP-SRC-SEARCH": { id: "TL-B-HLP-SRC-SEARCH", label: "Help Search", description: "Search bar for help articles", page: "Buyer Help", role: "buyer", type: "search" },

  // ============ BUYER PLAYBOOK ============
  "TL-B-PLB-SRC-SEARCH": { id: "TL-B-PLB-SRC-SEARCH", label: "Playbook Search", description: "Search bar for filtering industry playbooks", page: "Buyer Playbook", role: "buyer", type: "search" },

  // ============ BUYER CONFIRMATION (PUBLIC) ============
  "TL-B-CNF-BTN-RELEASE": { id: "TL-B-CNF-BTN-RELEASE", label: "Release Funds", description: "Button to release escrow funds on public confirmation page", page: "Buyer Confirmation", role: "buyer", type: "button" },
  "TL-B-CNF-BTN-DISPUTE": { id: "TL-B-CNF-BTN-DISPUTE", label: "File Dispute", description: "Button to file a dispute on public confirmation page", page: "Buyer Confirmation", role: "buyer", type: "button" },

  // ============ SHARED COMPONENTS ============
  "TL-S-NAV-CMD-PALETTE": { id: "TL-S-NAV-CMD-PALETTE", label: "Command Palette", description: "Universal search/command palette (⌘K)", page: "Shared", role: "shared", type: "navigation" },
  "TL-S-NAV-NOTIFICATIONS": { id: "TL-S-NAV-NOTIFICATIONS", label: "Notification Bell", description: "Notification center bell icon in header", page: "Shared", role: "shared", type: "navigation" },
  "TL-S-NAV-SEARCH": { id: "TL-S-NAV-SEARCH", label: "Search Bar", description: "Global search bar in header", page: "Shared", role: "shared", type: "search" },

  // ============ MAIN NAVBAR ============
  "TL-S-NAV-LOGO": { id: "TL-S-NAV-LOGO", label: "Azix Logo", description: "Main Azix logo linking to homepage", page: "Navbar", role: "shared", type: "navigation" },
  "TL-S-NAV-HOW": { id: "TL-S-NAV-HOW", label: "How It Works Link", description: "Navbar link to How It Works section", page: "Navbar", role: "shared", type: "navigation" },
  "TL-S-NAV-INDUSTRIES": { id: "TL-S-NAV-INDUSTRIES", label: "Industries Link", description: "Navbar link to Industries section", page: "Navbar", role: "shared", type: "navigation" },
  "TL-S-NAV-PRICING": { id: "TL-S-NAV-PRICING", label: "Pricing Link", description: "Navbar link to Pricing section", page: "Navbar", role: "shared", type: "navigation" },
  "TL-S-NAV-TESTIMONIALS": { id: "TL-S-NAV-TESTIMONIALS", label: "Testimonials Link", description: "Navbar link to Testimonials section", page: "Navbar", role: "shared", type: "navigation" },
  "TL-S-NAV-TRUSTLOCK": { id: "TL-S-NAV-TRUSTLOCK", label: "TrustLock Link", description: "Navbar link to TrustLock product page", page: "Navbar", role: "shared", type: "navigation" },
  "TL-S-NAV-BTN-LOGIN": { id: "TL-S-NAV-BTN-LOGIN", label: "Log In Button", description: "Navbar button to open login portal picker", page: "Navbar", role: "shared", type: "button" },
  "TL-S-NAV-BTN-SIGNUP": { id: "TL-S-NAV-BTN-SIGNUP", label: "Get Started Button", description: "Navbar button to open signup portal picker", page: "Navbar", role: "shared", type: "button" },
  "TL-S-NAV-BTN-MENU": { id: "TL-S-NAV-BTN-MENU", label: "Mobile Menu Toggle", description: "Hamburger menu toggle for mobile navbar", page: "Navbar", role: "shared", type: "button" },

  // ============ VENDOR SIDEBAR NAVIGATION ============
  "TL-V-SB-NAV-OVERVIEW": { id: "TL-V-SB-NAV-OVERVIEW", label: "Overview Nav", description: "Sidebar link to Vendor Overview dashboard", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-BILL-PAY": { id: "TL-V-SB-NAV-BILL-PAY", label: "Bill Payments Nav", description: "Sidebar link to Vendor Bill Payments page", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-TRANSACTIONS": { id: "TL-V-SB-NAV-TRANSACTIONS", label: "Transactions Nav", description: "Sidebar link to Vendor Transactions page", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-PAYOUTS": { id: "TL-V-SB-NAV-PAYOUTS", label: "Payouts Nav", description: "Sidebar link to Vendor Payouts page", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-SITES": { id: "TL-V-SB-NAV-SITES", label: "My Sites Nav", description: "Sidebar link to Vendor Sites page", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-KYC": { id: "TL-V-SB-NAV-KYC", label: "KYC Nav", description: "Sidebar link to KYC & Verification page", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-ASSISTANT": { id: "TL-V-SB-NAV-ASSISTANT", label: "Assistant Nav", description: "Sidebar link to TrustLock Assist AI page", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-ANALYTICS": { id: "TL-V-SB-NAV-ANALYTICS", label: "Analytics Nav", description: "Sidebar link to Analytics & Reports page", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-DOCUMENTS": { id: "TL-V-SB-NAV-DOCUMENTS", label: "Documents Nav", description: "Sidebar link to Vendor Documents page", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-HELP": { id: "TL-V-SB-NAV-HELP", label: "Help Center Nav", description: "Sidebar link to Vendor Help Center", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-PRICING": { id: "TL-V-SB-NAV-PRICING", label: "Pricing Nav", description: "Sidebar link to Plans & Pricing page", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-LINKS": { id: "TL-V-SB-NAV-LINKS", label: "Standalone Links Nav", description: "Sidebar link to Standalone Links page", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-OSPAY": { id: "TL-V-SB-NAV-OSPAY", label: "OS Pay Nav", description: "Sidebar link to TrustLock OS Pay page", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-PAYOUT": { id: "TL-V-SB-NAV-PAYOUT", label: "OS Payout Nav", description: "Sidebar link to TrustLock OS Payout page", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-TEAMS": { id: "TL-V-SB-NAV-TEAMS", label: "Teams Nav", description: "Sidebar link to Vendor Teams page", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-PLAYBOOK": { id: "TL-V-SB-NAV-PLAYBOOK", label: "Playbook Nav", description: "Sidebar link to Industry Playbook page", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-NAV-SETTINGS": { id: "TL-V-SB-NAV-SETTINGS", label: "Settings Nav", description: "Sidebar link to Vendor Settings page", page: "Vendor Sidebar", role: "vendor", type: "navigation" },
  "TL-V-SB-BTN-SWITCH-BUYER": { id: "TL-V-SB-BTN-SWITCH-BUYER", label: "Switch to Buyer", description: "Button to switch role from Vendor to Buyer portal", page: "Vendor Sidebar", role: "vendor", type: "button" },
  "TL-V-SB-BTN-HOME": { id: "TL-V-SB-BTN-HOME", label: "Back to Home", description: "Button to navigate back to main homepage", page: "Vendor Sidebar", role: "vendor", type: "button" },
  "TL-V-SB-BTN-LOGOUT": { id: "TL-V-SB-BTN-LOGOUT", label: "Sign Out", description: "Button to log out of Vendor portal", page: "Vendor Sidebar", role: "vendor", type: "button" },
  "TL-V-SB-BTN-MENU": { id: "TL-V-SB-BTN-MENU", label: "Mobile Menu", description: "Mobile hamburger to open vendor sidebar", page: "Vendor Sidebar", role: "vendor", type: "button" },

  // ============ BUYER SIDEBAR NAVIGATION ============
  "TL-B-SB-NAV-OVERVIEW": { id: "TL-B-SB-NAV-OVERVIEW", label: "Overview Nav", description: "Sidebar link to Buyer Overview dashboard", page: "Buyer Sidebar", role: "buyer", type: "navigation" },
  "TL-B-SB-NAV-BILL-PAY": { id: "TL-B-SB-NAV-BILL-PAY", label: "Bill Payments Nav", description: "Sidebar link to Buyer Bill Payments page", page: "Buyer Sidebar", role: "buyer", type: "navigation" },
  "TL-B-SB-NAV-ORDERS": { id: "TL-B-SB-NAV-ORDERS", label: "Orders Nav", description: "Sidebar link to My Orders page", page: "Buyer Sidebar", role: "buyer", type: "navigation" },
  "TL-B-SB-NAV-DISPUTES": { id: "TL-B-SB-NAV-DISPUTES", label: "Disputes Nav", description: "Sidebar link to Buyer Disputes page", page: "Buyer Sidebar", role: "buyer", type: "navigation" },
  "TL-B-SB-NAV-ASSISTANT": { id: "TL-B-SB-NAV-ASSISTANT", label: "Assistant Nav", description: "Sidebar link to Support Assistant page", page: "Buyer Sidebar", role: "buyer", type: "navigation" },
  "TL-B-SB-NAV-ANALYTICS": { id: "TL-B-SB-NAV-ANALYTICS", label: "Analytics Nav", description: "Sidebar link to Analytics & Reports page", page: "Buyer Sidebar", role: "buyer", type: "navigation" },
  "TL-B-SB-NAV-DOCUMENTS": { id: "TL-B-SB-NAV-DOCUMENTS", label: "Documents Nav", description: "Sidebar link to Buyer Documents page", page: "Buyer Sidebar", role: "buyer", type: "navigation" },
  "TL-B-SB-NAV-HELP": { id: "TL-B-SB-NAV-HELP", label: "Help Center Nav", description: "Sidebar link to Buyer Help Center", page: "Buyer Sidebar", role: "buyer", type: "navigation" },
  "TL-B-SB-NAV-OSPAY": { id: "TL-B-SB-NAV-OSPAY", label: "OS Pay Nav", description: "Sidebar link to TrustLock OS Pay page", page: "Buyer Sidebar", role: "buyer", type: "navigation" },
  "TL-B-SB-NAV-PAYOUT": { id: "TL-B-SB-NAV-PAYOUT", label: "OS Payout Nav", description: "Sidebar link to TrustLock OS Payout page", page: "Buyer Sidebar", role: "buyer", type: "navigation" },
  "TL-B-SB-NAV-TEAMS": { id: "TL-B-SB-NAV-TEAMS", label: "Teams Nav", description: "Sidebar link to Buyer Teams page", page: "Buyer Sidebar", role: "buyer", type: "navigation" },
  "TL-B-SB-NAV-PLAYBOOK": { id: "TL-B-SB-NAV-PLAYBOOK", label: "Playbook Nav", description: "Sidebar link to Industry Playbook page", page: "Buyer Sidebar", role: "buyer", type: "navigation" },
  "TL-B-SB-NAV-SETTINGS": { id: "TL-B-SB-NAV-SETTINGS", label: "Settings Nav", description: "Sidebar link to Buyer Settings page", page: "Buyer Sidebar", role: "buyer", type: "navigation" },
  "TL-B-SB-BTN-SWITCH-VENDOR": { id: "TL-B-SB-BTN-SWITCH-VENDOR", label: "Switch to Vendor", description: "Button to switch role from Buyer to Vendor portal", page: "Buyer Sidebar", role: "buyer", type: "button" },
  "TL-B-SB-BTN-HOME": { id: "TL-B-SB-BTN-HOME", label: "Back to Home", description: "Button to navigate back to main homepage", page: "Buyer Sidebar", role: "buyer", type: "button" },
  "TL-B-SB-BTN-LOGOUT": { id: "TL-B-SB-BTN-LOGOUT", label: "Sign Out", description: "Button to log out of Buyer portal", page: "Buyer Sidebar", role: "buyer", type: "button" },
  "TL-B-SB-BTN-MENU": { id: "TL-B-SB-BTN-MENU", label: "Mobile Menu", description: "Mobile hamburger to open buyer sidebar", page: "Buyer Sidebar", role: "buyer", type: "button" },
};

/**
 * Lookup a TL-ID entry by its code
 */
export function lookupTLId(id: string): TLIdEntry | undefined {
  return TL_ID_REGISTRY[id];
}

/**
 * Search TL-IDs by query (searches label, description, page)
 */
export function searchTLIds(query: string): TLIdEntry[] {
  const q = query.toLowerCase();
  return Object.values(TL_ID_REGISTRY).filter(
    (entry) =>
      entry.id.toLowerCase().includes(q) ||
      entry.label.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q) ||
      entry.page.toLowerCase().includes(q)
  );
}

/**
 * Get all TL-IDs for a specific role
 */
export function getTLIdsByRole(role: TLIdEntry["role"]): TLIdEntry[] {
  return Object.values(TL_ID_REGISTRY).filter((e) => e.role === role);
}

/**
 * Get all TL-IDs for a specific page
 */
export function getTLIdsByPage(page: string): TLIdEntry[] {
  return Object.values(TL_ID_REGISTRY).filter((e) => e.page === page);
}
