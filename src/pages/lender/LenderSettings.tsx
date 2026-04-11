import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, AlertTriangle, Pause, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LenderSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const userId = user?.id;

  return (
    <div>
      <LenderHeader title="Settings" />
      <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
        <Card>
          <CardContent className="p-8 text-center">
            <Settings className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-1">Account Settings</h3>
            <p className="text-sm text-muted-foreground">Manage your profile, update logo and website (mandatory), configure social links, notification preferences, and terms template.</p>
          </CardContent>
        </Card>

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
                <p className="text-xs text-muted-foreground">Temporarily deactivate. Active financing agreements continue processing. Reactivate anytime.</p>
              </div>
              <Button variant="outline" className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50" onClick={() => setShowPauseDialog(true)}>
                <Pause className="w-3.5 h-3.5" /> Pause
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
              <div>
                <p className="text-sm font-medium text-destructive">Delete Account</p>
                <p className="text-xs text-muted-foreground">Permanently delete your account and all data. Audit records retained per compliance policy.</p>
              </div>
              <Button variant="destructive" className="gap-1.5" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
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
              Your account will be deactivated. Active financing agreements continue normally. No new applications. Reactivate by logging back in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-amber-600 hover:bg-amber-700" onClick={async () => {
              if (!userId) { toast.error("User not found"); return; }
              try {
                const { error } = await supabase.functions.invoke("manage-account-lifecycle", {
                  body: { action: "pause", user_id: userId, role: "lender" },
                });
                if (error) throw error;
                toast.success("Account paused. Log back in to reactivate.");
                setShowPauseDialog(false);
                await supabase.auth.signOut();
                localStorage.removeItem("tl_lender_auth");
                localStorage.removeItem("tl_lender_network");
                navigate("/trustlock/lender/login");
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
                <li>Portfolio and financing records</li>
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
                if (!userId) { toast.error("User not found"); return; }
                try {
                  const { error } = await supabase.functions.invoke("manage-account-lifecycle", {
                    body: { action: "delete", user_id: userId, confirmation_text: "DELETE MY ACCOUNT", role: "lender" },
                  });
                  if (error) throw error;
                  toast.success("Account deletion initiated. Data will be purged within 14 days.");
                  setDeleteConfirmText("");
                  setShowDeleteDialog(false);
                  localStorage.removeItem("tl_lender_auth");
                  localStorage.removeItem("tl_lender_network");
                  navigate("/trustlock/lender/login");
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

export default LenderSettings;
