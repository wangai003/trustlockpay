import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Receipt, Search, ShieldCheck, Clock, XCircle, Download, Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FeeRow {
  id: string;
  transaction_id: string;
  milestone_index: number;
  fee_label: string;
  amount: number;
  currency: string;
  paid_to: string | null;
  evidence_note: string | null;
  receipt_url: string | null;
  logged_by_role: string;
  verified_by_counterparty: boolean | null;
  verified_at: string | null;
  created_at: string;
}

const AdminExternalFeeAudit = () => {
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("external_fee_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (data) setFees(data as FeeRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = fees.filter(
    (f) =>
      f.fee_label.toLowerCase().includes(search.toLowerCase()) ||
      f.transaction_id.toLowerCase().includes(search.toLowerCase()) ||
      (f.paid_to || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalByStatus = {
    verified: filtered.filter((f) => f.verified_by_counterparty).length,
    pending: filtered.filter((f) => !f.verified_by_counterparty).length,
    total: filtered.reduce((s, f) => s + f.amount, 0),
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="w-4 h-4 text-accent" />
            External Fee Audit Log
          </CardTitle>
          <Badge variant="outline" className="text-[9px]">
            {filtered.length} entries · ${totalByStatus.total.toLocaleString()}
          </Badge>
        </div>
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by fee label, transaction, or entity…"
              className="pl-8 h-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          <Badge className="bg-primary/10 text-primary text-[9px] gap-1">
            <ShieldCheck className="w-3 h-3" /> {totalByStatus.verified} verified
          </Badge>
          <Badge variant="outline" className="text-[9px] gap-1">
            <Clock className="w-3 h-3" /> {totalByStatus.pending} pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No external fee entries found.</p>
        )}
        {filtered.map((f) => (
          <div
            key={f.id}
            className="flex items-start gap-2 p-2 rounded-lg border border-border bg-background"
          >
            <Receipt className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium">{f.fee_label}</span>
                <Badge variant="outline" className="text-[8px]">
                  {f.currency} {f.amount.toLocaleString()}
                </Badge>
                {f.paid_to && (
                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                    <Building2 className="w-2.5 h-2.5" /> {f.paid_to}
                  </span>
                )}
                <Badge variant="outline" className="text-[7px]">
                  by {f.logged_by_role}
                </Badge>
              </div>
              <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                TX: {f.transaction_id.slice(0, 8)}… · Milestone #{f.milestone_index + 1}
              </p>
              {f.evidence_note && (
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{f.evidence_note}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                {f.receipt_url ? (
                  <Badge className="bg-primary/15 text-primary text-[7px]">Receipt ✓</Badge>
                ) : (
                  <Badge variant="outline" className="text-[7px] text-destructive">No receipt</Badge>
                )}
                {f.verified_by_counterparty ? (
                  <Badge className="bg-primary/10 text-primary text-[7px] gap-0.5">
                    <ShieldCheck className="w-2 h-2" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[7px] text-muted-foreground gap-0.5">
                    <Clock className="w-2 h-2" /> Pending
                  </Badge>
                )}
                <span className="text-[8px] text-muted-foreground ml-auto">
                  {new Date(f.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AdminExternalFeeAudit;
