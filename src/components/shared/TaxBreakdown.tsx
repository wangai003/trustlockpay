import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Plus, X, Info, Loader2, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTaxResolver } from "@/hooks/useTaxResolver";

export interface TaxLineItem {
  id: string;
  label: string;
  type: "percentage" | "fixed";
  value: number;
}

const PRESET_TAXES: { label: string; type: "percentage" | "fixed"; value: number; category: string }[] = [
  { label: "VAT", type: "percentage", value: 7.5, category: "standard" },
  { label: "Sales Tax", type: "percentage", value: 0, category: "standard" },
  { label: "GST", type: "percentage", value: 15, category: "standard" },
  { label: "Import Duty", type: "percentage", value: 0, category: "trade" },
  { label: "Customs Tariff", type: "percentage", value: 0, category: "trade" },
  { label: "Excise Duty", type: "percentage", value: 0, category: "trade" },
  { label: "Withholding Tax", type: "percentage", value: 0, category: "trade" },
  { label: "Stamp Duty", type: "fixed", value: 0, category: "trade" },
  { label: "Environmental Levy", type: "percentage", value: 0, category: "trade" },
  { label: "Port Handling Fee", type: "fixed", value: 0, category: "logistics" },
  { label: "Inspection Fee", type: "fixed", value: 0, category: "logistics" },
  { label: "Clearing Agent Fee", type: "fixed", value: 0, category: "logistics" },
];

interface TaxBreakdownProps {
  subtotal: number;
  taxItems: TaxLineItem[];
  onTaxItemsChange: (items: TaxLineItem[]) => void;
  editable?: boolean;
  compact?: boolean;
  currencySymbol?: string;
  /** Pass buyer country code (e.g. "NG") to enable auto-detection */
  buyerCountry?: string;
  /** Pass vendor country code (e.g. "US") to enable auto-detection */
  vendorCountry?: string;
  /** Industry key for industry-specific tariff rules */
  industry?: string;
  /** Item category for tariff multipliers */
  itemCategory?: string;
}

