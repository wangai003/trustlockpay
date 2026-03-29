import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import { useBuyer } from "@/contexts/BuyerContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Save, AlertTriangle, Pause, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TLId from "@/components/shared/TLId";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useProfileNotifications, useSaveProfileNotifications } from "@/hooks/useSupabaseData";

const buyerNotificationKeys = [
  { key: "order_status", label: "Order status updates" },
  { key: "delivery_reminder", label: "Delivery confirmation reminders" },
  { key: "auto_release", label: "Auto-release countdown (48h)" },
  { key: "dispute_updates", label: "Dispute updates" },
  { key: "funds_released", label: "Funds released" },
];

const BuyerSettings = () => {
  const { buyer } = useBuyer();
  const navigate = useNavigate();
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const { data: savedNotifs } = useProfileNotifications();
  const saveNotifs = useSaveProfileNotifications();
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (savedNotifs && typeof savedNotifs === "object") {
      setNotifPrefs(savedNotifs as Record<string, boolean>);
    }
  }, [savedNotifs]);

  return (
    <div>
      <BuyerHeader title="Settings" />
      <div className="p-6 space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input defaultValue={buyer.name} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input defaultValue={buyer.email} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input defaultValue={buyer.location} />
              </div>
              <div className="space-y-2">
                <Label>Phone (optional)</Label>
                <Input placeholder="+1 (xxx) xxx-xxxx" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-accent" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Order status updates", email: true, sms: true },
              { label: "Delivery confirmation reminders", email: true, sms: true },
              { label: "Auto-release countdown (48h)", email: true, sms: true },
              { label: "Dispute updates", email: true, sms: false },
              { label: "Funds released", email: true, sms: false },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between">
                <span className="text-sm">{n.label}</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs"><Switch defaultChecked={n.email} /> Email</label>
                  <label className="flex items-center gap-1.5 text-xs"><Switch defaultChecked={n.sms} /> SMS</label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <TLId code="TL-B-SET-BTN-SAVE" inline><Button className="gap-2"><Save className="w-4 h-4" /> Save Changes</Button></TLId>

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
                <p className="text-xs text-muted-foreground">Temporarily deactivate. Pending escrows continue processing. Reactivate anytime.</p>
              </div>
              <TLId code="TL-B-SET-BTN-PAUSE" inline>
                <Button variant="outline" className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50" onClick={() => setShowPauseDialog(true)}>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </Button>
              </TLId>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
              <div>
                <p className="text-sm font-medium text-destructive">Delete Account</p>
                <p className="text-xs text-muted-foreground">Permanently delete your account and all data. Audit records retained per compliance policy.</p>
              </div>
              <TLId code="TL-B-SET-BTN-DELETE" inline>
                <Button variant="destructive" className="gap-1.5" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </TLId>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pause Dialog */}
      <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause Your Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your account will be deactivated. Pending escrows continue normally. No new orders. Reactivate by logging back in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-amber-600 hover:bg-amber-700" onClick={async () => {
              try {
                const { error } = await supabase.functions.invoke("manage-account-lifecycle", {
                  body: { action: "pause", user_id: buyer.id },
                });
                if (error) throw error;
                toast.success("Account paused. Log back in to reactivate.");
                setShowPauseDialog(false);
                await supabase.auth.signOut();
                localStorage.clear();
                navigate("/trustlock/buyer/login");
              } catch (err: any) {
                toast.error(err.message || "Failed to pause account");
              }
            }}>Pause Account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Permanently Delete Account?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will permanently erase all your data:</p>
              <ul className="text-xs space-y-1 list-disc pl-4">
                <li>Profile information and preferences</li>
                <li>Order history and tracking data</li>
                <li>Notification settings</li>
                <li>Transaction records (audit copies retained per 7-year compliance)</li>
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
                    body: { action: "delete", user_id: buyer.id, confirmation: "DELETE MY ACCOUNT" },
                  });
                  if (error) throw error;
                  toast.success("Account deletion initiated. Data will be purged within 14 days.");
                  setDeleteConfirmText("");
                  setShowDeleteDialog(false);
                  localStorage.clear();
                  navigate("/trustlock/buyer/login");
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

export default BuyerSettings;
