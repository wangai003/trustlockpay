/**
 * SavedPayoutWallets — vendor/buyer can save multiple payout addresses (per chain + token),
 * mark one as default, and have the routing bridge strictly resolve releases / refunds / splits
 * to the saved default. Visual chrome mirrors ConnectWalletPay for consistency with OS Pay.
 *
 * NOTE: This is the receive-side address book. It does NOT send funds.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Wallet, Star, Trash2, Save, Loader2, CheckCircle2, Plus, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SavedWallet {
  id: string;
  chain: string;
  token: string;
  address: string;
  label: string | null;
  is_default: boolean;
}

interface SavedPayoutWalletsProps {
  /** Currently selected chain in the parent payout form */
  chain: string;
  /** Token to save against (defaults to USDC for stablecoin payouts) */
  token?: string;
  /** List of supported chains for the dropdown */
  supportedChains: Array<{ id: string; name: string }>;
  /** Called when the user selects a saved wallet — parent should sync its address state */
  onSelect: (address: string, chain: string) => void;
  /** Currently filled address in the parent form (so we can pre-fill the Save form) */
  currentAddress?: string;
  /** Optional className */
  className?: string;
}

const isValidEvmAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
const isValidSolanaAddress = (addr: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr.trim());
const isValidTronAddress = (addr: string) => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr.trim());

function validateAddress(addr: string, chain: string): { ok: boolean; reason?: string } {
  const a = addr.trim();
  if (!a) return { ok: false, reason: "Address is required" };
  if (chain === "solana") {
    return isValidSolanaAddress(a) ? { ok: true } : { ok: false, reason: "Invalid Solana address" };
  }
  if (chain === "tron") {
    return isValidTronAddress(a) ? { ok: true } : { ok: false, reason: "Invalid Tron address (must start with T)" };
  }
  return isValidEvmAddress(a) ? { ok: true } : { ok: false, reason: "Invalid EVM address (must be 0x + 40 hex chars)" };
}

