import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Eye, Download, Clock, Lock, AlertTriangle, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-audit`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface AuditSession {
  id: string;
  auditor_name: string;
  allowed_tables: string[];
  can_export: boolean;
  expires_at: string;
}

const TABLE_LABELS: Record<string, string> = {
  transactions: "Transactions",
  disputes: "Disputes",
  compliance_flags: "Compliance Flags",
  kyc_queue: "KYC Queue",
  payouts: "Payouts",
  payout_requests: "Payout Requests",
  order_carbon_copies: "Order Carbon Copies",
  tax_ledger: "Tax & Tariff Collections",
};

const AuditPortal = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<AuditSession | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("");
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  const [loadingTable, setLoadingTable] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const [partyFilterActive, setPartyFilterActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const callAudit = async (body: Record<string, unknown>) => {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: API_KEY },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  // Validate token on mount
  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      const result = await callAudit({ action: "validate", token });
      if (result.needs_password) {
        setNeedsPassword(true);
        setLoading(false);
        return;
      }
      if (result.valid) {
        setSession(result.session);
        setActiveTab(result.session.allowed_tables[0] || "");
      } else {
        setError(result.error || "Invalid audit link");
      }
      setLoading(false);
    })();
  }, [token]);

  const handlePasswordSubmit = async () => {
    setLoading(true);
    const result = await callAudit({ action: "validate", token, password });
    if (result.valid) {
      setSession(result.session);
      setNeedsPassword(false);
      setActiveTab(result.session.allowed_tables[0] || "");
    } else {
      toast.error(result.error || "Incorrect password");
    }
    setLoading(false);
  };

  const fetchTableData = useCallback(async (tableName: string) => {
    if (!session) return;
    setLoadingTable(true);
    const result = await callAudit({ action: "fetch_data", token, table: tableName });
    if (result.data) {
      setTableData((prev) => ({ ...prev, [tableName]: result.data }));
    }
    setLoadingTable(false);
    setLastRefresh(new Date());
  }, [session, token]);

  // Fetch table data when tab changes
  useEffect(() => {
    if (!session || !activeTab) return;
    fetchTableData(activeTab);
  }, [activeTab, session, fetchTableData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!session || !activeTab) return;
    intervalRef.current = setInterval(() => {
      fetchTableData(activeTab);
    }, 5 * 60 * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [session, activeTab, fetchTableData]);

  const handleManualRefresh = async () => {
    if (!activeTab) return;
    setRefreshing(true);
    await fetchTableData(activeTab);
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  const exportCSV = (tableName: string) => {
    const data = tableData[tableName];
    if (!data?.length) return;
    const headers = Object.keys(data[0]);
    const csv = [
      `"AUDIT EXPORT — ${session?.auditor_name} — ${new Date().toISOString()}"`,
      headers.join(","),
      ...data.map((row) => headers.map((h) => `"${row[h] ?? ""}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_${tableName}_${Date.now()}.csv`;
    a.click();
    toast.success("Export downloaded (watermarked)");
  };

  // ── Error state ──
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Access Denied</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Password required ──
  if (needsPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Lock className="w-10 h-10 text-primary mx-auto mb-2" />
            <CardTitle>Audit Portal Access</CardTitle>
            <p className="text-sm text-muted-foreground">Enter the password provided by TrustLock administration</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Access password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
            />
            <Button className="w-full" onClick={handlePasswordSubmit}>
              Access Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main portal ──
  if (!session) return null;

  const daysLeft = Math.max(0, Math.ceil((new Date(session.expires_at).getTime() - Date.now()) / 86400000));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold">TrustLock Audit Portal</h1>
              <p className="text-xs text-muted-foreground">Read-Only Regulatory Access</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1">
              <Eye className="w-3 h-3" /> {session.auditor_name}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Clock className="w-3 h-3" /> {daysLeft}d remaining
            </Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Eye className="w-3 h-3" />
              <span>All data on this portal is read-only. No modifications can be made.</span>
              {session.can_export && (
                <Badge variant="outline" className="ml-auto text-[10px]">Exports enabled</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto">
            {session.allowed_tables.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs">
                {TABLE_LABELS[t] || t}
              </TabsTrigger>
            ))}
          </TabsList>

          {session.allowed_tables.map((tableName) => (
            <TabsContent key={tableName} value={tableName}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">{TABLE_LABELS[tableName] || tableName}</CardTitle>
                  <div className="flex items-center gap-2">
                    {lastRefresh && (
                      <span className="text-[10px] text-muted-foreground">
                        Updated {lastRefresh.toLocaleTimeString()}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={handleManualRefresh}
                      disabled={refreshing}
                      title="Refresh data"
                    >
                      <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {tableData[tableName]?.length ?? 0} records
                    </span>
                    {session.can_export && tableData[tableName]?.length > 0 && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => exportCSV(tableName)}>
                        <Download className="w-3 h-3" /> Export CSV
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Tax Ledger: Party Search Filter */}
                  {tableName === "tax_ledger" && (
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Search className="w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search by vendor or buyer name..."
                        className="h-7 text-xs max-w-xs"
                        value={partySearch}
                        onChange={(e) => {
                          setPartySearch(e.target.value);
                          setPartyFilterActive(e.target.value.length > 0);
                        }}
                      />
                      {partyFilterActive && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setPartySearch(""); setPartyFilterActive(false); }}>
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                      {partyFilterActive && (
                        <Badge variant="secondary" className="text-[10px]">
                          Showing tax statement for "{partySearch}"
                        </Badge>
                      )}
                    </div>
                  )}

                  {loadingTable ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : !tableData[tableName]?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No data available yet. Records will appear here once the platform is operational.
                    </p>
                  ) : (() => {
                    const rows = tableName === "tax_ledger" && partyFilterActive
                      ? tableData[tableName].filter((row: any) => {
                          const q = partySearch.toLowerCase();
                          return (row.vendor_name && String(row.vendor_name).toLowerCase().includes(q))
                            || (row.buyer_name && String(row.buyer_name).toLowerCase().includes(q))
                            || (row.vendor_id && String(row.vendor_id).toLowerCase().includes(q))
                            || (row.buyer_id && String(row.buyer_id).toLowerCase().includes(q));
                        })
                      : tableData[tableName];

                    if (!rows.length) {
                      return (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No tax records found for "{partySearch}".
                        </p>
                      );
                    }

                    return (
                      <div className="overflow-x-auto max-h-[60vh]">
                        {tableName === "tax_ledger" && partyFilterActive && (
                          <div className="mb-2 p-2 rounded bg-muted text-xs text-muted-foreground">
                            📋 Tax Statement: {rows.length} record(s) · Total collected: ${rows.reduce((s: number, r: any) => s + Number(r.total_collected || 0), 0).toFixed(2)}
                          </div>
                        )}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(rows[0])
                                .filter((k) => !k.includes("password") && !k.includes("hash"))
                                .map((key) => (
                                  <TableHead key={key} className="text-xs whitespace-nowrap">
                                    {key.replace(/_/g, " ")}
                                  </TableHead>
                                ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((row: any, i: number) => (
                              <TableRow key={i}>
                                {Object.entries(row)
                                  .filter(([k]) => !k.includes("password") && !k.includes("hash"))
                                  .map(([k, v], j) => (
                                    <TableCell key={j} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                                      {v === null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v)}
                                    </TableCell>
                                  ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Watermark footer */}
        <div className="text-center text-[10px] text-muted-foreground py-4 border-t">
          Audit session: {session.id.slice(0, 8)}... · Auditor: {session.auditor_name} · 
          All access is logged and monitored · TrustLock Pay™
        </div>
      </div>
    </div>
  );
};

export default AuditPortal;
