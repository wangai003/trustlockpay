import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Store, ShoppingBag, Globe } from "lucide-react";
import { SandboxCountdown } from "./SandboxCountdown";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRY_CODES } from "@/lib/countryCodes";
import { toast } from "sonner";

type DemoRole = "vendor" | "buyer";

const SandboxLogin = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [role, setRole] = useState<DemoRole>("vendor");
  const [saving, setSaving] = useState(false);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await supabase.from("sandbox_leads").insert({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        country_code: countryCode,
        role,
      });
    } catch {
      // non-blocking — still let them in
    }
    setSaving(false);
    const session = {
      name: name.trim(),
      email: email.trim(),
      role,
      createdAt: new Date().toISOString(),
      expiresAt: "2026-12-31T23:59:59Z",
    };
    localStorage.setItem("tl_sandbox_session", JSON.stringify(session));
    toast.success("Welcome to TrustLock Sandbox!");
    navigate(role === "vendor" ? "/sandbox/vendor" : "/sandbox/buyer");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">TrustLock Sandbox</h1>
            <p className="text-xs text-muted-foreground">Live Demo Environment</p>
          </div>
        </div>

        <div className="flex justify-center mb-4">
          <SandboxCountdown />
        </div>

        {/* Browse Store CTA */}
        <Link to="/sandbox/store">
          <Card className="mb-4 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Browse Demo Vendor Websites</p>
                <p className="text-[11px] text-muted-foreground">Start here as a buyer — choose an industry, go through checkout, then come back to track your order.</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enter Sandbox Dashboard</CardTitle>
            <CardDescription>
              Pick a role to explore the dashboard. Vendors see all orders. Buyers enter their order number to track.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStart} className="space-y-4">
              <div className="space-y-2">
                <Label>I want to explore as…</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("vendor")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${role === "vendor" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                  >
                    <Store className={`w-6 h-6 ${role === "vendor" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${role === "vendor" ? "text-primary" : "text-muted-foreground"}`}>Vendor</span>
                    <span className="text-xs text-muted-foreground text-center">Manage & fulfill orders</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("buyer")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${role === "buyer" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                  >
                    <ShoppingBag className={`w-6 h-6 ${role === "buyer" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${role === "buyer" ? "text-primary" : "text-muted-foreground"}`}>Buyer</span>
                    <span className="text-xs text-muted-foreground text-center">Track & release orders</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sb-name">Your Name *</Label>
                <Input id="sb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Mensah" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sb-email">Email Address *</Label>
                <Input id="sb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" required />
              </div>

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-[120px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {COUNTRY_CODES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} {c.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555 123 4567" />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={!name.trim() || !email.trim() || saving}>
                {saving ? "Saving…" : "Enter Sandbox"}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                We'll notify you when TrustLock goes live. Data stored securely. Active until December 31, 2026.
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SandboxLogin;
