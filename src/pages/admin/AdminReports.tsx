import { useState, useMemo } from "react";
import { format } from "date-fns";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, FileText, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransactions, useDisputes, usePayouts } from "@/hooks/useSupabaseData";
import { toast } from "sonner";

const reportSections = [
  { id: "tx_overview", label: "Transaction Overview", desc: "Total count, volume, avg size, success rate" },
  { id: "escrow_summary", label: "Escrow Summary", desc: "Locked vs released vs disputed breakdown, avg lock duration" },
  { id: "revenue_fees", label: "Revenue & Fees", desc: "Fee revenue collected, avg fee %, projected trend" },
  { id: "dispute_summary", label: "Dispute Summary", desc: "Total disputes, resolution rate, avg time, outcomes" },
  { id: "emmanuel_ai", label: "Emmanuel AI Performance", desc: "Cases analyzed, auto-resolved, accuracy %, overrides" },
  { id: "vendor_activity", label: "Vendor Activity", desc: "New registrations, active vendors, top performers" },
  { id: "buyer_activity", label: "Buyer Activity", desc: "Active buyers, repeat rate, avg confirmation speed" },
  { id: "kyc_compliance", label: "KYC/Compliance", desc: "Pending verifications, approved/rejected, tier distribution" },
  { id: "payout_summary", label: "Payout Summary", desc: "Total payouts processed, avg time, by method" },
  { id: "geo_distribution", label: "Geographic Distribution", desc: "Transactions by region/country" },
  { id: "industry_breakdown", label: "Industry Breakdown", desc: "Volume by category (retail, real estate, tourism, etc.)" },
  { id: "webhook_health", label: "Webhook & Integration Health", desc: "Delivery success rate, failed webhooks, active integrations" },
  { id: "flagged_activity", label: "Flagged Activities", desc: "AML flags, suspicious patterns, SAR count" },
];

const AdminReports = () => {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(2026, 2, 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date(2026, 2, 22));
  const [selected, setSelected] = useState<string[]>(reportSections.map((s) => s.id));
  const [generated, setGenerated] = useState(false);

  const toggleSection = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    setSelected(selected.length === reportSections.length ? [] : reportSections.map((s) => s.id));
  };

  return (
    <div>
      <AdminHeader title="Summary Reports" />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Report Builder</CardTitle>
            <CardDescription>Select a date range and choose which sections to include in your report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Range */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-56 justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-56 justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Section Checkboxes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Report Sections</h3>
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {selected.length === reportSections.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {reportSections.map((section) => (
                  <label
                    key={section.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      selected.includes(section.id) ? "border-primary/30 bg-primary/5" : "border-border hover:bg-muted/30"
                    )}
                  >
                    <Checkbox
                      checked={selected.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium">{section.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{section.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={() => setGenerated(true)} disabled={selected.length === 0}>
                <Eye className="w-4 h-4 mr-2" /> Generate Preview
              </Button>
              <Button variant="outline" disabled={!generated}>
                <Download className="w-4 h-4 mr-2" /> Export PDF
              </Button>
              <Button variant="outline" disabled={!generated}>
                <FileText className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generated Preview */}
        {generated && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report Preview</CardTitle>
              <CardDescription>
                {startDate && endDate ? `${format(startDate, "MMM d, yyyy")} — ${format(endDate, "MMM d, yyyy")}` : "All time"} · {selected.length} sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {selected.includes("tx_overview") && (
                  <div className="border-b border-border pb-4">
                    <h4 className="font-semibold mb-2">Transaction Overview</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: "Total Transactions", value: "278" },
                        { label: "Total Volume", value: "$124,800" },
                        { label: "Avg Size", value: "$449" },
                        { label: "Success Rate", value: "98.2%" },
                      ].map((m) => (
                        <div key={m.label} className="bg-muted/30 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground">{m.label}</div>
                          <div className="text-lg font-bold">{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selected.includes("dispute_summary") && (
                  <div className="border-b border-border pb-4">
                    <h4 className="font-semibold mb-2">Dispute Summary</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: "Total Disputes", value: "12" },
                        { label: "Resolution Rate", value: "87.5%" },
                        { label: "Avg Resolution", value: "2.4 days" },
                        { label: "Buyer Won", value: "58%" },
                      ].map((m) => (
                        <div key={m.label} className="bg-muted/30 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground">{m.label}</div>
                          <div className="text-lg font-bold">{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selected.includes("emmanuel_ai") && (
                  <div className="border-b border-border pb-4">
                    <h4 className="font-semibold mb-2">Emmanuel AI Performance</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: "Cases Analyzed", value: "82" },
                        { label: "Auto-Resolved", value: "42" },
                        { label: "Accuracy", value: "94.2%" },
                        { label: "Overrides", value: "4" },
                      ].map((m) => (
                        <div key={m.label} className="bg-muted/30 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground">{m.label}</div>
                          <div className="text-lg font-bold">{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selected.filter((s) => !["tx_overview", "dispute_summary", "emmanuel_ai"].includes(s)).length > 0 && (
                  <div className="bg-muted/20 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      + {selected.filter((s) => !["tx_overview", "dispute_summary", "emmanuel_ai"].includes(s)).length} more sections will appear in the full export
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminReports;