const SavedPayoutWallets = ({
  chain,
  token = "USDC",
  supportedChains,
  onSelect,
  currentAddress,
  className,
}: SavedPayoutWalletsProps) => {
  const [wallets, setWallets] = useState<SavedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add-form state
  const [newChain, setNewChain] = useState(chain);
  const [newToken, setNewToken] = useState(token);
  const [newAddress, setNewAddress] = useState(currentAddress || "");
  const [newLabel, setNewLabel] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) { setWallets([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("saved_payout_wallets")
      .select("id,chain,token,address,label,is_default,verified_at")
      .eq("user_id", u.user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setWallets((data ?? []) as SavedWallet[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setNewChain(chain); }, [chain]);
  useEffect(() => { if (currentAddress) setNewAddress(currentAddress); }, [currentAddress]);

  // Filter to the chain currently selected in parent
  const visibleWallets = useMemo(
    () => wallets.filter((w) => w.chain === chain && w.token === token),
    [wallets, chain, token]
  );

  const handleSave = async () => {
    const v = validateAddress(newAddress, newChain);
    if (!v.ok) { toast.error(v.reason!); return; }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("Not signed in");

      // If marking default, clear any existing default for this (chain, token) first
      if (makeDefault) {
        await supabase
          .from("saved_payout_wallets")
          .update({ is_default: false })
          .eq("user_id", u.user.id)
          .eq("chain", newChain)
          .eq("token", newToken);
      }

      const { error } = await supabase
        .from("saved_payout_wallets")
        .insert({
          user_id: u.user.id,
          chain: newChain,
          token: newToken,
          address: newAddress.trim(),
          label: newLabel.trim() || null,
          is_default: makeDefault || wallets.filter(w => w.chain === newChain && w.token === newToken).length === 0,
        });
      if (error) {
        if (error.code === "23505") throw new Error("This address is already saved for this chain & token");
        throw error;
      }
      toast.success("Payout wallet saved");
      setShowAdd(false);
      setNewLabel("");
      setMakeDefault(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this saved payout address?")) return;
    const { error } = await supabase.from("saved_payout_wallets").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed");
    await load();
  };

  const handleSetDefault = async (w: SavedWallet) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    await supabase
      .from("saved_payout_wallets")
      .update({ is_default: false })
      .eq("user_id", u.user.id)
      .eq("chain", w.chain)
      .eq("token", w.token);
    const { error } = await supabase
      .from("saved_payout_wallets")
      .update({ is_default: true })
      .eq("id", w.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Default updated — routing bridge will use this address");
    await load();
  };

  return (
    <div className={cn("space-y-3 p-4 rounded-lg border-2 border-primary/30 bg-primary/5", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-foreground">Saved Payout Wallets</p>
          <Badge className="text-[8px] bg-primary/20 text-primary border-0">{token}</Badge>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-[11px] gap-1"
          onClick={() => setShowAdd((s) => !s)}
        >
          <Plus className="w-3 h-3" /> {showAdd ? "Close" : "Add"}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed flex items-start gap-1">
        <ShieldCheck className="w-3 h-3 text-primary shrink-0 mt-0.5" />
        The routing bridge strictly resolves releases, refunds and splits to your <strong className="text-foreground">default</strong> saved address for the selected chain & token. Eliminates typo risk at payout time.
      </p>

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading saved wallets…
        </div>
      ) : visibleWallets.length === 0 ? (
        <div className="p-3 rounded border border-dashed border-border bg-background/50 text-center">
          <p className="text-[11px] text-muted-foreground">No saved {token} address on {supportedChains.find(c => c.id === chain)?.name ?? chain} yet.</p>
          <p className="text-[10px] text-muted-foreground mt-1">Click <strong>Add</strong> to save one for one-click payouts.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleWallets.map((w) => (
            <div
              key={w.id}
              className={cn(
                "p-2.5 rounded border bg-background flex items-center gap-2",
                w.is_default ? "border-primary/60 ring-1 ring-primary/30" : "border-border"
              )}
            >
              <button
                type="button"
                onClick={() => { onSelect(w.address, w.chain); toast.success("Address selected"); }}
                className="flex-1 text-left min-w-0"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  {w.is_default && <Badge className="text-[8px] bg-primary text-primary-foreground border-0 gap-0.5"><Star className="w-2.5 h-2.5" /> Default</Badge>}
                  {w.verified_at && <Badge className="text-[8px] bg-emerald-500/20 text-emerald-600 border-0 gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Verified</Badge>}
                  {w.label && <span className="text-[10px] font-semibold text-foreground truncate">{w.label}</span>}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground break-all mt-0.5">{w.address}</p>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {!w.is_default && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title="Set as default"
                    onClick={() => handleSetDefault(w)}
                  >
                    <Star className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  title="Delete"
                  onClick={() => handleDelete(w.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="p-3 rounded border border-primary/40 bg-background space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Chain</Label>
              <Select value={newChain} onValueChange={setNewChain}>
                <SelectTrigger className="mt-1 h-8 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {supportedChains.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Token</Label>
              <Select value={newToken} onValueChange={setNewToken}>
                <SelectTrigger className="mt-1 h-8 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Wallet Address</Label>
            <Input
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder={newChain === "solana" ? "Enter Solana address" : newChain === "tron" ? "Enter Tron address (T…)" : "0x..."}
              className="mt-1 h-8 text-[11px] font-mono"
            />
          </div>

          <div>
            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Label (optional)</Label>
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value.slice(0, 40))}
              placeholder="e.g. Main treasury, Cold storage"
              className="mt-1 h-8 text-[11px]"
            />
          </div>

          <label className="flex items-center gap-2 text-[10px] text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={makeDefault}
              onChange={(e) => setMakeDefault(e.target.checked)}
              className="rounded border-border"
            />
            Set as default for {newToken} on {supportedChains.find(c => c.id === newChain)?.name ?? newChain}
          </label>

          <div className="flex items-start gap-1.5 p-2 rounded bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[9px] text-amber-700 dark:text-amber-400 leading-relaxed">
              Double-check the address. Blockchain transfers are <strong>irreversible</strong>. The bridge blocks saving system custodian wallets.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 text-[11px] gap-1 flex-1"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save Wallet
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-[11px]"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedPayoutWallets;
