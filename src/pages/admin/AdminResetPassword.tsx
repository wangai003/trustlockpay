import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { serverAdminReset } from "@/lib/adminAuth";

const AdminResetPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const isPasswordValid = newPassword.length >= 6;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = isPasswordValid && passwordsMatch && isEmailValid && !loading;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isPasswordValid) { setError("Password must be at least 6 characters."); return; }
    if (!passwordsMatch) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const result = await serverAdminReset(email, newPassword);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => navigate("/trustlock/admin/login"), 3000);
      } else {
        setError(result.error || "Reset failed. Please verify your email address.");
      }
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-primary mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Password Reset Successful!</h2>
              <p className="text-sm text-muted-foreground">
                Your password has been updated. Redirecting to login...
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Link to="/trustlock/admin/login" className="absolute top-4 left-4 p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">Reset Password</h1>
            <p className="text-xs text-muted-foreground">Admin Account Recovery</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reset Your Password</CardTitle>
            <CardDescription>
              Enter the email associated with your admin account and create a new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <p className={`text-[10px] ${isPasswordValid ? "text-primary" : "text-destructive"}`}>
                    {isPasswordValid ? "✓ Password strength OK" : "✗ Must be at least 6 characters"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Password Confirmation <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-[10px] ${passwordsMatch ? "text-primary" : "text-destructive"}`}>
                    {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {loading ? "Resetting..." : "Confirm & Reset Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminResetPassword;
