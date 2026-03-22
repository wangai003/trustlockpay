import { useState } from "react";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Clock, CheckCircle, Bot, Upload, MessageSquare, Eye } from "lucide-react";

const mockDisputes = [
  {
    id: "DSP-001",
    txId: "TL-2026-0894",
    vendor: "GreenFarm Co",
    amount: "$680.00",
    reason: "Item not as described — received wrong color",
    status: "under_review" as const,
    filed: "Mar 15, 2026",
    lastUpdate: "Emmanuel AI is analyzing evidence",
  },
];

const statusConfig = {
  under_review: { label: "Under Review", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  resolved_buyer: { label: "Resolved — Your Favor", color: "bg-primary/15 text-primary", icon: CheckCircle },
  resolved_vendor: { label: "Resolved — Vendor Favor", color: "bg-muted text-muted-foreground", icon: CheckCircle },
};

const BuyerDisputes = () => {
  const [showNewDispute, setShowNewDispute] = useState(false);

  return (
    <div>
      <BuyerHeader title="Disputes" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold">Your Disputes</h2>
            <p className="text-sm text-muted-foreground">Track the status of any disputes you've filed</p>
          </div>
          <Button onClick={() => setShowNewDispute(!showNewDispute)} className="gap-2">
            <AlertTriangle className="w-4 h-4" /> File New Dispute
          </Button>
        </div>

        {/* New Dispute Form */}
        {showNewDispute && (
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-base">File a Dispute</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Transaction ID</Label>
                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="e.g., TL-2026-XXXX" />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option>Item not as described</option>
                  <option>Non-delivery</option>
                  <option>Wrong item received</option>
                  <option>Quality issue</option>
                  <option>Service incomplete</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Describe the issue</Label>
                <Textarea placeholder="Provide details about what went wrong..." rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Evidence (optional)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Drop photos, screenshots, or documents here</p>
                  <Button variant="outline" size="sm" className="mt-2">Browse Files</Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="gap-2"><AlertTriangle className="w-4 h-4" /> Submit Dispute</Button>
                <Button variant="outline" onClick={() => setShowNewDispute(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Disputes */}
        {mockDisputes.map((dispute) => {
          const cfg = statusConfig[dispute.status];
          return (
            <Card key={dispute.id}>
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-sm font-bold">{dispute.id}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        <cfg.icon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm">
                      <strong>vs {dispute.vendor}</strong> — {dispute.reason}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>TX: {dispute.txId}</span>
                      <span>Amount: {dispute.amount}</span>
                      <span>Filed: {dispute.filed}</span>
                    </div>
                  </div>

                  <div className="lg:w-72 bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold">Status Update</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{dispute.lastUpdate}</p>
                    <p className="text-[10px] text-muted-foreground">You will be notified when a decision is made</p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="gap-1"><MessageSquare className="w-3 h-3" /> Add Evidence</Button>
                    <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {mockDisputes.length === 0 && !showNewDispute && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-primary mb-3" />
              <h3 className="font-heading font-bold text-lg">No Active Disputes</h3>
              <p className="text-sm text-muted-foreground mt-1">All your transactions are in good standing</p>
            </CardContent>
          </Card>
        )}

        {/* Disclosure */}
        <div className="bg-muted/30 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
          <p><strong>Dispute Window:</strong> You have 14 days from delivery confirmation to file a dispute.</p>
          <p><strong>Auto-Release:</strong> If you do not confirm or dispute within 48 hours of delivery, funds will automatically release to the vendor.</p>
          <p><strong>AI Review:</strong> Emmanuel AI will analyze your case and provide a recommendation. Final resolution is approved by a human admin.</p>
        </div>
      </div>
    </div>
  );
};

export default BuyerDisputes;
