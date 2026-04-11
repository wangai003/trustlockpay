import { useState, useCallback } from "react";
import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VendorRiskScorecard, { type RiskScoreData } from "@/components/lender/VendorRiskScorecard";

interface VendorResult {
  id: string;
  full_name: string;
  company_name: string | null;
  entity_type: string;
  industry?: string;
}

const LenderVendorLookup = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VendorResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorResult | null>(null);
  const [riskData, setRiskData] = useState<RiskScoreData | null>(null);
  const [loadingScore, setLoadingScore] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      // Search profiles that have vendor role
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, entity_type")
        .or(`full_name.ilike.%${query}%,company_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(20);

      // Filter to only vendors
      if (data && data.length > 0) {
        const vendorIds = data.map(d => d.id);
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("user_id", vendorIds)
          .eq("role", "vendor");

        const vendorSet = new Set(roles?.map(r => r.user_id) || []);
        setResults(data.filter(d => vendorSet.has(d.id)) as VendorResult[]);
      } else {
        setResults([]);
      }
    } catch {
      toast.error("Search failed");
    }
    setSearching(false);
  };

  const loadRiskScore = useCallback(async (vendor: VendorResult) => {
    setSelectedVendor(vendor);
    setLoadingScore(true);
    setRiskData(null);
    try {
      const { data, error } = await supabase.rpc("compute_vendor_risk_score", {
        _vendor_id: vendor.id,
      });
      if (error) throw error;
      setRiskData(data as unknown as RiskScoreData);
    } catch (err) {
      toast.error("Failed to compute risk score");
      console.error(err);
    }
    setLoadingScore(false);
  }, []);

  return (
    <div>
      <LenderHeader title="Vendor Lookup" />
      <div className="p-4 sm:p-6 space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors by name, company, or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={searching || !query.trim()}>
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{results.length} vendor(s) found</p>
            {results.map((v) => (
              <Card
                key={v.id}
                className={`cursor-pointer transition-shadow hover:shadow-sm ${selectedVendor?.id === v.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => loadRiskScore(v)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.company_name || v.full_name}</p>
                    <p className="text-xs text-muted-foreground">{v.entity_type} • {v.full_name}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">View Risk Score</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {results.length === 0 && !searching && query && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No vendors found matching "{query}"</p>
            </CardContent>
          </Card>
        )}

        {!query && results.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-foreground mb-1">Discover Vendors</h3>
              <p className="text-sm text-muted-foreground">Search verified vendors by name or company. View their TrustLock Risk Score computed from real escrow data.</p>
            </CardContent>
          </Card>
        )}

        {/* Risk Scorecard */}
        {loadingScore && (
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {riskData && selectedVendor && !loadingScore && (
          <VendorRiskScorecard
            data={riskData}
            vendorName={selectedVendor.company_name || selectedVendor.full_name}
            onRefresh={() => loadRiskScore(selectedVendor)}
            loading={loadingScore}
          />
        )}
      </div>
    </div>
  );
};

export default LenderVendorLookup;
