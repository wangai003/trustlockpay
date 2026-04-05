import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Store, ShoppingBag } from "lucide-react";

type DemoRole = "vendor" | "buyer";

const SandboxLogin = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<DemoRole>("vendor");

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const session = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    localStorage.setItem("tl_sandbox_session", JSON.stringify(session));
    navigate(role === "vendor" ? "/sandbox/vendor" : "/sandbox/buyer");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">TrustLock Sandbox</h1>
            <p className="text-xs text-muted-foreground">Live Demo Environment</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Try TrustLock — No Account Needed</CardTitle>
            <CardDescription>
              Experience full escrow-protected checkout, order tracking, milestones, and messaging. Your session lasts 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStart} className="space-y-4">
              <div className="space-y-2">
                <Label>I want to try as a…</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("vendor")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${role === "vendor" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                  >
                    <Store className={`w-6 h-6 ${role === "vendor" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${role === "vendor" ? "text-primary" : "text-muted-foreground"}`}>Vendor</span>
                    <span className="text-xs text-muted-foreground text-center">Sell with escrow protection</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("buyer")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${role === "buyer" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                  >
                    <ShoppingBag className={`w-6 h-6 ${role === "buyer" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${role === "buyer" ? "text-primary" : "text-muted-foreground"}`}>Buyer</span>
                    <span className="text-xs text-muted-foreground text-center">Buy with funds protected</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sb-name">Your Name</Label>
                <Input id="sb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Mensah" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sb-email">Email (for demo only)</Label>
                <Input id="sb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" required />
              </div>

              <Button type="submit" className="w-full" disabled={!name.trim() || !email.trim()}>
                Start Demo
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                This is a sandbox environment. No real payments are processed. Your data is stored locally and expires in 24 hours.
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SandboxLogin;
