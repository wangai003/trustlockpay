import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Globe, Info } from "lucide-react";

/**
 * FATF Travel Rule — mandatory for crypto transactions ≥ $1,000.
 * Captures originator & beneficiary identifying information
 * per FATF Recommendation 16 / FinCEN 31 CFR § 1010.410.
 */
interface TravelRuleFormProps {
  amount: number;
  paymentMethod: string;
  onComplete: (data: TravelRuleData) => void;
  onSkip?: () => void;
}

export interface TravelRuleData {
  originator_name: string;
  originator_address: string;
  originator_country: string;
  originator_id_type: string;
  originator_id_number: string;
  beneficiary_name: string;
  beneficiary_address: string;
  beneficiary_country: string;
  beneficiary_institution?: string;
}

const CRYPTO_METHODS = ["azix", "crypto", "coinbase", "transak"];
const TRAVEL_RULE_THRESHOLD = 1000;

export const isTravelRuleRequired = (amount: number, method: string): boolean =>
  amount >= TRAVEL_RULE_THRESHOLD && CRYPTO_METHODS.includes(method);

const TravelRuleForm = ({ amount, paymentMethod, onComplete, onSkip }: TravelRuleFormProps) => {
  const [data, setData] = useState<TravelRuleData>({
    originator_name: "",
    originator_address: "",
    originator_country: "",
    originator_id_type: "passport",
    originator_id_number: "",
    beneficiary_name: "",
    beneficiary_address: "",
    beneficiary_country: "",
    beneficiary_institution: "",
  });

  const required = isTravelRuleRequired(amount, paymentMethod);

  if (!required) {
    onSkip?.();
    return null;
  }

  const isValid =
    data.originator_name.length > 1 &&
    data.originator_address.length > 3 &&
    data.originator_country.length > 1 &&
    data.originator_id_number.length > 3 &&
    data.beneficiary_name.length > 1 &&
    data.beneficiary_country.length > 1;

  const set = (field: keyof TravelRuleData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setData((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <Card className="border-2 border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="w-4 h-4 text-yellow-600" />
          FATF Travel Rule — Identity Disclosure
          <Badge variant="secondary" className="text-[10px] ml-auto">
            Mandatory &gt; $1,000
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-2.5 rounded-lg bg-muted/50 text-[10px] text-muted-foreground flex items-start gap-2">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            Under <strong>FATF Recommendation 16</strong> and <strong>FinCEN 31 CFR § 1010.410</strong>,
            crypto transactions of <strong>${TRAVEL_RULE_THRESHOLD.toLocaleString()}+</strong> require
            originator and beneficiary identification. This data is stored securely and shared only with
            regulated counterparties.
          </span>
        </div>

        {/* Originator (Sender) */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-bold text-foreground">Originator (Sender)</legend>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Full Legal Name *</Label>
              <Input className="text-xs h-8" value={data.originator_name} onChange={set("originator_name")} placeholder="Jane Doe" />
            </div>
            <div>
              <Label className="text-[10px]">Country *</Label>
              <Input className="text-xs h-8" value={data.originator_country} onChange={set("originator_country")} placeholder="Kenya" />
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Physical Address *</Label>
            <Input className="text-xs h-8" value={data.originator_address} onChange={set("originator_address")} placeholder="123 Kenyatta Ave, Nairobi" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">ID Type *</Label>
              <select
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={data.originator_id_type}
                onChange={set("originator_id_type")}
              >
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
                <option value="drivers_license">Driver's License</option>
              </select>
            </div>
            <div>
              <Label className="text-[10px]">ID Number *</Label>
              <Input className="text-xs h-8" value={data.originator_id_number} onChange={set("originator_id_number")} placeholder="A12345678" />
            </div>
          </div>
        </fieldset>

        {/* Beneficiary (Receiver) */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-bold text-foreground">Beneficiary (Receiver)</legend>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Full Legal Name *</Label>
              <Input className="text-xs h-8" value={data.beneficiary_name} onChange={set("beneficiary_name")} placeholder="Acme Corp Ltd" />
            </div>
            <div>
              <Label className="text-[10px]">Country *</Label>
              <Input className="text-xs h-8" value={data.beneficiary_country} onChange={set("beneficiary_country")} placeholder="Ghana" />
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Address</Label>
            <Input className="text-xs h-8" value={data.beneficiary_address} onChange={set("beneficiary_address")} placeholder="45 Independence Ave, Accra" />
          </div>
          <div>
            <Label className="text-[10px]">Financial Institution (if applicable)</Label>
            <Input className="text-xs h-8" value={data.beneficiary_institution} onChange={set("beneficiary_institution")} placeholder="e.g. Coinbase, GTBank" />
          </div>
        </fieldset>

        <Button className="w-full gap-2" disabled={!isValid} onClick={() => onComplete(data)}>
          <ShieldCheck className="w-4 h-4" /> Submit & Continue
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Data retained for 7 years per AML regulations. Reference: FATF R.16 / FinCEN § 1010.410
        </p>
      </CardContent>
    </Card>
  );
};

export default TravelRuleForm;
