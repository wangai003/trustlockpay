import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Store, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const VendorClaimAccount = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = params.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [tokenData, setTokenData] = useState<{
    valid: boolean;
    status: string;
    vendor_name: string;
    vendor_email: string;
    platform: string;
    expired: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No claim token provided.");
      setLoading(false);
      return;
    }
    lookupToken();
  }, [token]);

  const lookupToken = async () => {
    try {
      const { data, error: err } = await supabase.functions.invoke("marketplace-bridge", {
        body: { action: "lookup_token", token },
      });
      if (err || !data?.success) {
        setError(data?.error || "Invalid or expired claim token.");
      } else {
        setTokenData(data);
      }
    } catch {
      setError("Failed to validate claim token.");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!user) {
      // Redirect to signup with return URL
      navigate(`/trustlock/vendor/signup?claim=${token}`);
      return;
    }

    setClaiming(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("marketplace-bridge", {
        body: { action: "claim_vendor", token, user_id: user.id },
      });
      if (err || !data?.success) {
        setError(data?.error || "Failed to claim account.");
      } else {
        setClaimed(true);
      }
    } catch {
      setError("Failed to claim account.");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-lg">Claim Your Marketplace Account</CardTitle>
          <CardDescription className="text-xs">
            A marketplace has integrated TrustLock escrow protection on your orders. Claim your account to manage orders and receive payouts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {claimed && (
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm font-semibold">Account Claimed Successfully!</p>
              <p className="text-xs text-muted-foreground">
                Your marketplace orders are now linked to your TrustLock dashboard. Configure your payout method to start receiving funds.
              </p>
              <div className="flex flex-col gap-2">
                <Button size="sm" onClick={() => navigate("/trustlock/vendor/marketplace-orders")}>
                  View Marketplace Orders
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate("/trustlock/vendor/payout")}>
                  Configure Payout Method
                </Button>
              </div>
            </div>
          )}

          {tokenData && !claimed && (
            <div className="space-y-4">
              {tokenData.expired || tokenData.status !== "pending" ? (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription className="text-xs">
                    {tokenData.expired ? "This claim link has expired. Please contact the marketplace for a new one." : "This token has already been claimed."}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium">Marketplace Details</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Platform</p>
                        <Badge variant="outline" className="text-[10px] mt-0.5">{tokenData.platform}</Badge>
                      </div>
                      {tokenData.vendor_name && (
                        <div>
                          <p className="text-muted-foreground">Seller Name</p>
                          <p className="font-medium">{tokenData.vendor_name}</p>
                        </div>
                      )}
                      {tokenData.vendor_email && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Email</p>
                          <p className="font-medium">{tokenData.vendor_email}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold">What happens when you claim:</p>
                    <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
                      <li>All existing marketplace orders link to your dashboard</li>
                      <li>Future orders from this platform auto-appear</li>
                      <li>You can track milestones, upload documents, and manage disputes</li>
                      <li>Funds release to your configured payout method</li>
                    </ul>
                  </div>

                  {user ? (
                    <Button className="w-full gap-2" onClick={handleClaim} disabled={claiming}>
                      {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Claim Account as {user.email}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button className="w-full" onClick={handleClaim}>
                        Sign Up & Claim Account
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => navigate(`/trustlock/vendor/login?claim=${token}`)}>
                        Already have an account? Log in
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!tokenData && !error && (
            <p className="text-xs text-muted-foreground text-center">No claim data found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorClaimAccount;
