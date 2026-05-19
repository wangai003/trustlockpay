import { ReactNode } from "react";
import { Shield, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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
 * Hard client-side gate for chief-only admin pages.
 * Defense-in-depth alongside sidebar filtering and server-side checks.
 * Pairs with CHIEF_ONLY_MODULES policy in AdminSidebar.tsx.
 */
const ChiefOnlyGate = ({ children, pageName = "this page" }: Props) => {
  const auth = getAdminAuth();
  const navigate = useNavigate();

  if (auth.isChief !== true) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-destructive/40">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Restricted Access</h2>
            <p className="text-sm text-muted-foreground">
              Access to {pageName} is reserved for Chief Executive admins only.
              If you believe you should have access, contact the Chief Executive.
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
