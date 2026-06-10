import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Eye, EyeOff, AlertTriangle, ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import InlineLegalLinks from "@/components/shared/InlineLegalLinks";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import NetworkLockBanner from "@/components/auth/NetworkLockBanner";
import { stampNetworkScope, type NetworkScope } from "@/lib/networkScope";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const isLikelyEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

interface VendorLoginProps {
  forceNetwork?: NetworkScope;
}

const VendorLogin = ({ forceNetwork = "mainnet" }: VendorLoginProps) => {
  const navigate = useNavigate();
  const { signIn, user, loading: authLoading } = useAuth();
  const isTestnet = forceNetwork === "testnet";

  // Auto-redirect if already authenticated (e.g. after email verification).
  // Only valid on the mainnet route — testnet route never has a real session.
  useEffect(() => {
    if (!isTestnet && !authLoading && user) {
      void stampNetworkScope("vendor", "mainnet");
      navigate("/trustlock/vendor", { replace: true });
    }
  }, [user, authLoading, navigate, isTestnet]);

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(isTestnet ? "vendor@kentetest.com" : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("tl_vendor_lockout");
    if (stored) {
      const until = parseInt(stored);
      if (Date.now() < until) { setLockedUntil(until); setFailedAttempts(MAX_ATTEMPTS); }
      else { localStorage.removeItem("tl_vendor_lockout"); localStorage.removeItem("tl_vendor_failed"); }
    }
    const storedAttempts = localStorage.getItem("tl_vendor_failed");
    if (storedAttempts) setFailedAttempts(parseInt(storedAttempts));
  }, []);

  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      if (Date.now() >= lockedUntil) {
        setLockedUntil(null); setFailedAttempts(0);
        localStorage.removeItem("tl_vendor_lockout"); localStorage.removeItem("tl_vendor_failed");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const remainingMin = isLocked ? Math.ceil((lockedUntil! - Date.now()) / 60000) : 0;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResendMessage("");
    if (isLocked) { setError(`Account locked. Try again in ${remainingMin} minutes.`); return; }

    if (isTestnet) {
      if (password === "333") {
        localStorage.setItem("tl_vendor_auth", "true");
        await stampNetworkScope("vendor", "testnet", { authed: false });
        localStorage.setItem("tl_vendor_onboarded", "true");
        localStorage.removeItem("tl_vendor_failed");
        navigate("/trustlock/vendor");
      } else {
        handleFailedAttempt();
      }
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isLikelyEmail(normalizedEmail)) {
      setError("Mainnet sign-in requires your account email, not a vendor name.");
      return;
    }

    setLoading(true);
    const { error } = await signIn(normalizedEmail, password);
    setLoading(false);

    if (error) {
      handleFailedAttempt();
      return;
    }

    await stampNetworkScope("vendor", "mainnet");
    localStorage.removeItem("tl_vendor_failed");
    localStorage.removeItem("tl_vendor_lockout");
    navigate("/trustlock/vendor");
  };

  const handleResendVerification = async () => {
    setError("");
    setResendMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!isLikelyEmail(normalizedEmail)) {
      setError("Enter your account email first, then resend verification.");
      return;
    }

    setResendLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/trustlock/vendor/login`,
      },
    });
    setResendLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setResendMessage("Verification email sent. Please check inbox and spam.");
  };

  const handleFailedAttempt = () => {
    const newCount = failedAttempts + 1;
    setFailedAttempts(newCount);
    localStorage.setItem("tl_vendor_failed", newCount.toString());
    if (newCount >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_MS;
      setLockedUntil(until);
      localStorage.setItem("tl_vendor_lockout", until.toString());
      setError("Too many failed attempts. Account locked for 15 minutes.");
    } else {
      setError(`Invalid credentials. ${MAX_ATTEMPTS - newCount} attempts remaining.`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]" />
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
            <Store className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">TrustLock</h1>
            <p className="text-xs text-muted-foreground">Vendor Portal <span className="text-[10px] opacity-70">(Contractor · Supplier · Exporter)</span></p>
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
                onClick={() => navigate("/trustlock/vendor/signup")}
                className="text-xs text-primary hover:underline font-medium"
              >
                Reset password →
              </button>
            </div>
          </motion.div>
        )}

        <Card className="border-border/50 shadow-xl shadow-black/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Vendor Sign In</CardTitle>
            <CardDescription>{isTestnet ? "Use testnet credentials to explore" : "Enter your vendor credentials"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{isTestnet ? "Email / Vendor ID" : "Email address"}</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isTestnet ? "vendor@kentetest.com" : "you@company.com"}
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
              {resendMessage && <p className="text-sm text-primary">{resendMessage}</p>}
              {!isLocked && failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
                <p className="text-xs text-accent-foreground">{MAX_ATTEMPTS - failedAttempts} attempts remaining before lockout</p>
              )}
              <Button type="submit" className="w-full" disabled={loading || isLocked}>
                {loading ? "Signing in..." : isTestnet ? "Enter Testnet Dashboard" : "Sign In"}
              </Button>
              {!isTestnet && (
                <>
                  <SocialLoginButtons context="as Vendor" redirectTo={`${window.location.origin}/trustlock/vendor/login`} />
                  <div className="text-center space-y-2">
                    <Link to="/trustlock/vendor/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">Forgot password?</Link>
                    <div>
                      <Link to="/trustlock/vendor/signup" className="text-xs text-primary hover:underline">New vendor? Create an account →</Link>
                    </div>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">Secured by TrustLock Escrow</p>
        <InlineLegalLinks />
      </motion.div>
    </div>
  );
};

export default VendorLogin;
