import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Landmark, Eye, EyeOff, ArrowLeft, CheckCircle, Globe, Facebook, Linkedin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PasswordStrengthMeter, isPasswordStrong } from "@/components/shared/PasswordStrength";
import { supabase } from "@/integrations/supabase/client";
import TermsOfServiceGate, { CURRENT_TOS_VERSION } from "@/components/shared/TermsOfServiceGate";
import EntityTypeSelector, { type EntityType } from "@/components/shared/EntityTypeSelector";
import InlineLegalLinks from "@/components/shared/InlineLegalLinks";

const isLikelyEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
const isValidUrl = (v: string) => {
  if (!v.trim()) return false;
  try { new URL(v.startsWith("http") ? v : `https://${v}`); return true; } catch { return false; }
};

const LenderSignup = () => {
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
  const [entityType, setEntityType] = useState<EntityType>("company");
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [socialX, setSocialX] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResendMessage("");

    if (!tosAccepted) { setError("You must accept the Terms of Service to create an account"); return; }
    if (!isPasswordStrong(password)) { setError("Password does not meet all strength requirements"); return; }
    if (!companyName.trim()) { setError("Please enter your institution name"); return; }
    if (!websiteUrl.trim()) { setError("Website URL is required for lender registration"); return; }
    if (!isValidUrl(websiteUrl)) { setError("Please enter a valid website URL"); return; }

    setLoading(true);
    const socialLinks: Record<string, string> = {};
    if (socialFacebook.trim()) socialLinks.facebook = socialFacebook.trim();
    if (socialLinkedin.trim()) socialLinks.linkedin = socialLinkedin.trim();
    if (socialX.trim()) socialLinks.x = socialX.trim();

    const { error } = await signUp(email, password, {
      full_name: fullName,
      role: "lender",
      entity_type: entityType,
      company_name: companyName.trim(),
      website_url: websiteUrl.trim(),
      social_links: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
    });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("already") && error.message.toLowerCase().includes("registered")) {
        setError("This email is already registered. Please sign in instead.");
      } else {
        setError(error.message);
      }
    } else {
      localStorage.setItem("tl_pending_tos", JSON.stringify({
        version: CURRENT_TOS_VERSION,
        userAgent: navigator.userAgent,
        acceptedAt: new Date().toISOString(),
      }));
      localStorage.setItem("tl_lender_network", "mainnet");
      navigate("/trustlock/lender");
    }
  };

  const handleResendVerification = async () => {
    setError(""); setResendMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!isLikelyEmail(normalizedEmail)) { setError("Enter a valid email to resend verification."); return; }
    setResendLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup", email: normalizedEmail,
      options: { emailRedirectTo: `${window.location.origin}/trustlock/lender/login` },
    });
    setResendLoading(false);
    if (error) { setError(error.message); return; }
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
          <p className="text-muted-foreground mb-6">We've sent a verification link to <strong>{email}</strong>. Click it to activate your lender account.</p>
          {resendMessage && <p className="text-sm text-primary mb-4">{resendMessage}</p>}
          <div className="space-y-2">
            <Button onClick={handleResendVerification} variant="outline" className="w-full" disabled={resendLoading}>
              {resendLoading ? "Sending..." : "Resend verification email"}
            </Button>
            <Button onClick={() => navigate("/trustlock/lender/login")} variant="outline" className="w-full">Back to Login</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Link to="/trustlock/lender/login" className="absolute top-4 left-4 p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Landmark className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">TrustLock</h1>
            <p className="text-xs text-muted-foreground">Lender Registration</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Lender Account</CardTitle>
            <CardDescription>Join the TrustLock financing network</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Contact Person Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Institutional Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@institution.com" required />
              </div>
              <EntityTypeSelector entityType={entityType} onEntityTypeChange={setEntityType} companyName={companyName} onCompanyNameChange={setCompanyName} role="vendor" />

              {/* Website (MANDATORY) & Social Links (optional) */}
              <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/20">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Website & Social
                </Label>
                <div className="space-y-2">
                  <Label htmlFor="lenderWebsite" className="text-xs">
                    Website URL <span className="text-destructive">*</span>
                  </Label>
                  <Input id="lenderWebsite" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://institution.com" className="h-8 text-sm" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Social Media (optional)</Label>
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Facebook className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input value={socialFacebook} onChange={(e) => setSocialFacebook(e.target.value)} placeholder="Facebook page URL" className="h-8 text-sm pl-8" />
                    </div>
                    <div className="relative">
                      <Linkedin className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input value={socialLinkedin} onChange={(e) => setSocialLinkedin(e.target.value)} placeholder="LinkedIn profile URL" className="h-8 text-sm pl-8" />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-bold">𝕏</span>
                      <Input value={socialX} onChange={(e) => setSocialX(e.target.value)} placeholder="X (Twitter) profile URL" className="h-8 text-sm pl-8" />
                    </div>
                  </div>
                </div>
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
                Already have an account? <Link to="/trustlock/lender/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </form>
          </CardContent>
        </Card>
        <InlineLegalLinks />
      </motion.div>
    </div>
  );
};

export default LenderSignup;
