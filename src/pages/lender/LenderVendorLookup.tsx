import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

const LenderVendorLookup = () => (
  <div>
    <LenderHeader title="Vendor Lookup" />
    <div className="p-4 sm:p-6">
      <Card>
        <CardContent className="p-8 text-center">
          <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">Discover Vendors</h3>
          <p className="text-sm text-muted-foreground">Search verified vendors by industry, region, and transaction history. View their escrow track record and completion rates.</p>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default LenderVendorLookup;