const TaxBreakdown = ({
  subtotal,
  taxItems,
  onTaxItemsChange,
  editable = true,
  compact = false,
  currencySymbol = "$",
  buyerCountry,
  vendorCountry,
  industry,
  itemCategory,
}: TaxBreakdownProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [autoNotes, setAutoNotes] = useState<string>("");
  const [deMinimisApplied, setDeMinimisApplied] = useState(false);
  const [blocName, setBlocName] = useState<string | null>(null);
  const { resolve, loading: taxLoading } = useTaxResolver();
  const lastResolveKey = useRef("");

  // Auto-resolve taxes when country/amount info changes
  useEffect(() => {
    if (!buyerCountry && !vendorCountry) return;
    if (subtotal <= 0) return;

    const key = `${buyerCountry}-${vendorCountry}-${Math.round(subtotal)}-${industry}-${itemCategory}`;
    if (key === lastResolveKey.current) return;
    lastResolveKey.current = key;

    resolve(buyerCountry ?? "", vendorCountry ?? "", subtotal, industry, itemCategory).then((res) => {
      if (!res || !res.items?.length) {
        if (res?.summary?.de_minimis_applied) {
          setDeMinimisApplied(true);
          setAutoNotes(res.notes);
        }
        return;
      }

      // Convert resolved items to TaxLineItems (only add new auto items, preserve manual ones)
      const manualItems = taxItems.filter((t) => !(t as any)._auto);
      const autoItems: TaxLineItem[] = res.items.map((item: any) => ({
        id: item.id,
        label: item.label,
        type: item.type,
        value: item.value,
        _auto: true,
      }));

      onTaxItemsChange([...autoItems, ...manualItems]);
      setAutoNotes(res.notes);
      setDeMinimisApplied(res.summary.de_minimis_applied ?? false);
      setBlocName(res.summary.bloc ?? null);
      setExpanded(true);
    });
  }, [buyerCountry, vendorCountry, subtotal, industry, itemCategory]);

  const calcAmount = (item: TaxLineItem) =>
    item.type === "percentage" ? subtotal * (item.value / 100) : item.value;

  const totalTax = taxItems.reduce((sum, item) => sum + calcAmount(item), 0);

  const addPreset = (preset: typeof PRESET_TAXES[number]) => {
    const exists = taxItems.some((t) => t.label === preset.label);
    if (exists) return;
    onTaxItemsChange([
      ...taxItems,
      { id: crypto.randomUUID(), label: preset.label, type: preset.type, value: preset.value },
    ]);
    setShowPresets(false);
  };

  const addCustom = () => {
    onTaxItemsChange([
      ...taxItems,
      { id: crypto.randomUUID(), label: "Custom Fee", type: "fixed", value: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    onTaxItemsChange(taxItems.filter((t) => t.id !== id));
  };

  const updateItem = (id: string, field: keyof TaxLineItem, val: string | number) => {
    onTaxItemsChange(
      taxItems.map((t) => (t.id === id ? { ...t, [field]: val } : t))
    );
  };

  if (compact && taxItems.length === 0 && !editable) return null;

  return (
    <div className="space-y-1">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-xs group"
      >
        <span className="text-muted-foreground flex items-center gap-1">
          <Info className="w-3 h-3" />
          Taxes & Duties
          {taxLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
          {(buyerCountry || vendorCountry) && !taxLoading && (
            <Zap className="w-3 h-3 text-primary" />
          )}
          {taxItems.length > 0 && (
            <span className="text-foreground font-semibold ml-1">
              ({taxItems.length} item{taxItems.length > 1 ? "s" : ""})
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <span className={cn("font-semibold", totalTax > 0 ? "text-foreground" : "text-muted-foreground")}>
            {totalTax > 0 ? `${currencySymbol}${totalTax.toFixed(2)}` : "None"}
          </span>
          {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 p-2.5 rounded-lg border border-border bg-muted/30">
          {/* Smart detection notice */}
          {autoNotes && (
            <div className="flex items-start gap-1.5 p-2 rounded-md bg-primary/5 border border-primary/10">
              <Zap className="w-3 h-3 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-foreground leading-relaxed">{autoNotes}</p>
            </div>
          )}

          {deMinimisApplied && (
            <div className="flex items-start gap-1.5 p-2 rounded-md bg-accent/30 border border-accent/20">
              <Info className="w-3 h-3 text-accent-foreground shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <strong>De minimis exemption:</strong> Transaction amount is below the import duty threshold — tariffs waived.
              </p>
            </div>
          )}

          {blocName && (
            <div className="flex items-start gap-1.5 p-2 rounded-md bg-accent/30 border border-accent/20">
              <Info className="w-3 h-3 text-accent-foreground shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <strong>{blocName} trade bloc</strong> detected — preferential tariff rates applied.
              </p>
            </div>
          )}

          {/* Existing tax items */}
          {taxItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              {editable ? (
                <>
                  <Input
                    value={item.label}
                    onChange={(e) => updateItem(item.id, "label", e.target.value)}
                    className="h-7 text-xs flex-1 min-w-0"
                  />
                  <select
                    value={item.type}
                    onChange={(e) => updateItem(item.id, "type", e.target.value)}
                    className="h-7 text-xs rounded-md border border-input bg-background px-1.5"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">{currencySymbol}</option>
                  </select>
                  <Input
                    type="number"
                    value={item.value || ""}
                    onChange={(e) => updateItem(item.id, "value", parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs w-16"
                    placeholder="0"
                  />
                  <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                    {currencySymbol}{calcAmount(item).toFixed(2)}
                  </span>
                  <button onClick={() => removeItem(item.id)} className="text-destructive hover:text-destructive/80">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground flex-1">{item.label}</span>
                  <span className="text-xs text-foreground font-medium">
                    {item.type === "percentage" ? `${item.value}%` : ""} {currencySymbol}{calcAmount(item).toFixed(2)}
                  </span>
                </>
              )}
            </div>
          ))}

          {/* Add buttons */}
          {editable && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[10px] gap-1 px-2"
                onClick={() => setShowPresets(!showPresets)}
              >
                <Plus className="w-3 h-3" /> Preset
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] gap-1 px-2"
                onClick={addCustom}
              >
                <Plus className="w-3 h-3" /> Custom
              </Button>
            </div>
          )}

          {/* Preset picker */}
          {showPresets && editable && (
            <div className="space-y-1 p-2 rounded-md border border-border bg-background">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Standard</p>
              <div className="flex flex-wrap gap-1">
                {PRESET_TAXES.filter((p) => p.category === "standard").map((p) => (
                  <button
                    key={p.label}
                    onClick={() => addPreset(p)}
                    disabled={taxItems.some((t) => t.label === p.label)}
                    className="text-[10px] px-2 py-1 rounded-md bg-muted hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-1">Trade & Export</p>
              <div className="flex flex-wrap gap-1">
                {PRESET_TAXES.filter((p) => p.category === "trade").map((p) => (
                  <button
                    key={p.label}
                    onClick={() => addPreset(p)}
                    disabled={taxItems.some((t) => t.label === p.label)}
                    className="text-[10px] px-2 py-1 rounded-md bg-muted hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-1">Logistics</p>
              <div className="flex flex-wrap gap-1">
                {PRESET_TAXES.filter((p) => p.category === "logistics").map((p) => (
                  <button
                    key={p.label}
                    onClick={() => addPreset(p)}
                    disabled={taxItems.some((t) => t.label === p.label)}
                    className="text-[10px] px-2 py-1 rounded-md bg-muted hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          {taxItems.length > 0 && (
            <div className="flex justify-between text-xs border-t border-border pt-1.5 mt-1">
              <span className="font-semibold text-muted-foreground">Total Taxes & Duties</span>
              <span className="font-bold text-foreground">{currencySymbol}{totalTax.toFixed(2)}</span>
            </div>
          )}

          {taxItems.length === 0 && !taxLoading && (
            <p className="text-[10px] text-muted-foreground text-center py-1">
              {(buyerCountry || vendorCountry)
                ? "No applicable taxes detected for this corridor. Add manually if needed."
                : "No taxes or duties added. Tap a preset or add a custom line item."}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TaxBreakdown;
