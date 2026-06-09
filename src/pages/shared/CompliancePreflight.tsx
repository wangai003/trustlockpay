import { useMemo, useState } from "react";
import VendorHeader from "@/components/vendor/VendorHeader";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";
import ComplianceDisclosure from "@/components/shared/ComplianceDisclosure";
import TravelRuleForm from "@/components/shared/TravelRuleForm";
import TransactionLimitGuard from "@/components/shared/TransactionLimitGuard";
import { checkTransactionLimits, type ProcessorId, type KycTier } from "@/lib/feeEngine";
import { toast } from "sonner";

interface CompliancePreflightProps {
  role: "buyer" | "vendor";
}

const CompliancePreflight = ({ role }: CompliancePreflightProps) => {
  const Header = role === "vendor" ? VendorHeader : BuyerHeader;
  const [amount, setAmount] = useState(1500);
  const [processor, setProcessor] = useState<ProcessorId>("stripe");
  const [kycTier, setKycTier] = useState<KycTier>("basic");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);

  const limitCheck = useMemo(
    () => checkTransactionLimits(amount, processor, kycTier, paymentMethod as any),
    [amount, processor, kycTier, paymentMethod]
  );

  return (
    <div>
      <Header title="Pre-Trade Compliance" />
      <div className="p-3 sm:p-6 space-y-4 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Compliance Pre-Flight
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Review the legal disclosures, processor limits, and (when applicable) FATF Travel Rule data
              that will be enforced before any transaction can lock funds into escrow.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Amount (USD)</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Processor</Label>
                <Select value={processor} onValueChange={(v) => setProcessor(v as ProcessorId)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="coinbase">Coinbase</SelectItem>
                    <SelectItem value="transak">Transak</SelectItem>
                    <SelectItem value="thirdweb">Thirdweb</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">KYC Tier</Label>
                <Select value={kycTier} onValueChange={(v) => setKycTier(v as KycTier)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <TransactionLimitGuard
          amount={amount}
          processorId={processor}
          kycTier={kycTier}
          limitCheck={limitCheck}
        />

        {!disclosureAccepted && (
          <ComplianceDisclosure
            amount={amount}
            paymentMethod={paymentMethod}
            userRole={role}
            onAccept={() => { setDisclosureAccepted(true); toast.success("Disclosures acknowledged"); }}
          />
        )}

        {disclosureAccepted && paymentMethod === "crypto" && amount >= 1000 && (
          <TravelRuleForm
            amount={amount}
            paymentMethod={paymentMethod}
            onComplete={() => toast.success("FATF Travel Rule data captured")}
          />
        )}
      </div>
    </div>
  );
};

export default CompliancePreflight;
