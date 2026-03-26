import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ShoppingBag, Eye, EyeOff, AlertTriangle, ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const BuyerLogin = () => {
  const navigate = useNavigate();
  const { signIn, user, loading: authLoading } = useAuth();

  // Auto-redirect if already authenticated (e.g. after email verification)
  useEffect(() => {
    if (!authLoading && user) {
      localStorage.setItem("tl_buyer_network", "mainnet");
      navigate("/trustlock/buyer", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Detect if coming from email verification
  const comingFromVerification = window.location.hash.includes("access_token") || 
    window.location.search.includes("verified") ||
    document.referrer.includes("/verify");

  const [isTestnet, setIsTestnet] = useState(comingFromVerification ? false : true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(comingFromVerification ? "" : "james@trustlocktest.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  // Check lockout on mount
  useEffect(() => {
    const stored = localStorage.getItem("tl_buyer_lockout");
    if (stored) {
      const until = parseInt(stored);
      if (Date.now() < until) {
        setLockedUntil(until);
        setFailedAttempts(MAX_ATTEMPTS);
      } else {
        localStorage.removeItem("tl_buyer_lockout");
        localStorage.removeItem("tl_buyer_failed");
      }
    }
    const storedAttempts = localStorage.getItem("tl_buyer_failed");
    if (storedAttempts) setFailedAttempts(parseInt(storedAttempts));
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      if (Date.now() >= lockedUntil) {
        setLockedUntil(null);
        setFailedAttempts(0);
        localStorage.removeItem("tl_buyer_lockout");
        localStorage.removeItem("tl_buyer_failed");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const remainingMin = isLocked ? Math.ceil((lockedUntil! - Date.now()) / 60000) : 0;

  const handleToggle = (checked: boolean) => {
    setIsTestnet(!checked);
    setEmail(!checked ? "james@trustlocktest.com" : "");
    setPassword(!checked ? "123" : "");
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isLocked) {
      setError(`Account locked. Try again in ${remainingMin} minutes.`);
      return;
    }

    if (isTestnet) {
      if (password === "123") {
        localStorage.setItem("tl_buyer_auth", "true");
        localStorage.setItem("tl_buyer_network", "testnet");
        localStorage.removeItem("tl_buyer_failed");
        navigate("/trustlock/buyer");
      } else {
        handleFailedAttempt();
      }
    } else {
      setLoading(true);
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        handleFailedAttempt();
      } else {
        localStorage.setItem("tl_buyer_network", "mainnet");
        localStorage.removeItem("tl_buyer_failed");
        localStorage.removeItem("tl_buyer_lockout");
        navigate("/trustlock/buyer");
      }
    }
  };

  const handleFailedAttempt = () => {
    const newCount = failedAttempts + 1;
    setFailedAttempts(newCount);
    localStorage.setItem("tl_buyer_failed", newCount.toString());

    if (newCount >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_MS;
      setLockedUntil(until);
      localStorage.setItem("tl_buyer_lockout", until.toString());
      setError("Too many failed attempts. Account locked for 15 minutes.");
    } else {
      setError(`Invalid credentials. ${MAX_ATTEMPTS - newCount} attempts remaining.`);
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

        {isLocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-destructive">Account locked. Reset your password to unlock immediately.</span>
              </div>
              <button
                type="button"
                onClick={() => navigate("/trustlock/buyer/signup")}
                className="text-xs text-primary hover:underline font-medium"
              >
                Reset password →
              </button>
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
                <Label htmlFor="email">{isTestnet ? "Email / Buyer ID" : "Email address"}</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isTestnet ? "james@trustlocktest.com" : "you@example.com"}
                  readOnly={isTestnet}
                  className={isTestnet ? "bg-muted/50" : ""}
                  disabled={isLocked}
                />
                {isTestnet ? (
                  <p className="text-xs text-muted-foreground">Auto-populated in testnet mode</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Use the same email you registered with.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={isLocked} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {isTestnet && <p className="text-xs text-muted-foreground">Contact admin for testnet credentials</p>}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {!isLocked && failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
                <p className="text-xs text-accent-foreground">{MAX_ATTEMPTS - failedAttempts} attempts remaining before lockout</p>
              )}
              <Button type="submit" className="w-full" disabled={loading || isLocked}>
                {loading ? "Signing in..." : isTestnet ? "Enter Testnet Dashboard" : "Sign In"}
              </Button>
              {!isTestnet && (
                <div className="text-center">
                  <Link to="/trustlock/buyer/signup" className="text-xs text-primary hover:underline">New buyer? Create an account →</Link>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">Your funds are protected by escrow</p>
      </motion.div>
    </div>
  );
};

export default BuyerLogin;
