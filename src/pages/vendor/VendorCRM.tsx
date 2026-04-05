import { useState, useEffect } from "react";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getRFQTerms } from "@/lib/rfqIndustryConfig";
import { INDUSTRY_LABELS } from "@/lib/industryList";
import { toast } from "sonner";
import {
  FileText, Search, Phone, Mail, Building2, MapPin,
  Clock, CheckCircle, XCircle, ArrowRight, AlertCircle,
  Info, Link2, Calendar, Package, User, Percent, Handshake,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";

interface RFQRequest {
  id: string;
  rfq_number: string;
  status: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_company: string | null;
  buyer_location: string | null;
  buyer_phone_1: string | null;
  buyer_country_code_1: string | null;
  buyer_phone_2: string | null;
  buyer_country_code_2: string | null;
  buyer_phone_3: string | null;
  buyer_country_code_3: string | null;
  industry: string | null;
  specifications: Record<string, string> | null;
  quantity: number | null;
  unit: string | null;
  incoterms: string | null;
  notes: string | null;
  requested_delivery_date: string | null;
  customer_response: string | null;
  standalone_link_id: string | null;
  rfq_label: string | null;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  submitted: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  reviewed: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  quoted: "bg-purple-500/10 text-purple-700 border-purple-500/30",
  accepted: "bg-green-500/10 text-green-700 border-green-500/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  expired: "bg-muted text-muted-foreground border-border",
};

const VendorCRM = () => {
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState<RFQRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const fetchRFQs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("rfq_requests")
        .select("*")
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && data) setRfqs(data as any);
      setLoading(false);
    };
    fetchRFQs();
  }, [user?.id]);

  const filtered = rfqs.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.buyer_name?.toLowerCase().includes(q) ||
        r.buyer_email?.toLowerCase().includes(q) ||
        r.buyer_company?.toLowerCase().includes(q) ||
        r.rfq_number.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleMarkReviewed = async (id: string) => {
    await supabase.from("rfq_requests").update({ status: "reviewed" } as any).eq("id", id);
    setRfqs((prev) => prev.map((r) => (r.id === id ? { ...r, status: "reviewed" } : r)));
    toast.success("Marked as reviewed");
  };

  const counts = {
    all: rfqs.length,
    submitted: rfqs.filter((r) => r.status === "submitted").length,
    reviewed: rfqs.filter((r) => r.status === "reviewed").length,
    quoted: rfqs.filter((r) => r.status === "quoted").length,
    accepted: rfqs.filter((r) => r.customer_response === "accepted").length,
  };

  const formatPhone = (code: string | null, phone: string | null) => {
    if (!phone) return null;
    return `${code || ""} ${phone}`.trim();
  };

  return (
    <div>
      <VendorHeader title="Quote Requests (CRM)" />
      <div className="p-3 sm:p-6 space-y-4 max-w-5xl mx-auto">
        {/* Instruction Banner */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">How to Respond to Quote Requests</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Review the customer's quote request details below</li>
                  <li>Go to <strong>Standalone Links</strong> in the sidebar to create a custom invoice tailored to their request</li>
                  <li>Send the standalone link directly to the customer's email or phone number listed on their request</li>
                  <li>Once the customer accepts and pays, the order automatically populates your Work Orders and creates a carbon copy</li>
                </ol>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-2 text-xs"
                  onClick={() => window.location.href = "/trustlock/vendor/standalone-links"}
                >
                  <Link2 className="w-3.5 h-3.5" /> Go to Standalone Links <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: "Total", count: counts.all, color: "text-foreground" },
            { label: "New", count: counts.submitted, color: "text-blue-600" },
            { label: "Reviewed", count: counts.reviewed, color: "text-amber-600" },
            { label: "Quoted", count: counts.quoted, color: "text-purple-600" },
            { label: "Accepted", count: counts.accepted, color: "text-green-600" },
          ].map((s) => (
            <Card key={s.label} className="text-center p-2">
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, company, RFQ #..."
              className="pl-8 h-9 text-xs"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">New</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* RFQ List */}
        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Loading quote requests...</div>
        ) : filtered.length === 0 ? (
          <Card className="text-center py-12">
            <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No quote requests yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Customers from your checkout will appear here when they request a custom quote
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((rfq) => {
              const terms = getRFQTerms(rfq.industry || "");
              const isExpanded = expanded === rfq.id;
              return (
                <Card
                  key={rfq.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${isExpanded ? "ring-1 ring-primary/30" : ""}`}
                  onClick={() => setExpanded(isExpanded ? null : rfq.id)}
                >
                  <CardContent className="p-3 sm:p-4">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[10px] shrink-0">{rfq.rfq_number}</Badge>
                        <span className="text-sm font-semibold truncate">{rfq.buyer_name || "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`text-[10px] border ${statusColors[rfq.status] || ""}`}>
                          {rfq.status}
                        </Badge>
                        {rfq.customer_response === "accepted" && (
                          <Badge className="text-[10px] bg-green-500/10 text-green-700 border-green-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" /> Accepted
                          </Badge>
                        )}
                        {rfq.customer_response === "rejected" && (
                          <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                            <XCircle className="w-3 h-3 mr-1" /> Rejected
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Summary Row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {rfq.buyer_company && (
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{rfq.buyer_company}</span>
                      )}
                      {rfq.buyer_email && (
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{rfq.buyer_email}</span>
                      )}
                      {rfq.industry && (
                        <Badge variant="outline" className="text-[9px]">{INDUSTRY_LABELS[rfq.industry] || rfq.industry}</Badge>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(rfq.created_at), "MMM d, yyyy")}
                      </span>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t border-border space-y-4" onClick={(e) => e.stopPropagation()}>
                        <Tabs defaultValue="contact" className="w-full">
                          <TabsList className="h-8">
                            <TabsTrigger value="contact" className="text-xs">Contact</TabsTrigger>
                            <TabsTrigger value="specs" className="text-xs">Specifications</TabsTrigger>
                            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
                          </TabsList>

                          <TabsContent value="contact" className="space-y-2 mt-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="flex items-center gap-2 text-xs">
                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="font-medium">Name:</span> {rfq.buyer_name || "—"}
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="font-medium">Email:</span>
                                <a href={`mailto:${rfq.buyer_email}`} className="text-primary underline">{rfq.buyer_email || "—"}</a>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="font-medium">Company:</span> {rfq.buyer_company || "—"}
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="font-medium">Location:</span> {rfq.buyer_location || "—"}
                              </div>
                            </div>
                            {/* Phone Numbers */}
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Phone Numbers</p>
                              {[
                                formatPhone(rfq.buyer_country_code_1, rfq.buyer_phone_1),
                                formatPhone(rfq.buyer_country_code_2, rfq.buyer_phone_2),
                                formatPhone(rfq.buyer_country_code_3, rfq.buyer_phone_3),
                              ].filter(Boolean).map((phone, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                  <a href={`tel:${phone}`} className="text-primary underline">{phone}</a>
                                  {i === 0 && <Badge variant="outline" className="text-[8px]">Primary</Badge>}
                                </div>
                              ))}
                              {!rfq.buyer_phone_1 && <p className="text-xs text-muted-foreground">No phone provided</p>}
                            </div>
                          </TabsContent>

                          <TabsContent value="specs" className="space-y-2 mt-3">
                            {rfq.specifications && Object.keys(rfq.specifications).length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {Object.entries(rfq.specifications).map(([k, v]) => (
                                  <div key={k} className="bg-muted/30 rounded p-2">
                                    <p className="text-[10px] text-muted-foreground">{k}</p>
                                    <p className="text-xs font-medium">{v}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No specifications provided</p>
                            )}
                          </TabsContent>

                          <TabsContent value="details" className="space-y-2 mt-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {rfq.quantity && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>{rfq.quantity} {rfq.unit || ""}</span>
                                </div>
                              )}
                              {rfq.incoterms && (
                                <div className="text-xs"><span className="font-medium">Incoterms:</span> {rfq.incoterms}</div>
                              )}
                              {rfq.requested_delivery_date && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                  {format(new Date(rfq.requested_delivery_date), "MMM d, yyyy")}
                                </div>
                              )}
                            </div>
                            {rfq.notes && (
                              <div className="bg-muted/30 rounded p-2">
                                <p className="text-[10px] text-muted-foreground mb-1">Notes</p>
                                <p className="text-xs">{rfq.notes}</p>
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-border">
                          {rfq.status === "submitted" && (
                            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleMarkReviewed(rfq.id)}>
                              <CheckCircle className="w-3.5 h-3.5" /> Mark Reviewed
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="text-xs gap-1"
                            onClick={() => window.location.href = "/trustlock/vendor/standalone-links"}
                          >
                            <Link2 className="w-3.5 h-3.5" /> Create Quote via Standalone Link <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorCRM;
