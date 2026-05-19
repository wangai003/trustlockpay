import { useState, useEffect } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Bell, Globe, Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { useSaveAdminSettings, useAdminSettings } from "@/hooks/useBackendSync";
import ChiefOnlyGate from "@/components/admin/ChiefOnlyGate";

const adminNotifKeys = [
  { key: "new_dispute", label: "New dispute filed" },
  { key: "kyc_review", label: "KYC review needed" },
  { key: "large_tx", label: "Large transaction (>$5,000)" },
  { key: "flagged_activity", label: "Flagged activity alert" },
  { key: "ai_escalation", label: "Emmanuel AI escalation" },
];

const AdminSettings = () => {
  const { data: savedNotifs } = useAdminSettings();
  const saveSettings = useSaveAdminSettings();
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (savedNotifs && typeof savedNotifs === "object") {
      setNotifPrefs(savedNotifs as Record<string, boolean>);
    }
  }, [savedNotifs]);

  const handleSave = () => {
    saveSettings.mutateAsync({ notifPrefs });
  };
  return (
    <div>
      <AdminHeader title="Settings" />
      <div className="p-6 space-y-6 max-w-4xl">
        {/* 2FA */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
                <CardDescription>Required for all financial actions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">TOTP Authentication</p>
                <p className="text-xs text-muted-foreground">Google Authenticator / Authy</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/15 text-primary text-[10px]">ENABLED</Badge>
                <Switch checked disabled />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Require 2FA for Escrow Release</p>
                <p className="text-xs text-muted-foreground">Mandatory confirmation before releasing funds</p>
              </div>
              <Switch checked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Require 2FA for Refunds</p>
                <p className="text-xs text-muted-foreground">Mandatory confirmation before processing refunds</p>
              </div>
              <Switch checked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Lockout After Failed Attempts</p>
                <p className="text-xs text-muted-foreground">15-minute lockout after 3 failed 2FA attempts</p>
              </div>
              <Switch checked />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-accent" />
              <CardTitle className="text-base">Notification Preferences</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {adminNotifKeys.map((n) => (
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

        {/* Platform */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Platform Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Auto-Release Countdown</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" defaultValue={48} className="w-24" />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dispute Window</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" defaultValue={14} className="w-24" />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Product Fee (%)</Label>
                <Input type="number" defaultValue={2.5} step={0.1} className="w-24" />
              </div>
              <div className="space-y-2">
                <Label>Service Fee (%)</Label>
                <Input type="number" defaultValue={3.0} step={0.1} className="w-24" />
              </div>
            </div>
          </CardContent>
        </Card>


        <Button className="gap-2" onClick={handleSave}><Save className="w-4 h-4" /> Save Changes</Button>
      </div>
    </div>
  );
};

export default AdminSettings;
