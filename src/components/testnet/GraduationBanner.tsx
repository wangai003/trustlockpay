import { useEffect, useState } from "react";
import { GraduationCap, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readNetworkScope } from "@/lib/networkScope";
import { TestnetRole, progressPercent } from "@/lib/testnetMissions";

interface Props {
  role: TestnetRole;
}

/**
 * Soft nudge banner shown on MAINNET portals when the user has not yet
 * completed testnet missions for this role. Dismissible per-session.
 */
export function GraduationBanner({ role }: Props) {
  const [show, setShow] = useState(false);
  const [pct, setPct] = useState(0);
  const network = readNetworkScope();

  useEffect(() => {
    if (network === "testnet") return;
    if (sessionStorage.getItem(`tl_grad_banner_${role}`) === "dismissed") return;
    void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, network]);

  async function check() {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return;
    const { data } = await supabase
      .from("testnet_onboarding")
      .select("missions, graduated_at")
      .eq("user_id", userRes.user.id)
      .eq("role", role)
      .maybeSingle();
    if (!data || data.graduated_at) return;
    setPct(progressPercent(role, (data.missions as Record<string, string>) ?? {}));
    setShow(true);
  }

  function dismiss() {
    sessionStorage.setItem(`tl_grad_banner_${role}`, "dismissed");
    setShow(false);
  }

  if (network === "testnet" || !show) return null;

  return (
    <div className="flex items-center gap-3 border-b border-emerald-700/40 bg-emerald-900/60 px-3 py-2 text-xs text-emerald-100">
      <GraduationCap className="h-4 w-4 flex-shrink-0 text-emerald-300" />
      <p className="flex-1 leading-snug">
        Practice on testnet first — your guided missions are {pct}% complete.{" "}
        <span className="opacity-70">
          Sign out and use the testnet login route to continue.
        </span>
      </p>
      <button
        onClick={dismiss}
        className="rounded p-1 hover:bg-emerald-800/60"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
