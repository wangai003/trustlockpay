import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, Globe, ArrowRight, Info, RefreshCw, Shield, TrendingDown, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import VendorHeader from "@/components/vendor/VendorHeader";
import { useTaxResolver } from "@/hooks/useTaxResolver";
import { calculateBuyerFeeDisplay, selectProcessor, PROCESSORS, type ProcessorId } from "@/lib/feeEngine";

const COUNTRY_OPTIONS = [
  { code: "NG", name: "Nigeria" }, { code: "GH", name: "Ghana" }, { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" }, { code: "TZ", name: "Tanzania" }, { code: "UG", name: "Uganda" },
  { code: "RW", name: "Rwanda" }, { code: "ET", name: "Ethiopia" }, { code: "EG", name: "Egypt" },
  { code: "MA", name: "Morocco" }, { code: "SN", name: "Senegal" }, { code: "CM", name: "Cameroon" },
  { code: "CI", name: "Côte d'Ivoire" }, { code: "BW", name: "Botswana" }, { code: "NA", name: "Namibia" },
  { code: "ZM", name: "Zambia" }, { code: "ZW", name: "Zimbabwe" }, { code: "MZ", name: "Mozambique" },
  { code: "MU", name: "Mauritius" }, { code: "AO", name: "Angola" }, { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" }, { code: "BF", name: "Burkina Faso" }, { code: "ML", name: "Mali" },
  { code: "NE", name: "Niger" }, { code: "BJ", name: "Benin" }, { code: "TG", name: "Togo" },
  { code: "SL", name: "Sierra Leone" }, { code: "GM", name: "Gambia" }, { code: "LR", name: "Liberia" },
  { code: "GN", name: "Guinea" }, { code: "BI", name: "Burundi" }, { code: "CD", name: "DR Congo" },
  { code: "LS", name: "Lesotho" }, { code: "SZ", name: "Eswatini" },
  { code: "DZ", name: "Algeria" }, { code: "TN", name: "Tunisia" }, { code: "LY", name: "Libya" },
  { code: "GA", name: "Gabon" }, { code: "DJ", name: "Djibouti" },
  { code: "US", name: "United States" }, { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" }, { code: "FR", name: "France" }, { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" }, { code: "IN", name: "India" }, { code: "CN", name: "China" },
  { code: "JP", name: "Japan" }, { code: "BR", name: "Brazil" }, { code: "AE", name: "UAE" },
  { code: "SA", name: "Saudi Arabia" }, { code: "SG", name: "Singapore" }, { code: "MX", name: "Mexico" },
].sort((a, b) => a.name.localeCompare(b.name));

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "electronics", label: "Electronics" },
  { value: "textiles", label: "Textiles" },
  { value: "food_agriculture", label: "Food & Agriculture" },
  { value: "machinery", label: "Machinery" },
  { value: "pharmaceuticals", label: "Pharmaceuticals" },
  { value: "energy_oil_gas", label: "Energy / Oil & Gas" },
  { value: "automotive", label: "Automotive" },
  { value: "chemicals", label: "Chemicals" },
  { value: "commodities", label: "Commodities" },
];

interface SimResult {
  vendorCountry: string;
  buyerCountry: string;
  amount: number;
  category: string;
  processor: ProcessorId;
  processorName: string;
  taxData: any;
  buyerDisplay: ReturnType<typeof calculateBuyerFeeDisplay>;
}

