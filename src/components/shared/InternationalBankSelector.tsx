import { useState, useMemo } from "react";
import { Search, Building2, ChevronRight, X, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  INTERNATIONAL_REGIONS,
  searchBanksInRegion,
  type InternationalRegion,
  type RegionConfig,
} from "@/lib/internationalBankData";

interface InternationalBankSelectorProps {
  onBankSelected: (bank: string, region: InternationalRegion, fields: Record<string, string>) => void;
  selectedBank?: string | null;
  onClear?: () => void;
}

const InternationalBankSelector = ({ onBankSelected, selectedBank, onClear }: InternationalBankSelectorProps) => {
  const [selectedRegion, setSelectedRegion] = useState<InternationalRegion | null>(null);
  const [bankQuery, setBankQuery] = useState("");
  const [chosenBank, setChosenBank] = useState<string | null>(selectedBank || null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const regionConfig = useMemo(() => {
    if (!selectedRegion) return null;
    return INTERNATIONAL_REGIONS.find(r => r.key === selectedRegion) || null;
  }, [selectedRegion]);

  const filteredBanks = useMemo(() => {
    if (!selectedRegion) return [];
    return searchBanksInRegion(selectedRegion, bankQuery);
  }, [selectedRegion, bankQuery]);

  // If a bank is already selected and confirmed, show compact view
  if (selectedBank && chosenBank) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border-2 border-primary bg-primary/5">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">{chosenBank}</p>
            <p className="text-[10px] text-muted-foreground">
              {regionConfig?.label || "International"} · via {regionConfig?.processor === "stripe" ? "Stripe" : regionConfig?.processor === "coinbase" ? "Coinbase" : "Transak"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setChosenBank(null);
            setSelectedRegion(null);
            setFieldValues({});
            setBankQuery("");
            onClear?.();
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Step 1: Region selection
  if (!selectedRegion) {
    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium">Select your region</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {INTERNATIONAL_REGIONS.map(region => (
            <button
              key={region.key}
              type="button"
              onClick={() => setSelectedRegion(region.key)}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
            >
              <span className="text-base">{region.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{region.label}</p>
                <p className="text-[9px] text-muted-foreground">{region.banks.length} banks</p>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: Bank search within region
  if (!chosenBank) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <span>{regionConfig?.flag}</span> {regionConfig?.label} Banks
          </Label>
          <button
            type="button"
            onClick={() => { setSelectedRegion(null); setBankQuery(""); }}
            className="text-[10px] text-primary hover:underline"
          >
            Change region
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search your bank..."
            value={bankQuery}
            onChange={e => setBankQuery(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>

        <div className="max-h-40 overflow-y-auto space-y-0.5 rounded-lg border border-border p-1">
          {filteredBanks.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-4">No banks found for "{bankQuery}"</p>
          ) : (
            filteredBanks.map(bank => (
              <button
                key={bank}
                type="button"
                onClick={() => setChosenBank(bank)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left hover:bg-muted/60 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">{bank}</span>
              </button>
            ))
          )}
        </div>

        <p className="text-[9px] text-muted-foreground">
          Processed via <Badge variant="outline" className="text-[8px] ml-1">{regionConfig?.processor === "stripe" ? "Stripe" : regionConfig?.processor === "coinbase" ? "Coinbase" : "Transak"}</Badge>
        </p>
      </div>
    );
  }

  // Step 3: Fill in bank details
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs font-semibold text-foreground">{chosenBank}</p>
            <p className="text-[9px] text-muted-foreground">{regionConfig?.label}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setChosenBank(null); setFieldValues({}); }}
          className="text-[10px] text-primary hover:underline"
        >
          Change bank
        </button>
      </div>

      {regionConfig?.fields.map(field => (
        <div key={field.key} className="space-y-1">
          <Label className="text-[11px]">
            {field.label} {field.required && <span className="text-destructive">*</span>}
          </Label>
          {field.type === "select" && field.options ? (
            <select
              value={fieldValues[field.key] || ""}
              onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
              className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
              required={field.required}
            >
              <option value="">{field.placeholder}</option>
              {field.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <Input
              value={fieldValues[field.key] || ""}
              onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              className="h-8 text-sm"
              required={field.required}
            />
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => {
          // Validate required fields
          const missing = regionConfig?.fields.filter(f => f.required && !fieldValues[f.key]?.trim());
          if (missing && missing.length > 0) return;
          onBankSelected(chosenBank, selectedRegion, fieldValues);
        }}
        className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
      >
        <CheckCircle className="w-3.5 h-3.5" /> Confirm Bank Details
      </button>
    </div>
  );
};

export default InternationalBankSelector;
