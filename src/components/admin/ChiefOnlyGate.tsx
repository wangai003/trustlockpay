import { ReactNode, useEffect, useState } from "react";
import { Shield, Lock, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
 * Chief-only gate with server-side credential verification.
 *
 * Defense-in-depth: localStorage alone is not trusted. On mount we call
 * `verify-admin-credentials` with the stored adminId + chiefPassword. The
 * elevated UI only renders if the backend confirms the account is a real
 * chief admin. Spoofing `tl_admin_auth.isChief = true` in DevTools no longer
 * grants access because the spoofed entry lacks a valid chief password.
 */
const ChiefOnlyGate = ({ children, pageName = "this page" }: Props) => {
  const auth = getAdminAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<"verifying" | "allowed" | "denied">("verifying");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!auth?.adminId || !auth?.chiefPassword) {
        if (!cancelled) setState("denied");
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("verify-admin-credentials", {
          body: { adminId: auth.adminId, password: auth.chiefPassword },
        });
        if (cancelled) return;
        if (!error && data?.ok && data?.isChief) setState("allowed");
        else setState("denied");
      } catch {
        if (!cancelled) setState("denied");
      }
    })();
    return () => { cancelled = true; };
  }, [auth?.adminId, auth?.chiefPassword]);

  if (state === "verifying") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verifying chief access…
        </div>
      </div>
    );
  }

  if (state === "denied") {
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
