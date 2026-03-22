import BuyerHeader from "@/components/buyer/BuyerHeader";
import { useBuyer } from "@/contexts/BuyerContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Save } from "lucide-react";

const BuyerSettings = () => {
  const { buyer } = useBuyer();

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

        <Button className="gap-2"><Save className="w-4 h-4" /> Save Changes</Button>
      </div>
    </div>
  );
};

export default BuyerSettings;
