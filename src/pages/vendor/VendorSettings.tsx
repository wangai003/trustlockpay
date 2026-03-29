import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, CreditCard, User, Save, Truck, Shield, AlertTriangle, Pause, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";
import TLId from "@/components/shared/TLId";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";
import { getVendorPlanState, PLANS } from "@/hooks/useVendorPlan";
import { useVendorSettings, useSaveVendorSettings } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";

const notificationKeys = [
  { key: "new_escrow", label: "New escrow created" },
  { key: "buyer_confirms", label: "Buyer confirms delivery" },
  { key: "funds_released", label: "Funds released" },
  { key: "dispute_opened", label: "Dispute opened against you" },
  { key: "kyc_update", label: "KYC status update" },
  { key: "plan_expiry", label: "Plan expiry reminder" },
  { key: "order_limit", label: "Order limit warning" },
];

const VendorSettings = () => {
  const { vendor } = useVendor();
  const navigate = useNavigate();
  const planState = getVendorPlanState();
  const { data: settings } = useVendorSettings();
  const saveSettings = useSaveVendorSettings();
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});

  const [autoDelivery, setAutoDelivery] = useState(() => {
    return localStorage.getItem("tl_vendor_auto_delivery") === "true";
  });

  const [payEnabled, setPayEnabled] = useState(() => {
    return localStorage.getItem("tl_vendor_pay_enabled") !== "false";
  });

  const [disableConfirm, setDisableConfirm] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Sync from DB when settings load
  useEffect(() => {
    if (settings) {
      if (settings.auto_delivery !== null) setAutoDelivery(settings.auto_delivery);
      if (settings.pay_enabled !== null) setPayEnabled(settings.pay_enabled);
      if (settings.notifications) setNotifPrefs(settings.notifications as Record<string, boolean>);
    }
  }, [settings]);

  const handleAutoDeliveryToggle = async (checked: boolean) => {
    setAutoDelivery(checked);
    localStorage.setItem("tl_vendor_auto_delivery", String(checked));
    await saveSettings.mutateAsync({ autoDelivery: checked });
  };

  const handlePayToggle = (checked: boolean) => {
    if (!checked) {
      setDisableConfirm(true);
      return;
    }
    setPayEnabled(true);
    localStorage.setItem("tl_vendor_pay_enabled", "true");
    saveSettings.mutateAsync({ payEnabled: true });
    toast.success("TrustLock Pay widget re-enabled on your store.");
  };

  const confirmDisablePay = async () => {
    setPayEnabled(false);
    localStorage.setItem("tl_vendor_pay_enabled", "false");
    setDisableConfirm(false);
    await saveSettings.mutateAsync({ payEnabled: false });
    toast.success("TrustLock Pay widget disabled. Buyers can no longer pay via TrustLock on your store.");
  };

  const handleSave = async () => {
    await saveSettings.mutateAsync({ autoDelivery, payEnabled });
  };

  return (
    <div>
      <VendorHeader title="Settings" />
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Business Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input defaultValue={vendor.name} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input defaultValue={vendor.email} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input defaultValue={vendor.location} />
              </div>
              <div className="space-y-2">
                <Label>Vendor Type</Label>
                <Input defaultValue={vendor.type || ""} readOnly className="bg-muted/50 capitalize" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TrustLock Pay Widget Control */}
        <Card className={!payEnabled ? "border-destructive/30" : ""}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-accent" />
              <div>
                <CardTitle className="text-base">TrustLock Pay Widget</CardTitle>
                <CardDescription>Control the payment widget on your store</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable TrustLock Pay on Store</p>
                <p className="text-xs text-muted-foreground">
                  When disabled, buyers cannot make payments via TrustLock on your connected sites.
                </p>
              </div>
              <TLId code="TL-V-SET-TGL-PAY-WIDGET" inline><Switch checked={payEnabled} onCheckedChange={handlePayToggle} /></TLId>
            </div>
            {!payEnabled && (
              <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-destructive">Widget Disabled</p>
                    <p className="text-[10px] text-muted-foreground">
                      TrustLock Pay is currently inactive on your store. New buyers cannot make payments. Toggle back on to resume accepting payments.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {payEnabled && (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Active:</strong> TrustLock Pay is live on {vendor.sites.length} connected site{vendor.sites.length !== 1 ? "s" : ""}.
                  Current plan: <strong className="text-foreground">{PLANS[planState.currentPlan].name}</strong> ({planState.orderMax === -1 ? "unlimited" : `${planState.orderMin}–${planState.orderMax} orders/mo`}).
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fulfillment Automation */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Fulfillment Automation</CardTitle>
                <CardDescription>Automate delivery confirmation for faster processing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-Delivery Confirmation</p>
                <p className="text-xs text-muted-foreground">
                  Automatically mark orders as shipped when payment is received. Best for digital goods or high-volume sellers.
                </p>
              </div>
              <TLId code="TL-V-SET-TGL-AUTO-DELIVERY" inline><Switch checked={autoDelivery} onCheckedChange={handleAutoDeliveryToggle} /></TLId>
            </div>
            {autoDelivery && (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Active:</strong> Orders will auto-confirm shipment upon payment. The 48-hour buyer confirmation countdown begins immediately.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-accent" />
              <div>
                <CardTitle className="text-base">Payout Preferences</CardTitle>
                <CardDescription>Choose how you receive funds</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Tier A — Managed Payout</p>
                <p className="text-xs text-muted-foreground">TrustLock handles fiat off-ramp (1.5% fee)</p>
              </div>
              <Badge className="bg-primary/15 text-primary text-[10px]">ACTIVE</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Tier B — Self-Custody</p>
                <p className="text-xs text-muted-foreground">Direct to your Polygon wallet (1.0% fee)</p>
              </div>
              <TLId code="TL-V-SET-BTN-PAYOUT-SWITCH" inline><Button variant="outline" size="sm">Switch</Button></TLId>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-accent" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {notificationKeys.map((n) => (
              <div key={n.key} className="flex items-center justify-between">
                <span className="text-sm">{n.label}</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs">
                    <Switch
                      checked={notifPrefs[`${n.key}_email`] !== false}
                      onCheckedChange={(checked) => setNotifPrefs(prev => ({ ...prev, [`${n.key}_email`]: checked }))}
                    /> Email
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <Switch
                      checked={notifPrefs[`${n.key}_inapp`] !== false}
                      onCheckedChange={(checked) => setNotifPrefs(prev => ({ ...prev, [`${n.key}_inapp`]: checked }))}
                    /> In-App
                  </label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <TLId code="TL-V-SET-BTN-SAVE" inline><Button className="gap-2" onClick={handleSave}><Save className="w-4 h-4" /> Save Changes</Button></TLId>

        {/* Account Actions */}
        <Card className="border-destructive/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <CardTitle className="text-base">Account Actions</CardTitle>
                <CardDescription>Pause or permanently delete your account</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">Pause Account</p>
                <p className="text-xs text-muted-foreground">Temporarily deactivate your account. All pending escrows continue processing. You can reactivate anytime.</p>
              </div>
              <TLId code="TL-V-SET-BTN-PAUSE" inline>
                <Button variant="outline" className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50" onClick={() => setShowPauseDialog(true)}>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </Button>
              </TLId>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
              <div>
                <p className="text-sm font-medium text-destructive">Delete Account</p>
                <p className="text-xs text-muted-foreground">Permanently delete your account and all data. This action cannot be undone. Audit records are retained per compliance policy.</p>
              </div>
              <TLId code="TL-V-SET-BTN-DELETE" inline>
                <Button variant="destructive" className="gap-1.5" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </TLId>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disable TrustLock Pay Confirmation */}
      <Dialog open={disableConfirm} onOpenChange={setDisableConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable TrustLock Pay?</DialogTitle>
            <DialogDescription>
              This will immediately remove the TrustLock Pay checkout option from your connected store(s). Pending escrows will continue to be processed, but no new payments can be initiated. You can re-enable it at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableConfirm(false)}>Keep Enabled</Button>
            <Button variant="destructive" onClick={confirmDisablePay}>Disable Widget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Account Dialog */}
      <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause Your Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your account will be deactivated and hidden from the platform. Pending escrows will continue to be processed normally. No new orders can be created. You can reactivate at any time by logging back in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-amber-600 hover:bg-amber-700" onClick={async () => {
              try {
                const { error } = await supabase.functions.invoke("manage-account-lifecycle", {
                  body: { action: "pause", user_id: vendor.id },
                });
                if (error) throw error;
                toast.success("Account paused. Log back in anytime to reactivate.");
                setShowPauseDialog(false);
                await supabase.auth.signOut();
                localStorage.clear();
                navigate("/trustlock/vendor/login");
              } catch (err: any) {
                toast.error(err.message || "Failed to pause account");
              }
            }}>Pause Account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Permanently Delete Account?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will permanently erase all your data from our platform:</p>
              <ul className="text-xs space-y-1 list-disc pl-4">
                <li>Profile information and business details</li>
                <li>Connected sites and widget configuration</li>
                <li>Notification preferences and settings</li>
                <li>Transaction history (audit records retained per 7-year compliance policy)</li>
                <li>KYC documents (retained per AML regulations where applicable)</li>
              </ul>
              <p className="font-semibold text-foreground">Type "DELETE" to confirm:</p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="mt-1"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteConfirmText !== "DELETE"}
              onClick={async () => {
                try {
                  const { error } = await supabase.functions.invoke("manage-account-lifecycle", {
                    body: { action: "delete", user_id: vendor.id, confirmation: "DELETE MY ACCOUNT" },
                  });
                  if (error) throw error;
                  toast.success("Account deletion initiated. Data will be purged within 14 days.");
                  setDeleteConfirmText("");
                  setShowDeleteDialog(false);
                  localStorage.clear();
                  navigate("/trustlock/vendor/login");
                } catch (err: any) {
                  toast.error(err.message || "Failed to delete account");
                }
              }}
            >Delete Permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VendorSettings;
