import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, TrendingUp, Clock, CheckCircle, DollarSign, BarChart3 } from "lucide-react";

const LenderOverview = () => {
  const isTestnet = localStorage.getItem("tl_lender_network") === "testnet";

  const stats = [
    { label: "Active Certificates", value: isTestnet ? "12" : "0", icon: Briefcase, color: "text-primary" },
    { label: "Total Exposure", value: isTestnet ? "$284,500" : "$0", icon: DollarSign, color: "text-primary" },
    { label: "Completion Rate", value: isTestnet ? "94.2%" : "—", icon: TrendingUp, color: "text-primary" },
    { label: "Avg Days-to-Release", value: isTestnet ? "18.4" : "—", icon: Clock, color: "text-muted-foreground" },
    { label: "Applications Pending", value: isTestnet ? "3" : "0", icon: BarChart3, color: "text-accent" },
    { label: "Approved This Month", value: isTestnet ? "5" : "0", icon: CheckCircle, color: "text-primary" },
  ];

  return (
    <div>
      <LenderHeader title="Overview" />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-heading font-bold text-foreground">Portfolio Dashboard</h2>
          <Badge variant="secondary" className="text-[10px]">Tier: Pending KYB</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {!isTestnet && (
          <Card>
            <CardContent className="p-8 text-center">
              <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-foreground mb-1">Complete Your Profile</h3>
              <p className="text-sm text-muted-foreground">Upload your logo and complete KYB verification to start receiving financing applications.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LenderOverview;
