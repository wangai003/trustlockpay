import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Shield, FileSearch, Eye, Lock, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import AuditManager from "@/components/admin/AuditManager";

const steps = [
  {
    icon: Shield,
    title: "1. Create an Audit Session",
    description: 'Click "New Session" below to set up a time-limited, read-only access portal for an external auditor or regulator.',
    details: [
      "Enter the auditor's name and organization",
      "Optionally add their email for record-keeping",
      "Set an access password for an extra security layer (recommended)",
    ],
  },
  {
    icon: FileSearch,
    title: "2. Choose Data Categories",
    description: "Select which database tables the auditor is allowed to view. Only checked categories will be visible in their portal.",
    details: [
      "Transactions — all escrow payment records",
      "Disputes — filed disputes and resolutions",
      "Compliance Flags — KYC/AML flags and severity",
      "KYC Queue — vendor verification submissions",
      "Payouts & Payout Requests — fund movements",
      "Order Carbon Copies — order receipt records",
    ],
  },
  {
    icon: Eye,
    title: "3. Configure Export Permissions",
    description: "Toggle whether the auditor can download CSV exports. All exports are watermarked with the auditor's name and timestamp.",
  },
  {
    icon: Clock,
    title: "4. Set Expiry Duration",
    description: "Choose how many days the session lasts (e.g. 30 days for a standard audit). The link automatically stops working after expiry.",
  },
  {
    icon: Lock,
    title: "5. Share the Link Securely",
    description: "After creation, copy the generated link and share it with the auditor via a secure channel (encrypted email, in-person, etc.).",
    details: [
      "If you set a password, share it separately from the link",
      "The link uses a unique 64-character token — not guessable",
      "The auditor does NOT need a TrustLock account to access it",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "6. Monitor & Revoke",
    description: "Track every access in real-time from this page. You can revoke any session instantly at any time.",
    details: [
      "View access count and last accessed timestamp",
      "Click the eye icon to see full IP logs and page views",
      "Click the ban icon to immediately revoke access",
    ],
  },
];

const AdminAudit = () => {
  return (
    <div>
      <AdminHeader title="Audit & Regulator Access" />
      <div className="p-6 space-y-6 max-w-5xl">
        {/* How it works guide */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileSearch className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">How Audit Access Works</CardTitle>
                <CardDescription>
                  Step-by-step guide to granting read-only access to external auditors, regulators, or authorities
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Key principles */}
            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Read-Only</p>
                  <p className="text-xs text-muted-foreground">Auditors can never modify, delete, or insert data</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Time-Limited</p>
                  <p className="text-xs text-muted-foreground">Links auto-expire after the configured duration</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <AlertTriangle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Fully Logged</p>
                  <p className="text-xs text-muted-foreground">Every page view and export is logged with IP address</p>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <step.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    {step.details && (
                      <ul className="mt-2 space-y-1">
                        {step.details.map((d, j) => (
                          <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">•</span> {d}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Security note */}
            <div className="mt-6 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Security Notes</p>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    <li>• Never share audit links over unencrypted channels</li>
                    <li>• Always set a password for high-sensitivity audits</li>
                    <li>• Revoke sessions immediately after the audit period ends</li>
                    <li>• Review access logs regularly for suspicious activity</li>
                    <li>• The portal URL updates automatically with your domain — no manual changes needed</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active session manager */}
        <AuditManager />
      </div>
    </div>
  );
};

export default AdminAudit;
