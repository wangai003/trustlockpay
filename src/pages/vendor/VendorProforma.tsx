import { useSearchParams } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import ProformaInvoice from "@/components/shared/ProformaInvoice";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";

const VendorProforma = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const rfqId = params.get("rfq") || undefined;
  const buyerName = params.get("buyer") || undefined;
  const buyerEmail = params.get("email") || undefined;
  const industry = params.get("industry") || undefined;

  return (
    <div>
      <VendorHeader title="Proforma Invoice" />
      <div className="p-3 sm:p-6 space-y-4 max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">
              Issue a formal proforma quote in response to a buyer RFQ. Industry-specific document gates are enforced before escrow can lock funds.
            </p>
          </CardContent>
        </Card>
        {user?.id && (
          <ProformaInvoice
            vendorId={user.id}
            rfqId={rfqId}
            buyerName={buyerName}
            buyerEmail={buyerEmail}
            industry={industry}
          />
        )}
      </div>
    </div>
  );
};

export default VendorProforma;
