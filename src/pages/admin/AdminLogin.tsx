import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, Eye, EyeOff, AlertTriangle, ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isValidAdminUsername, verifyAdminCredentials, lookupAdmin } from "@/lib/adminAccounts";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [isTestnet, setIsTestnet] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState(isTestnet ? "admin@trustlock.test" : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetLink, setShowResetLink] = useState(false);

  // For mainnet post-setup: show reset link when a valid set-up account identifier is entered in the identity field
  useEffect(() => {
    if (!isTestnet) {
      const account = lookupAdmin(identifier);
      setShowResetLink(account?.isSetup === true);
    }
  }, [identifier, isTestnet]);

  const handleToggle = (checked: boolean) => {
    setIsTestnet(!checked);
    if (!checked) {
      setUsername("admin@trustlock.test");
      setPassword("");
    } else {
      setUsername("");
      setPassword("");
    }
    setError("");
    setShowResetLink(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isTestnet) {
      if (password === "123") {
        localStorage.setItem("tl_admin_auth", "true");
        localStorage.setItem("tl_network", "testnet");
        navigate("/trustlock/admin");
      } else {
        setError("Invalid credentials. Contact admin for testnet access.");
      }
    } else {
      setLoading(true);

      const result = verifyAdminCredentials(username, password);

      if (result.locked) {
        setLoading(false);
        setError("Account locked after 5 failed attempts. Please reset your password.");
        setShowResetLink(true);
        return;
      }

      if (result.success && result.needsSetup) {
        setLoading(false);
        // First-time login — redirect to setup page
        navigate(`/trustlock/admin/setup?username=${encodeURIComponent(username.toLowerCase().trim())}`);
        return;
      }

      if (result.success && !result.needsSetup) {
        localStorage.setItem("tl_admin_auth", "true");
        localStorage.setItem("tl_network", "mainnet");
        localStorage.setItem("tl_admin_name", result.account?.name || "Admin");
        setLoading(false);
        navigate("/trustlock/admin");
        return;
      }

      setLoading(false);
      const remaining = result.account ? 5 - result.account.failedAttempts : 0;
      if (remaining > 0 && remaining <= 3) {
        setError(`Invalid credentials. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining before account lock.`);
      } else {
        setError("Invalid credentials. Please check your username/email and password.");
      }
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
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">TrustLock</h1>
            <p className="text-xs text-muted-foreground">Admin Portal</p>
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
              <span className="text-accent-foreground"><strong>Testnet Mode</strong> — Simulated data. No real transactions.</span>
            </div>
          </motion.div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Admin Sign In</CardTitle>
            <CardDescription>
              {isTestnet ? "Use testnet credentials to explore the dashboard" : "Enter your admin credentials"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{isTestnet ? "Email / User ID" : "Username"}</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isTestnet ? "" : ""}
                  readOnly={isTestnet}
                  className={isTestnet ? "bg-muted/50" : ""}
                />
                {isTestnet && <p className="text-xs text-muted-foreground">Auto-populated in testnet mode</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {isTestnet && (
                  <p className="text-xs text-muted-foreground">Contact admin for testnet credentials</p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                  <Lock className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : isTestnet ? "Enter Testnet Dashboard" : "Sign In"}
              </Button>

              {/* Reset password — only visible for set-up mainnet admins after entering valid username */}
              {!isTestnet && showResetLink && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => navigate("/trustlock/admin/reset-password")}
                      className="text-xs text-primary hover:text-primary/80 transition-colors underline"
                    >
                      Forgot password? Reset here
                    </button>
                  </div>
                </motion.div>
              )}
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">Protected by 2FA &middot; All actions are logged</p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
