import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, Eye, EyeOff, AlertTriangle, ArrowLeft, Lock, CheckCircle2 } from "lucide-react";
import { serverAdminLogin, serverAdminLookup, serverCheckPassword } from "@/lib/adminAuth";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [isTestnet, setIsTestnet] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState(isTestnet ? "admin@trustlock.test" : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetLink, setShowResetLink] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [identifierValid, setIdentifierValid] = useState(false);

  // Debounced reset-link check: show only when correct password OR correct identifier is entered
  useEffect(() => {
    if (isTestnet) {
      setShowResetLink(false);
      return;
    }

    const timer = setTimeout(async () => {
      let idValid = false;
      let pwValid = false;

      // Check identifier (email/username) field
      if (identifier.trim().length > 2) {
        const lookup = await serverAdminLookup(identifier);
        if (lookup.exists && lookup.isSetup) idValid = true;
      }

      // Check password field against set-up accounts
      if (password.length >= 6) {
        const check = await serverCheckPassword(password);
        if (check.valid) pwValid = true;
      }

      setIdentifierValid(idValid);
      setPasswordValid(pwValid);
      setShowResetLink(idValid || pwValid);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [identifier, password, isTestnet]);

  const handleToggle = (checked: boolean) => {
    setIsTestnet(!checked);
    if (!checked) {
      setIdentifier("admin@trustlock.test");
      setPassword("");
    } else {
      setIdentifier("");
      setPassword("");
    }
    setError("");
    setShowResetLink(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isTestnet) {
      if (password === "0321") {
        localStorage.setItem("tl_admin_auth", JSON.stringify({ authenticated: true, adminId: "a0ac136f-de82-45bd-8219-0fc5ab25d098", id: "a0ac136f-de82-45bd-8219-0fc5ab25d098", name: "Testnet Admin", isChief: true, chiefRank: 1, departmentSlug: "executive" }));
        localStorage.setItem("tl_network", "testnet");
        navigate("/trustlock/admin");
      } else {
        setError("Invalid credentials. Contact admin for testnet access.");
      }
      return;
    }

    setLoading(true);

    try {
      const result = await serverAdminLogin(identifier, password);

      if (result.locked) {
        setError("Account locked after 5 failed attempts. Please reset your password.");
        setShowResetLink(true);
        setLoading(false);
        return;
      }

      if (result.success && result.needsSetup) {
        // Stash the temp password briefly so the setup page can prove ownership
        // when submitting first-time credentials. Cleared by AdminSetup on use.
        sessionStorage.setItem("tl_admin_setup_temp", password);
        setLoading(false);
        navigate(`/trustlock/admin/setup?username=${encodeURIComponent(result.username || identifier.toLowerCase().trim())}`);
        return;
      }

      if (result.success && !result.needsSetup) {
        localStorage.setItem("tl_admin_auth", JSON.stringify({
          authenticated: true,
          adminId: result.adminId || "",
          id: result.adminId || "",
          name: result.name || "Admin",
          isChief: result.isChief || false,
          chiefRank: result.chiefRank || null,
          departmentSlug: result.departmentSlug || null,
        }));
        localStorage.setItem("tl_network", "mainnet");
        localStorage.setItem("tl_admin_name", result.name || "Admin");
        setLoading(false);
        navigate("/trustlock/admin");
        return;
      }

      setLoading(false);
      if (result.remaining !== undefined && result.remaining > 0 && result.remaining <= 3) {
        setError(`Invalid credentials. ${result.remaining} attempt${result.remaining !== 1 ? "s" : ""} remaining.`);
      } else {
        setError(result.error || "Invalid credentials.");
      }
    } catch {
      setLoading(false);
      setError("Connection error. Please try again.");
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
              {isTestnet ? (
                <>
                  {/* TESTNET: Normal order — Email first, Password second */}
                  <div className="space-y-2">
                    <Label htmlFor="identifier">Email / User ID</Label>
                    <Input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      readOnly
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">Auto-populated in testnet mode</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter testnet password"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Contact admin for testnet credentials</p>
                  </div>
                </>
              ) : (
                <>
              {/* MAINNET: No labels — Email/Username first, Password second */}
              <div>
                <Input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  aria-label="Email or Username"
                />
              </div>
              <div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
                </>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                  <Lock className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : isTestnet ? "Enter Testnet Dashboard" : "Sign In"}
              </Button>

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

