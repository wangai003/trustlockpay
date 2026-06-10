import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingBag, Eye, EyeOff, AlertTriangle, ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import InlineLegalLinks from "@/components/shared/InlineLegalLinks";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import NetworkLockBanner from "@/components/auth/NetworkLockBanner";
import { stampNetworkScope, type NetworkScope } from "@/lib/networkScope";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

interface BuyerLoginProps {
  forceNetwork?: NetworkScope;
}

const BuyerLogin = ({ forceNetwork = "mainnet" }: BuyerLoginProps) => {
  const navigate = useNavigate();
  const { signIn, user, loading: authLoading } = useAuth();
  const isTestnet = forceNetwork === "testnet";

  useEffect(() => {
    if (!isTestnet && !authLoading && user) {
      void stampNetworkScope("buyer", "mainnet");
      navigate("/trustlock/buyer", { replace: true });
    }
  }, [user, authLoading, navigate, isTestnet]);

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(isTestnet ? "james@trustlocktest.com" : "");
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isLocked) {
      setError(`Account locked. Try again in ${remainingMin} minutes.`);
      return;
    }

    if (isTestnet) {
      if (password === "333") {
        localStorage.setItem("tl_buyer_auth", "true");
        await stampNetworkScope("buyer", "testnet", { authed: false });
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
        await stampNetworkScope("buyer", "mainnet");
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]" />
      </div>
      <button
        type="button"
        aria-label="Go back"
        onClick={() => {
          const sameOriginReferrer = document.referrer && document.referrer.startsWith(window.location.origin);
          if (sameOriginReferrer && window.history.length > 1) navigate(-1);
          else navigate("/trustlock");
        }}
        className="absolute top-4 left-4 p-3 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground z-50 cursor-pointer"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="w-full max-w-md relative z-10">
        <motion.div className="flex items-center justify-center gap-3 mb-8" initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 200 }}>
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <ShoppingBag className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">TrustLock</h1>
            <p className="text-xs text-muted-foreground">Buyer Portal <span className="text-[10px] opacity-70">(Investor · Client · Funder)</span></p>
          </div>
        </motion.div>

        <NetworkLockBanner scope={forceNetwork} />

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

        <Card className="border-border/50 shadow-xl shadow-black/5 backdrop-blur-sm">
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
                <>
                  <SocialLoginButtons context="as Buyer" redirectTo={`${window.location.origin}/trustlock/buyer/login`} />
                  <div className="text-center space-y-2">
                    <Link to="/trustlock/buyer/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">Forgot password?</Link>
                    <div>
                      <Link to="/trustlock/buyer/signup" className="text-xs text-primary hover:underline">New buyer? Create an account →</Link>
                    </div>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">Your funds are protected by escrow</p>
        <InlineLegalLinks />
      </motion.div>
    </div>
  );
};

export default BuyerLogin;
