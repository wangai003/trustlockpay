import { ReactNode } from "react";
import { Shield, Lock, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAdminVerification } from "@/hooks/useIsChief";

function getAdminAuth() {
  try {
    return JSON.parse(localStorage.getItem("tl_admin_auth") || "{}");
  } catch {
    return {};
  }
}

interface Props {
  children: ReactNode;
  pageName?: string;
}

/**
 * Chief-only gate backed by the shared `AdminVerificationProvider`. The
 * provider runs a single server verification on layout mount; this component
 * only consumes the result, so spoofing `tl_admin_auth.isChief = true` in
 * DevTools no longer grants access.
 */
const ChiefOnlyGate = ({ children, pageName = "this page" }: Props) => {
  const auth = getAdminAuth();
  const navigate = useNavigate();
  const { status, isChief } = useAdminVerification();

  if (status === "verifying") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verifying chief access…
        </div>
      </div>
    );
  }

  if (status !== "verified" || !isChief) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-destructive/40">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Restricted Access</h2>
            <p className="text-sm text-muted-foreground">
              Access to {pageName} is reserved for Chief Executive admins only and
              requires server-verified credentials. If you believe you should have
              access, contact the Chief Executive.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
              <Shield className="w-3 h-3" />
              <span>Logged in as: {auth.name || auth.username || "Unknown"}</span>
            </div>
            <Button variant="outline" onClick={() => navigate("/trustlock/admin")} className="mt-4">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default ChiefOnlyGate;
