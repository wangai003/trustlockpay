import { useState } from "react";
import VendorHeader from "@/components/vendor/VendorHeader";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, CreditCard, User, Save, Truck } from "lucide-react";
import { toast } from "sonner";

const VendorSettings = () => {
  const { vendor } = useVendor();
  const [autoDelivery, setAutoDelivery] = useState(() => {
    return localStorage.getItem("tl_vendor_auto_delivery") === "true";
  });

  const handleAutoDeliveryToggle = (checked: boolean) => {
    setAutoDelivery(checked);
    localStorage.setItem("tl_vendor_auto_delivery", String(checked));
    toast.success(checked ? "Auto-delivery enabled" : "Auto-delivery disabled");
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
              <Switch checked={autoDelivery} onCheckedChange={handleAutoDeliveryToggle} />
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
              <Button variant="outline" size="sm">Switch</Button>
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
            {[
              { label: "New escrow created", email: true, inApp: true },
              { label: "Buyer confirms delivery", email: true, inApp: true },
              { label: "Funds released", email: true, inApp: true },
              { label: "Dispute opened against you", email: true, inApp: true },
              { label: "KYC status update", email: true, inApp: true },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between">
                <span className="text-sm">{n.label}</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs"><Switch defaultChecked={n.email} /> Email</label>
                  <label className="flex items-center gap-1.5 text-xs"><Switch defaultChecked={n.inApp} /> In-App</label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button className="gap-2"><Save className="w-4 h-4" /> Save Changes</Button>
      </div>
    </div>
  );
};

export default VendorSettings;
