import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminVerification {
  verified: boolean;
  isChief: boolean;
  chiefRank: number | null;
  departmentSlug: string | null;
  adminId: string | null;
  status: "verifying" | "verified" | "failed";
}

const Ctx = createContext<AdminVerification | null>(null);

function readAuth() {
  try { return JSON.parse(localStorage.getItem("tl_admin_auth") || "{}"); }
  catch { return {}; }
}

/**
 * Server-verifies the admin's locally-stored credentials against the backend.
 * The result is shared via React context so child components never need to
 * read `isChief` from localStorage (which is trivially spoofable). On
 * verification failure, the admin session is cleared and the caller should
 * redirect to login.
 */
export const AdminVerificationProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AdminVerification>({
    verified: false,
    isChief: false,
    chiefRank: null,
    departmentSlug: null,
    adminId: null,
    status: "verifying",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const auth = readAuth();
      const adminId = auth?.adminId || auth?.id;
      const password = sessionStorage.getItem("tl_admin_session_pw");
      if (!adminId || !password) {
        if (!cancelled) setState(s => ({ ...s, status: "failed" }));
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("verify-admin-credentials", {
          body: { adminId, password },
        });
        if (cancelled) return;
        if (!error && data?.ok) {
          setState({
            verified: true,
            isChief: !!data.isChief,
            chiefRank: data.chiefRank ?? null,
            departmentSlug: data.departmentSlug ?? null,
            adminId,
            status: "verified",
          });
          // Sync localStorage with authoritative server values so downstream
          // sidebar ACLs stay consistent even if the local copy was stale.
          try {
            localStorage.setItem("tl_admin_auth", JSON.stringify({
              ...auth,
              isChief: !!data.isChief,
              chiefRank: data.chiefRank ?? null,
              departmentSlug: data.departmentSlug ?? null,
            }));
          } catch { /* ignore */ }
        } else {
          setState(s => ({ ...s, status: "failed" }));
        }
      } catch {
        if (!cancelled) setState(s => ({ ...s, status: "failed" }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
};

export const useAdminVerification = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminVerification must be used within AdminVerificationProvider");
  return ctx;
};

/** Convenience: server-verified chief flag. Returns false until verified. */
export const useIsChief = () => useAdminVerification().isChief;
