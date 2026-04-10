import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

const LenderPortfolio = () => (
  <div>
    <LenderHeader title="Portfolio" />
    <div className="p-4 sm:p-6">
      <Card>
        <CardContent className="p-8 text-center">
          <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">Escrow Certificates</h3>
          <p className="text-sm text-muted-foreground">Browse certificates with status, amounts, industries, and blockchain proof chain. Certificates will appear here when vendors link your financing to active escrow orders.</p>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default LenderPortfolio;
