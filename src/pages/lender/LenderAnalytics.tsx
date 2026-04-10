import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const LenderAnalytics = () => (
  <div>
    <LenderHeader title="Analytics" />
    <div className="p-4 sm:p-6">
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">Portfolio Analytics</h3>
          <p className="text-sm text-muted-foreground">Performance metrics, sector concentration, geographic exposure, and risk analysis. Analytics depth scales with your KYB tier.</p>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default LenderAnalytics;
