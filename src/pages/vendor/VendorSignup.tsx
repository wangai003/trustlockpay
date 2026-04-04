import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PasswordStrengthMeter, isPasswordStrong } from "@/components/shared/PasswordStrength";
import { supabase } from "@/integrations/supabase/client";
import TermsOfServiceGate, { CURRENT_TOS_VERSION } from "@/components/shared/TermsOfServiceGate";
import EntityTypeSelector, { type EntityType } from "@/components/shared/EntityTypeSelector";

const isLikelyEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

const VendorSignup = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResendMessage("");

    if (!tosAccepted) {
      setError("You must accept the Terms of Service to create an account");
      return;
    }

    if (!isPasswordStrong(password)) {
      setError("Password does not meet all strength requirements");
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, { full_name: fullName, role: "vendor" });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("already") && error.message.toLowerCase().includes("registered")) {
        setError("This email is already registered. Please sign in instead.");
      } else {
        setError(error.message);
      }
    } else {
      // Store ToS acceptance flag for recording after login
      localStorage.setItem("tl_pending_tos", JSON.stringify({
        version: CURRENT_TOS_VERSION,
        userAgent: navigator.userAgent,
        acceptedAt: new Date().toISOString(),
      }));
      // Auto-confirm is enabled, so redirect straight to dashboard
      localStorage.setItem("tl_vendor_auth", "true");
      localStorage.setItem("tl_vendor_network", "mainnet");
      navigate("/trustlock/vendor");
    }
  };

  const handleResendVerification = async () => {
    setError("");
    setResendMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!isLikelyEmail(normalizedEmail)) {
      setError("Enter a valid email to resend verification.");
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

    setResendMessage("Verification email sent. Check inbox and spam.");
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Check Your Email</h2>
          <p className="text-muted-foreground mb-6">We've sent a verification link to <strong>{email}</strong>. Click it to activate your vendor account.</p>
          {resendMessage && <p className="text-sm text-primary mb-4">{resendMessage}</p>}
          <div className="space-y-2">
            <Button onClick={handleResendVerification} variant="outline" className="w-full" disabled={resendLoading}>
              {resendLoading ? "Sending..." : "Resend verification email"}
            </Button>
            <Button onClick={() => navigate("/trustlock/vendor/login")} variant="outline" className="w-full">Back to Login</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Link to="/trustlock/vendor/login" className="absolute top-4 left-4 p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Store className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">TrustLock</h1>
            <p className="text-xs text-muted-foreground">Vendor Registration</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Vendor Account</CardTitle>
            <CardDescription>Start accepting escrow-protected payments</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name / Business Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Kente Craft Ltd" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vendor@example.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a strong password" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrengthMeter password={password} />
              </div>
              <TermsOfServiceGate accepted={tosAccepted} onAcceptChange={setTosAccepted} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !isPasswordStrong(password) || !tosAccepted}>
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Already have an account? <Link to="/trustlock/vendor/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default VendorSignup;
