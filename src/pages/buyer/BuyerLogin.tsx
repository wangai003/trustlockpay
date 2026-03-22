import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ShoppingBag, Lock, Eye, EyeOff, AlertTriangle, ArrowLeft } from "lucide-react";

const BuyerLogin = () => {
  const navigate = useNavigate();
  const [isTestnet, setIsTestnet] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(isTestnet ? "james@trustlocktest.com" : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleToggle = (checked: boolean) => {
    setIsTestnet(!checked);
    setEmail(!checked ? "james@trustlocktest.com" : "");
    setPassword("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTestnet) {
      if (password === "123") {
        localStorage.setItem("tl_buyer_auth", "true");
        localStorage.setItem("tl_buyer_network", "testnet");
        navigate("/trustlock/buyer");
      } else {
        setError("Invalid password. Hint: Enter 123 for testnet access.");
      }
    } else {
      setError("Mainnet login requires live authentication. Connect your backend.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Link to="/" className="absolute top-4 left-4 p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">TrustLock</h1>
            <p className="text-xs text-muted-foreground">Buyer Portal</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mb-6">
          <span className={`text-sm font-medium ${isTestnet ? "text-accent" : "text-muted-foreground"}`}>Testnet</span>
          <Switch checked={!isTestnet} onCheckedChange={handleToggle} />
          <span className={`text-sm font-medium ${!isTestnet ? "text-primary" : "text-muted-foreground"}`}>Mainnet</span>
        </div>

        {isTestnet && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-4">
            <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg p-3 text-sm">
              <AlertTriangle className="w-4 h-4 text-accent shrink-0" />
              <span className="text-accent-foreground"><strong>Testnet Mode</strong> — Simulated buyer data. No real transactions.</span>
            </div>
          </motion.div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buyer Sign In</CardTitle>
            <CardDescription>{isTestnet ? "Use testnet credentials to explore" : "Enter your credentials"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email / Buyer ID</Label>
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={isTestnet} className={isTestnet ? "bg-muted/50" : ""} />
                {isTestnet && <p className="text-xs text-muted-foreground">Auto-populated in testnet mode</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {isTestnet && (
                  <p className="text-xs text-muted-foreground">
                    Contact admin for testnet credentials
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">{isTestnet ? "Enter Testnet Dashboard" : "Sign In"}</Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">Your funds are protected by escrow</p>
      </motion.div>
    </div>
  );
};

export default BuyerLogin;
