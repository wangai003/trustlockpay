import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Wallet, TrendingUp, Shield, AlertTriangle, Building2,
  DollarSign, Percent, Clock, ArrowUpRight
} from "lucide-react";

interface Facility {
  id: string;
  vendor_name: string;
  approved_amount: number;
  interest_rate: number;
  tenure_days: number;
  start_date: string;
  maturity_date: string;
}

interface PortfolioData {
  total_exposure: number;
  exposure_limit: number;
  active_facilities: number;
  utilization_percent: number;
  facilities: Facility[];
}

const LenderPortfolio = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PortfolioData | null>(null);

  useEffect(() => {
    if (!user) return;
    loadPortfolioData();
  }, [user]);

  const loadPortfolioData = async () => {
    setLoading(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lender-workflow`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ action: "get_portfolio" }),
        }
      );
      const result = await resp.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        // Use default empty state
        setData({
          total_exposure: 0,
          exposure_limit: 1000000,
          active_facilities: 0,
          utilization_percent: 0,
          facilities: [],
        });
      }
    } catch (err) {
      toast.error("Failed to load portfolio data");
      setData({
        total_exposure: 0,
        exposure_limit: 1000000,
        active_facilities: 0,
        utilization_percent: 0,
        facilities: [],
      });
    }
    setLoading(false);
  };

  const getRiskColor = (utilization: number) => {
    if (utilization < 50) return "text-green-600";
    if (utilization < 80) return "text-yellow-600";
    return "text-red-600";
  };

  const exposure = data || {
    total_exposure: 0,
    exposure_limit: 1000000,
    active_facilities: 0,
    utilization_percent: 0,
  };

  const facilities = data?.facilities || [];

  return (
    <div className="min-h-screen bg-background">
      <LenderHeader title="Portfolio & Exposure" />

      <div className="p-6 space-y-6">
        {/* Exposure Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Total Exposure Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Exposure Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="space-y-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Exposure</p>
                      <p className="text-3xl font-bold">
                        ${exposure.total_exposure.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Limit</p>
                      <p className="text-xl font-semibold">
                        ${exposure.exposure_limit.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Utilization</span>
                      <span className={getRiskColor(exposure.utilization_percent)}>
                        {exposure.utilization_percent.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={exposure.utilization_percent} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Available capacity: ${(exposure.exposure_limit - exposure.total_exposure).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Facilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{exposure.active_facilities}</p>
                        <p className="text-xs text-muted-foreground">Active Facilities</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold">
                          ${facilities.reduce((sum, f) => sum + (f.approved_amount * (f.interest_rate / 100) * (f.tenure_days / 365)), 0).toFixed(0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Est. Interest Income</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-semibold">
                          {facilities.filter(f => {
                            const maturity = new Date(f.maturity_date);
                            const daysUntil = (maturity.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                            return daysUntil < 30 && daysUntil > 0;
                          }).length}
                        </p>
                        <p className="text-xs text-muted-foreground">Maturing &lt;30 Days</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Facilities List */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Active Credit Facilities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : facilities.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No active facilities</p>
                  <p className="text-sm mt-1">
                    Approved financing will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {facilities.map((facility) => {
                    const maturityDate = new Date(facility.maturity_date);
                    const daysUntil = Math.ceil((maturityDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const isMaturingSoon = daysUntil < 30;

                    return (
                      <div key={facility.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{facility.vendor_name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {facility.tenure_days} days
                              </Badge>
                              {isMaturingSoon && (
                                <Badge className="bg-yellow-500/15 text-yellow-600 text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Maturing in {daysUntil} days
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Approved</p>
                                <p className="font-semibold">${facility.approved_amount.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Interest Rate</p>
                                <p className="font-semibold">{facility.interest_rate}%</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Start Date</p>
                                <p className="font-semibold">
                                  {new Date(facility.start_date).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Maturity</p>
                                <p className={`font-semibold ${isMaturingSoon ? "text-yellow-600" : ""}`}>
                                  {maturityDate.toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <Badge className="bg-green-500/15 text-green-600">Active</Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Risk Indicators */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card className="border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Risk Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Concentration Risk</span>
                  </div>
                  <p className="text-2xl font-bold">{facilities.length > 0 ? (100 / facilities.length).toFixed(0) : 0}%</p>
                  <p className="text-xs text-muted-foreground">Max single exposure</p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Duration Risk</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {facilities.length > 0 
                      ? Math.round(facilities.reduce((sum, f) => sum + f.tenure_days, 0) / facilities.length)
                      : 0} days
                  </p>
                  <p className="text-xs text-muted-foreground">Average tenure</p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Yield</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {facilities.length > 0 
                      ? (facilities.reduce((sum, f) => sum + f.interest_rate, 0) / facilities.length).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Average rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default LenderPortfolio;