const VendorFeeSimulator = () => {
  const [vendorCountry, setVendorCountry] = useState("");
  const [buyerCountry, setBuyerCountry] = useState("");
  const [amount, setAmount] = useState("1000");
  const [category, setCategory] = useState("general");
  const [result, setResult] = useState<SimResult | null>(null);
  const { resolve, loading, error } = useTaxResolver();

  const simulate = useCallback(async () => {
    const amt = parseFloat(amount);
    if (!vendorCountry || !buyerCountry || !amt || amt <= 0) return;

    const taxData = await resolve(buyerCountry, vendorCountry, amt, undefined, category);
    const processorId = selectProcessor(buyerCountry, false) as ProcessorId;
    const taxTotal = taxData?.summary?.total_tax ?? 0;
    const buyerDisplay = calculateBuyerFeeDisplay(amt, processorId, taxTotal);

    setResult({
      vendorCountry,
      buyerCountry,
      amount: amt,
      category,
      processor: processorId,
      processorName: PROCESSORS[processorId]?.name ?? "Direct",
      taxData,
      buyerDisplay,
    });
  }, [vendorCountry, buyerCountry, amount, category, resolve]);

  const vName = COUNTRY_OPTIONS.find(c => c.code === vendorCountry)?.name;
  const bName = COUNTRY_OPTIONS.find(c => c.code === buyerCountry)?.name;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <VendorHeader title="Fee Corridor Simulator" />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="w-4 h-4 text-primary" />
            Configure Scenario
          </CardTitle>
          <CardDescription className="text-xs">Select countries, amount, and product category to see full fee breakdown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Your Country (Vendor)</label>
              <Select value={vendorCountry} onValueChange={setVendorCountry}>
                <SelectTrigger><SelectValue placeholder="Select vendor country" /></SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Buyer Country</label>
              <Select value={buyerCountry} onValueChange={setBuyerCountry}>
                <SelectTrigger><SelectValue placeholder="Select buyer country" /></SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Deal Amount (USD)</label>
              <Input type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} placeholder="1000" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Product Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={simulate} disabled={loading || !vendorCountry || !buyerCountry} className="w-full sm:w-auto">
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            Simulate Fees
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="p-4 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          {/* Corridor Header */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <Globe className="w-4 h-4 text-primary" />
                <span className="font-semibold">{vName}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-semibold">{bName}</span>
                {result.taxData?.summary?.bloc && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    {result.taxData.summary.bloc} — Reduced Tariffs
                  </Badge>
                )}
                {result.taxData?.summary?.is_domestic && (
                  <Badge variant="outline" className="ml-2 text-[10px]">Domestic</Badge>
                )}
                {result.taxData?.summary?.de_minimis_applied && (
                  <Badge variant="outline" className="ml-2 text-[10px] text-primary border-primary/30">De Minimis — Duties Waived</Badge>
                )}
              </div>
              {result.taxData?.notes && (
                <p className="text-xs text-muted-foreground mt-2">{result.taxData.notes}</p>
              )}
            </CardContent>
          </Card>

          {/* Buyer Cost Preview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                What Your Buyer Sees at Checkout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (Deal Amount)</span>
                <span className="font-semibold">${result.amount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{result.buyerDisplay.transactionFeeLabel}</span>
                <span>${result.buyerDisplay.transactionFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{result.buyerDisplay.taxesAndDutiesLabel}</span>
                <span>${result.buyerDisplay.taxesAndDuties.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  {result.buyerDisplay.escrowServiceFeeLabel}
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3 h-3" /></TooltipTrigger>
                    <TooltipContent className="max-w-[200px] text-xs">{result.buyerDisplay.escrowServiceFeeNote}</TooltipContent>
                  </Tooltip>
                </span>
                <span className="text-muted-foreground text-xs">${result.buyerDisplay.escrowServiceFee.toFixed(2)} (deferred)</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total Buyer Charge</span>
                <span className="text-primary">${result.buyerDisplay.totalBuyerCharge.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Tax & Tariff Breakdown */}
          {result.taxData?.items?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tax & Tariff Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 text-xs">
                  {result.taxData.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center py-1 border-b border-border/30 last:border-0">
                      <div>
                        <span className="font-medium">{item.label}</span>
                        {item.notes && <p className="text-muted-foreground text-[10px]">{item.notes}</p>}
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">${item.amount.toFixed(2)}</span>
                        <span className="text-muted-foreground ml-1">({item.value}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vendor Net */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold">You Receive (After Escrow Fee)</p>
                  <p className="text-[10px] text-muted-foreground">1% escrow service fee deducted at deal completion — never upfront</p>
                </div>
                <span className="text-xl font-bold text-primary">${(result.amount * 0.99).toFixed(2)}</span>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">
                Processor: <Badge variant="outline" className="text-[10px] ml-1">{result.processorName}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VendorFeeSimulator;
