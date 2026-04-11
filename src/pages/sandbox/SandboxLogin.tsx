import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Store, ShoppingBag, Building2, LogIn, UserPlus } from "lucide-react";
import { SandboxCountdown } from "./SandboxCountdown";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRY_CODES } from "@/lib/countryCodes";
import { toast } from "sonner";

type DemoRole = "vendor" | "buyer" | "lender";

const SandboxLogin = () => {
  const navigate = useNavigate();

  // Form fields (signup)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [saving, setSaving] = useState(false);

  // Return user
  const [returnEmail, setReturnEmail] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);

  // View state: "choose" | "return" | "signup" | "portal"
  const [view, setView] = useState<"choose" | "return" | "signup" | "portal">("choose");
  const [loggedInUser, setLoggedInUser] = useState<{ name: string; email: string } | null>(null);

  // Check localStorage on mount
  useState(() => {
    const raw = localStorage.getItem("tl_sandbox_session");
    if (raw) {
      try {
        const s = JSON.parse(raw);
        if (new Date(s.expiresAt) > new Date()) {
          setLoggedInUser({ name: s.name, email: s.email });
          setView("portal");
        }
      } catch { /* ignore */ }
    }
  });

  const createSession = (userName: string, userEmail: string) => {
    const session = {
      name: userName,
      email: userEmail,
      createdAt: new Date().toISOString(),
      expiresAt: "2026-12-31T23:59:59Z",
    };
    localStorage.setItem("tl_sandbox_session", JSON.stringify(session));
    setLoggedInUser({ name: userName, email: userEmail });
    setView("portal");
  };

  const handleSignup = async (e: React.FormEvent) => {
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
    } catch { /* non-blocking */ }
    setSaving(false);
    toast.success("Welcome to TrustLock Sandbox!");
    createSession(name.trim(), email.trim().toLowerCase());
  };

  const handleReturnLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setReturnLoading(true);
    const trimmedEmail = returnEmail.trim().toLowerCase();

    const { data } = await supabase
      .from("sandbox_leads")
      .select("name, email")
      .eq("email", trimmedEmail)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      toast.success(`Welcome back, ${data[0].name}!`);
      createSession(data[0].name, data[0].email);
    } else {
      toast.error("No account found with that email. Please sign up instead.");
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

  // ═══════════════════════════════
  // Portal Picker (after login)
  // ═══════════════════════════════
  if (view === "portal" && loggedInUser) {
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

          <div className="flex justify-center">
            <SandboxCountdown />
          </div>

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
              setView("choose");
            }}
          >
            Not you? Start fresh
          </button>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════
  // Landing: Two buttons only
  // ═══════════════════════════════
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-5">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">TrustLock Sandbox</h1>
            <p className="text-xs text-muted-foreground">Live Demo Environment</p>
          </div>
        </div>

        <div className="flex justify-center">
          <SandboxCountdown />
        </div>

        {/* ── Two main actions ── */}
        {view === "choose" && (
          <div className="space-y-3">
            <Button
              className="w-full h-12 gap-2 text-base"
              variant="default"
              onClick={() => setView("return")}
            >
              <LogIn className="w-5 h-5" />
              Return User
            </Button>
            <Button
              className="w-full h-12 gap-2 text-base"
              variant="outline"
              onClick={() => setView("signup")}
            >
              <UserPlus className="w-5 h-5" />
              Sign Up
            </Button>
          </div>
        )}

        {/* ── Return User Form ── */}
        {view === "return" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Welcome Back</CardTitle>
              <CardDescription>Enter the email you signed up with.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReturnLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="return-email">Email Address</Label>
                  <Input
                    id="return-email"
                    type="email"
                    value={returnEmail}
                    onChange={(e) => setReturnEmail(e.target.value)}
                    placeholder="jane@example.com"
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={!returnEmail.trim() || returnLoading}>
                  {returnLoading ? "Looking up…" : "Log In"}
                </Button>
                <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => setView("choose")}>
                  ← Back
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Sign Up Form ── */}
        {view === "signup" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create Your Account</CardTitle>
              <CardDescription>Enter your info to access the sandbox. Only required once.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
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

                <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => setView("choose")}>
                  ← Back
                </Button>

                <p className="text-center text-[11px] text-muted-foreground">
                  We'll notify you when TrustLock goes live. Data stored securely.
                </p>
              </form>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default SandboxLogin;
