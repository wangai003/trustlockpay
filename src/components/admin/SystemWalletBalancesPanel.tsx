import { useEffect, useState } from "react";
import { Wallet, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WalletInfo {
  key: string;
  label: string;
  purpose: string;
  address: string;
  configured: boolean;
  balances: { matic: number; usdc: number; usdt: number };
}

interface Snapshot {
  wallets: WalletInfo[];
  maticUsd: number;
  fetchedAt: string;
}

const fmt = (n: number, d = 4) => (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: d });
const short = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

const SystemWalletBalancesPanel = () => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("system-wallet-balances", { body: {} });
      if (error) throw error;
      setData(data as Snapshot);
    } catch (e: any) {
      toast.error("Failed to load wallet balances", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success("Address copied");
  };

  const totalMatic = data?.wallets.reduce((s, w) => s + (w.balances?.matic || 0), 0) || 0;
  const totalUsdc = data?.wallets.reduce((s, w) => s + (w.balances?.usdc || 0), 0) || 0;
  const relayer = data?.wallets.find((w) => w.key === "relayer");
  const lowGas = relayer && relayer.configured && relayer.balances.matic < 5;

  return (
    <div className="border-b border-border bg-muted/30 backdrop-blur-sm">
      <div className="px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          <Wallet className="w-4 h-4" />
          <span>System Wallets</span>
          {lowGas && (
            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 gap-1">
              <AlertTriangle className="w-3 h-3" /> Relayer Low
            </Badge>
          )}
          <span className="hidden sm:inline text-muted-foreground font-normal">
            · {fmt(totalMatic, 2)} MATIC · {fmt(totalUsdc, 2)} USDC
          </span>
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <div className="flex items-center gap-2">
          {data && (
            <span className="hidden md:inline text-[10px] text-muted-foreground">
              Updated {new Date(data.fetchedAt).toLocaleTimeString()}
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={load} disabled={loading} title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {open && (
        <div className="px-4 sm:px-6 pb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {data?.wallets.map((w) => {
            const low = w.key === "relayer" && w.configured && w.balances.matic < 5;
            return (
              <div
                key={w.key}
                className={`rounded-md border p-2.5 bg-background/60 ${low ? "border-destructive/50" : "border-border"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground">{w.label}</span>
                  {!w.configured && (
                    <Badge variant="outline" className="text-[8px] h-4 px-1">Unconfigured</Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-tight">{w.purpose}</p>
                {w.configured && (
                  <>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-muted-foreground">
                      <span>{short(w.address)}</span>
                      <button onClick={() => copy(w.address)} className="hover:text-primary">
                        <Copy className="w-3 h-3" />
                      </button>
                      <a
                        href={`https://polygonscan.com/address/${w.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-primary"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                      <div className={`rounded p-1 ${low ? "bg-destructive/10" : "bg-muted/50"}`}>
                        <div className="text-[9px] text-muted-foreground">MATIC</div>
                        <div className="text-[11px] font-bold text-foreground">{fmt(w.balances.matic, 3)}</div>
                      </div>
                      <div className="rounded p-1 bg-muted/50">
                        <div className="text-[9px] text-muted-foreground">USDC</div>
                        <div className="text-[11px] font-bold text-foreground">{fmt(w.balances.usdc, 2)}</div>
                      </div>
                      <div className="rounded p-1 bg-muted/50">
                        <div className="text-[9px] text-muted-foreground">USDT</div>
                        <div className="text-[11px] font-bold text-foreground">{fmt(w.balances.usdt, 2)}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SystemWalletBalancesPanel;
