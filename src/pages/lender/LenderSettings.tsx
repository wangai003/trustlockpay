import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

const LenderSettings = () => (
  <div>
    <LenderHeader title="Settings" />
    <div className="p-4 sm:p-6">
      <Card>
        <CardContent className="p-8 text-center">
          <Settings className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">Account Settings</h3>
          <p className="text-sm text-muted-foreground">Manage your profile, update logo and website (mandatory), configure social links, notification preferences, and terms template.</p>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default LenderSettings;
