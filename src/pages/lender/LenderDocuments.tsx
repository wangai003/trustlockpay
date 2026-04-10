import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

const LenderDocuments = () => (
  <div>
    <LenderHeader title="Documents" />
    <div className="p-4 sm:p-6">
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">Document Vault</h3>
          <p className="text-sm text-muted-foreground">KYB documents, generated financing agreements, liability contracts, and compliance records are stored here with full audit trails.</p>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default LenderDocuments;
