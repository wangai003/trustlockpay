import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Store, ShoppingBag, Globe, Building2, LogIn } from "lucide-react";
import { SandboxCountdown } from "./SandboxCountdown";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRY_CODES } from "@/lib/countryCodes";
import { toast } from "sonner";

type DemoRole = "vendor" | "buyer" | "lender";

const SandboxLogin = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [saving, setSaving] = useState(false);

  // Return user flow
  const [showReturnLogin, setShowReturnLogin] = useState(false);
  const [returnEmail, setReturnEmail] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);

  // After login (new or returning), pick a portal
  const [loggedInUser, setLoggedInUser] = useState<{ name: string; email: string } | null>(null);

  // Check localStorage for existing session on mount
  useState(() => {
    const raw = localStorage.getItem("tl_sandbox_session");
    if (raw) {
      try {
        const s = JSON.parse(raw);
        if (new Date(s.expiresAt) > new Date()) {
          setLoggedInUser({ name: s.name, email: s.email });
        }
      } catch { /* ignore */ }
    }
  });

  const handleNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await supabase.from("sandbox_leads").insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        country_code: countryCode,
        business: business.trim() || null,
      });
    } catch {
      // non-blocking
    }
    setSaving(false);
    const session = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
      expiresAt: "2026-12-31T23:59:59Z",
    };
    localStorage.setItem("tl_sandbox_session", JSON.stringify(session));
    toast.success("Welcome to TrustLock Sandbox!");
    setLoggedInUser({ name: name.trim(), email: email.trim().toLowerCase() });
  };

  const handleReturnLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setReturnLoading(true);
    const trimmedEmail = returnEmail.trim().toLowerCase();

    // Look up in DB
    const { data } = await supabase
      .from("sandbox_leads")
      .select("name, email")
      .eq("email", trimmedEmail)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lead = data[0];
      const session = {
        name: lead.name,
        email: lead.email,
        createdAt: new Date().toISOString(),
        expiresAt: "2026-12-31T23:59:59Z",
      };
      localStorage.setItem("tl_sandbox_session", JSON.stringify(session));
      toast.success(`Welcome back, ${lead.name}!`);
      setLoggedInUser({ name: lead.name, email: lead.email });
    } else {
      toast.error("No account found with that email. Please sign up below.");
    }
    setReturnLoading(false);
  };

  const enterPortal = (role: DemoRole) => {
    if (!loggedInUser) return;
    const raw = localStorage.getItem("tl_sandbox_session");
    if (raw) {
      const session = JSON.parse(raw);
      session.role = role;
      localStorage.setItem("tl_sandbox_session", JSON.stringify(session));
    }
    navigate(role === "vendor" ? "/sandbox/vendor" : role === "lender" ? "/sandbox/lender" : "/sandbox/buyer");
  };

  // ── Portal picker (shown after login) ──
  if (loggedInUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-2xl text-foreground">TrustLock Sandbox</h1>
              <p className="text-xs text-muted-foreground">Welcome, {loggedInUser.name}</p>
            </div>
          </div>

          <div className="flex justify-center mb-2">
            <SandboxCountdown />
          </div>

          <Link to="/sandbox/store">
            <Card className="mb-4 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Browse Demo Vendor Websites</p>
                  <p className="text-[11px] text-muted-foreground">Start here as a buyer — choose an industry, go through checkout.</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Choose a Portal</CardTitle>
              <CardDescription>Select which dashboard you'd like to explore.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 px-4" onClick={() => enterPortal("vendor")}>
                <Store className="w-5 h-5 text-primary shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold">Vendor Dashboard</p>
                  <p className="text-xs text-muted-foreground font-normal">Manage orders, payouts & escrow</p>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 px-4" onClick={() => enterPortal("buyer")}>
                <ShoppingBag className="w-5 h-5 text-primary shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold">Buyer Dashboard</p>
                  <p className="text-xs text-muted-foreground font-normal">Track orders & manage purchases</p>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 px-4" onClick={() => enterPortal("lender")}>
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold">Lender Dashboard</p>
                  <p className="text-xs text-muted-foreground font-normal">Finance vendors & view risk scores</p>
                </div>
              </Button>
            </CardContent>
          </Card>

          <button
            className="w-full text-xs text-muted-foreground hover:underline text-center"
            onClick={() => {
              localStorage.removeItem("tl_sandbox_session");
              setLoggedInUser(null);
              setShowReturnLogin(false);
            }}
          >
            Not you? Start fresh
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Login / Signup form ──
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-4">
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

        {/* Return User Button — always visible */}
        <Button
          variant={showReturnLogin ? "default" : "outline"}
          className="w-full gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          onClick={() => setShowReturnLogin(!showReturnLogin)}
        >
          <LogIn className="w-4 h-4" />
          Returning User? Log In
        </Button>

        {showReturnLogin && (
          <Card className="border-primary/30">
            <CardContent className="p-4">
              <form onSubmit={handleReturnLogin} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="return-email">Your Email</Label>
                  <Input
                    id="return-email"
                    type="email"
                    value={returnEmail}
                    onChange={(e) => setReturnEmail(e.target.value)}
                    placeholder="jane@example.com"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={!returnEmail.trim() || returnLoading}>
                  {returnLoading ? "Looking up…" : "Log In"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Link to="/sandbox/store">
          <Card className="border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer mt-4">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Browse Demo Vendor Websites</p>
                <p className="text-[11px] text-muted-foreground">Start here as a buyer — choose an industry, go through checkout.</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">First Time? Sign Up</CardTitle>
            <CardDescription>
              Enter your info to access the sandbox dashboards. Only required once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNewUser} className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="sb-business">Business / Company <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input id="sb-business" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Acme Logistics Ltd." />
              </div>

              <Button type="submit" className="w-full" disabled={!name.trim() || !email.trim() || saving}>
                {saving ? "Saving…" : "Enter Sandbox"}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                We'll notify you when TrustLock goes live. Data stored securely.
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SandboxLogin;
