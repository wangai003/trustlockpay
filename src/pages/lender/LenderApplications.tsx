import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

const LenderApplications = () => (
  <div>
    <LenderHeader title="Applications" />
    <div className="p-4 sm:p-6">
      <Card>
        <CardContent className="p-8 text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">Financing Applications</h3>
          <p className="text-sm text-muted-foreground">Incoming vendor financing requests will appear here. Review certificates, vendor history, uploaded documents, and itemized breakdowns before making a decision.</p>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default LenderApplications;
