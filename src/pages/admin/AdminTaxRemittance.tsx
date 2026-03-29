import { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Landmark, Download, CheckCircle, Clock, AlertTriangle, Filter, DollarSign, Globe, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface TaxLedgerEntry {
  id: string;
  transaction_id: string | null;
  order_number: string | null;
  tx_id: string | null;
  tax_type: string;
  tax_jurisdiction: string;
  jurisdiction_country_code: string | null;
  tax_authority_name: string | null;
  taxable_amount: number;
  tax_rate: number;
  tax_collected: number;
  tariff_collected: number;
  total_collected: number;
  industry: string | null;
  buyer_country: string | null;
  vendor_country: string | null;
  corridor_route: string | null;
  remittance_status: string;
  remitted_at: string | null;
  remitted_by: string | null;
  remittance_reference: string | null;
  collection_period: string | null;
  fiscal_quarter: string | null;
  created_at: string;
}

const AdminTaxRemittance = () => {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterJurisdiction, setFilterJurisdiction] = useState<string>("all");
  const [filterQuarter, setFilterQuarter] = useState<string>("all");
  const [remitRef, setRemitRef] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["tax-ledger"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_ledger")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TaxLedgerEntry[];
    },
  });

  const markRemitted = useMutation({
    mutationFn: async ({ ids, reference }: { ids: string[]; reference: string }) => {
      const { error } = await supabase
        .from("tax_ledger")
        .update({
          remittance_status: "remitted",
          remitted_at: new Date().toISOString(),
          remitted_by: "admin",
          remittance_reference: reference,
          updated_at: new Date().toISOString(),
        })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-ledger"] });
      setSelectedIds([]);
      setRemitRef("");
      toast.success("Tax entries marked as remitted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = entries.filter((e) => {
    if (filterStatus !== "all" && e.remittance_status !== filterStatus) return false;
    if (filterJurisdiction !== "all" && e.tax_jurisdiction !== filterJurisdiction) return false;
    if (filterQuarter !== "all" && e.fiscal_quarter !== filterQuarter) return false;
    return true;
  });

  const jurisdictions = [...new Set(entries.map((e) => e.tax_jurisdiction))].filter(Boolean).sort();
  const quarters = [...new Set(entries.map((e) => e.fiscal_quarter))].filter(Boolean).sort().reverse();

  const totalPending = entries.filter((e) => e.remittance_status === "pending").reduce((s, e) => s + e.total_collected, 0);
  const totalRemitted = entries.filter((e) => e.remittance_status === "remitted").reduce((s, e) => s + e.total_collected, 0);
  const totalAll = entries.reduce((s, e) => s + e.total_collected, 0);

  // Group by jurisdiction for summary
  const byJurisdiction = entries.reduce((acc, e) => {
    const key = e.tax_jurisdiction || "Unknown";
    if (!acc[key]) acc[key] = { pending: 0, remitted: 0, total: 0, count: 0 };
    acc[key].total += e.total_collected;
    acc[key].count += 1;
    if (e.remittance_status === "pending") acc[key].pending += e.total_collected;
    else acc[key].remitted += e.total_collected;
    return acc;
  }, {} as Record<string, { pending: number; remitted: number; total: number; count: number }>);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const selectAllFiltered = () => {
    const pendingIds = filtered.filter((e) => e.remittance_status === "pending").map((e) => e.id);
    setSelectedIds(pendingIds);
  };

  const exportCSV = () => {
    const rows = [
      ["Date", "Order #", "Jurisdiction", "Tax Type", "Authority", "Taxable Amount", "Tax", "Tariff", "Total", "Status", "Reference", "Quarter"].join(","),
      ...filtered.map((e) =>
        [
          e.created_at?.slice(0, 10),
          e.order_number || "",
          e.tax_jurisdiction,
          e.tax_type,
          e.tax_authority_name || "",
          e.taxable_amount,
          e.tax_collected,
          e.tariff_collected,
          e.total_collected,
          e.remittance_status,
          e.remittance_reference || "",
          e.fiscal_quarter || "",
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6">
      <AdminHeader title="Tax & Tariff Remittance" subtitle="Track collected taxes by jurisdiction and manage manual remittance to authorities" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Clock className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Remittance</p>
                <p className="text-xl font-bold text-foreground">${totalPending.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Remitted</p>
                <p className="text-xl font-bold text-foreground">${totalRemitted.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <DollarSign className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">All-Time Collected</p>
                <p className="text-xl font-bold text-foreground">${totalAll.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By jurisdiction summary */}
      {Object.keys(byJurisdiction).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4" /> Obligations by Jurisdiction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(byJurisdiction).sort((a, b) => b[1].pending - a[1].pending).map(([jur, data]) => (
                <div key={jur} className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-xs text-foreground">{jur}</p>
                    <Badge variant={data.pending > 0 ? "destructive" : "secondary"} className="text-[10px]">
                      {data.count} entries
                    </Badge>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Pending:</span>
                    <span className="text-destructive font-medium">${data.pending.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Remitted:</span>
                    <span className="text-primary font-medium">${data.remitted.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm flex items-center gap-2"><Landmark className="w-4 h-4" /> Tax Ledger</CardTitle>
              <CardDescription className="text-xs">Track and mark tax collections as remitted to authorities</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs">
                <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="remitted">Remitted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterJurisdiction} onValueChange={setFilterJurisdiction}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Jurisdiction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jurisdictions</SelectItem>
                {jurisdictions.map((j) => (
                  <SelectItem key={j} value={j}>{j}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterQuarter} onValueChange={setFilterQuarter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters</SelectItem>
                {quarters.map((q) => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk remit controls */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-xs font-medium text-foreground">{selectedIds.length} selected</span>
              <Input
                placeholder="Remittance reference #"
                value={remitRef}
                onChange={(e) => setRemitRef(e.target.value)}
                className="h-8 text-xs max-w-[200px]"
              />
              <Button
                size="sm"
                className="text-xs"
                disabled={!remitRef.trim()}
                onClick={() => markRemitted.mutate({ ids: selectedIds, reference: remitRef })}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Remitted
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedIds([])}>Clear</Button>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Loading tax ledger...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Landmark className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No tax entries found</p>
              <p className="text-xs text-muted-foreground mt-1">Tax collections will appear here when transactions with taxes are processed</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-2">
                <Button variant="ghost" size="sm" className="text-[10px]" onClick={selectAllFiltered}>
                  Select all pending
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Jurisdiction</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Authority</TableHead>
                      <TableHead className="text-xs text-right">Tax</TableHead>
                      <TableHead className="text-xs text-right">Tariff</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                      <TableHead className="text-xs">Quarter</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((e) => (
                      <TableRow key={e.id} className={selectedIds.includes(e.id) ? "bg-primary/5" : ""}>
                        <TableCell>
                          {e.remittance_status === "pending" && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(e.id)}
                              onChange={() => toggleSelect(e.id)}
                              className="w-3.5 h-3.5 rounded border-border"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{e.created_at?.slice(0, 10)}</TableCell>
                        <TableCell className="text-xs font-medium">{e.tax_jurisdiction}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">{e.tax_type?.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{e.tax_authority_name || "—"}</TableCell>
                        <TableCell className="text-xs text-right">${e.tax_collected.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right">${e.tariff_collected.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right font-semibold">${e.total_collected.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{e.fiscal_quarter || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={e.remittance_status === "remitted" ? "secondary" : "destructive"}
                            className="text-[10px]"
                          >
                            {e.remittance_status === "remitted" ? "Remitted" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{e.remittance_reference || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Remittance guide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Remittance Guide</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p><strong className="text-foreground">How to remit collected taxes:</strong></p>
          <ol className="list-decimal list-inside space-y-1.5 ml-2">
            <li>Filter by jurisdiction and quarter to isolate obligations</li>
            <li>Export the filtered entries as CSV for your records</li>
            <li>Remit the total amount to the relevant tax authority via their official portal or bank transfer</li>
            <li>Select the remitted entries and enter the payment reference number</li>
            <li>Click "Mark Remitted" to update the ledger — this is permanent and auditable</li>
          </ol>
          <div className="mt-3 p-2.5 rounded bg-muted/50 border border-border">
            <p><strong className="text-foreground">Key Authorities:</strong></p>
            <ul className="mt-1 space-y-0.5">
              <li>🇳🇬 Nigeria: FIRS (Federal Inland Revenue Service) — VAT Portal</li>
              <li>🇰🇪 Kenya: KRA (Kenya Revenue Authority) — iTax</li>
              <li>🇿🇦 South Africa: SARS — eFiling</li>
              <li>🇬🇭 Ghana: GRA (Ghana Revenue Authority)</li>
              <li>🇨🇲 Cameroon: DGI (Direction Générale des Impôts)</li>
              <li>🇪🇬 Egypt: ETA (Egyptian Tax Authority)</li>
              <li>🇺🇸 US: IRS + State Revenue Departments</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTaxRemittance;
