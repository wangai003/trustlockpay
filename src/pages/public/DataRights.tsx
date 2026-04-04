import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Trash2, FileText, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DataRights = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExportData = async () => {
    if (!user?.id) {
      toast({ title: "Please sign in", description: "You must be logged in to export your data.", variant: "destructive" });
      return;
    }

    setExporting(true);
    try {
      const [profileRes, txRes, ordersRes, disputesRes, docsRes, notifsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("transactions").select("*").or(`buyer_id.eq.${user.id},vendor_id.eq.${user.id}`).limit(500),
        supabase.from("order_carbon_copies").select("*").or(`buyer_id.eq.${user.id},vendor_id.eq.${user.id}`).limit(500),
        supabase.from("disputes").select("*").or(`buyer_id.eq.${user.id},vendor_id.eq.${user.id}`).limit(500),
        supabase.from("kyc_documents").select("id, name, status, document_category, created_at").eq("vendor_id", user.id).limit(100),
        supabase.from("notifications").select("*").eq("user_id", user.id).limit(500),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        email: user.email,
        profile: profileRes.data,
        transactions: txRes.data || [],
        orders: ordersRes.data || [],
        disputes: disputesRes.data || [],
        kyc_documents: docsRes.data || [],
        notifications: notifsRes.data || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trustlock-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Export complete", description: "Your data has been downloaded." });
    } catch {
      toast({ title: "Export failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!user?.id) return;

    setDeleting(true);
    try {
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "🗑️ Account Deletion Requested",
        message: `User ${user.email} has requested account deletion. This will be processed within 14 days per our data retention policy.`,
        type: "warning",
        is_action_required: true,
        related_entity_type: "account_deletion",
        related_entity_id: user.id,
      });

      toast({
        title: "Deletion request submitted",
        description: "Your account will be reviewed and deleted within 14 days. You'll receive a confirmation email.",
      });
      setShowDeleteConfirm(false);
    } catch {
      toast({ title: "Request failed", description: "Please try again or contact support.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-foreground">Your Data Rights</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-3xl space-y-6">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            Under applicable data protection laws (GDPR, NDPA, POPIA, and others), you have the
            right to access, export, rectify, and delete your personal data. Use the tools below
            to exercise these rights.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Download className="w-5 h-5 text-primary" />
                Export My Data
              </CardTitle>
              <CardDescription>
                Download all your personal data in JSON format including profile, transactions,
                orders, disputes, and notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleExportData}
                disabled={exporting || !user}
                className="w-full"
                variant="outline"
              >
                {exporting ? "Preparing export..." : user ? "Download My Data" : "Sign in to export"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-5 h-5 text-primary" />
                Rectify My Data
              </CardTitle>
              <CardDescription>
                Update your personal information through your dashboard settings page, or
                contact us for changes to verified KYC data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to={user ? "/trustlock/buyer/settings" : "/"}>
                  {user ? "Go to Settings" : "Sign in first"}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <Trash2 className="w-5 h-5" />
                Delete My Account
              </CardTitle>
              <CardDescription>
                Request permanent deletion of your account and all associated data. Note: legal
                and compliance records (AML certificates, signed contracts) are retained for 7 years
                per regulatory requirements even after account deletion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showDeleteConfirm ? (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="destructive"
                  className="w-full"
                  disabled={!user}
                >
                  {user ? "Request Account Deletion" : "Sign in to request deletion"}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-sm text-destructive font-medium">Are you sure?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This action cannot be undone. Your account, transactions, and personal data
                      will be permanently deleted within 14 days.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowDeleteConfirm(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDeleteRequest}
                      variant="destructive"
                      className="flex-1"
                      disabled={deleting}
                    >
                      {deleting ? "Submitting..." : "Confirm Deletion"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-primary" />
              Your Rights Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              {[
                { right: "Right to Access", desc: "View all data we hold about you" },
                { right: "Right to Rectification", desc: "Correct inaccurate personal data" },
                { right: "Right to Erasure", desc: "Request deletion of your data" },
                { right: "Right to Portability", desc: "Export your data in a standard format" },
                { right: "Right to Object", desc: "Object to processing based on legitimate interest" },
                { right: "Right to Withdraw Consent", desc: "Withdraw consent for optional processing" },
              ].map((r) => (
                <div key={r.right} className="border rounded-lg p-3">
                  <p className="font-medium text-foreground">{r.right}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          For any data rights requests, you can also email us at{" "}
          <a href="mailto:privacy@trustlockpay.com" className="text-primary hover:underline">
            privacy@trustlockpay.com
          </a>
        </p>
      </main>
    </div>
  );
};

export default DataRights;
