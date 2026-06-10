import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ChevronRight, GraduationCap, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readNetworkScope } from "@/lib/networkScope";
import {
  TestnetRole,
  missionsFor,
  nextIncompleteMission,
  progressPercent,
} from "@/lib/testnetMissions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  role: TestnetRole;
}

/**
 * Floating right-rail panel rendered on every testnet dashboard.
 * Hidden on mainnet and once the user has graduated.
 */
export function MissionChecklist({ role }: Props) {
  const [open, setOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [missions, setMissions] = useState<Record<string, string>>({});
  const [graduated, setGraduated] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const network = readNetworkScope();

  useEffect(() => {
    if (network !== "testnet") {
      setOpen(false);
      setLoading(false);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, network]);

  async function load() {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("testnet_onboarding")
      .select("missions, graduated_at")
      .eq("user_id", userRes.user.id)
      .eq("role", role)
      .maybeSingle();
    if (data) {
      setMissions((data.missions as Record<string, string>) ?? {});
      setGraduated(Boolean(data.graduated_at));
    }
    setLoading(false);
  }

  async function graduate() {
    const { error } = await supabase.functions.invoke("mission-progress", {
      body: { role, action: "graduate" },
    });
    if (error) {
      toast({ title: "Could not graduate", description: error.message, variant: "destructive" });
      return;
    }
    setGraduated(true);
    toast({
      title: "Testnet graduated",
      description: "You're ready for mainnet. The banner will guide you there.",
    });
  }

  if (network !== "testnet" || !open || graduated || loading) return null;

  const all = missionsFor(role);
  const next = nextIncompleteMission(role, missions);
  const pct = progressPercent(role, missions);

  return (
    <aside
      className="fixed right-3 bottom-3 z-40 w-[min(360px,calc(100vw-1.5rem))] rounded-xl border border-emerald-700/40 bg-emerald-950/95 text-emerald-50 shadow-2xl backdrop-blur"
      aria-label="Guided testnet missions"
    >
      <header className="flex items-center justify-between gap-2 border-b border-emerald-700/40 px-3 py-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex-1 text-left text-xs font-semibold uppercase tracking-wider text-emerald-300"
        >
          Guided testnet · {pct}%
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded p-1 hover:bg-emerald-800/60"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {!collapsed && (
        <div className="space-y-3 p-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-900">
            <div
              className="h-full bg-emerald-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>

          <ul className="space-y-1.5">
            {all.map((m) => {
              const done = missions[m.id] === "done";
              const current = next?.id === m.id;
              return (
                <li
                  key={m.id}
                  className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-xs ${
                    current ? "bg-emerald-800/60" : ""
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={`font-medium ${done ? "line-through opacity-60" : ""}`}>
                      {m.title}
                    </div>
                    {current && (
                      <p className="mt-0.5 text-[11px] leading-snug text-emerald-200/80">
                        {m.description}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {next ? (
            <Button
              size="sm"
              className="w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
              onClick={() => {
                if (next.href) window.location.href = next.href;
              }}
            >
              {next.cta}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full border-emerald-400 text-emerald-50 hover:bg-emerald-800"
              onClick={graduate}
            >
              <GraduationCap className="mr-1 h-4 w-4" />
              Graduate to mainnet
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}
