import { useState } from "react";
import VendorHeader from "@/components/vendor/VendorHeader";
import StandaloneInvoice from "@/components/shared/StandaloneInvoice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, Check, Plus, ExternalLink, Shield } from "lucide-react";
import { toast } from "sonner";

interface GeneratedLink {
  id: string;
  title: string;
  amount: string;
  url: string;
  createdAt: string;
  status: "active" | "paid" | "expired";
}

const VendorStandaloneLinks = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Mock generated links for testnet
  const [links, setLinks] = useState<GeneratedLink[]>([
    {
      id: "TL-1719300000",
      title: "Logo Design Package",
      amount: "350.00",
      url: "https://trustlockpay.lovable.app/pay/TL-1719300000",
      createdAt: "2026-03-20",
      status: "active",
    },
    {
      id: "TL-1719200000",
      title: "Consulting Session — 2hrs",
      amount: "200.00",
      url: "https://trustlockpay.lovable.app/pay/TL-1719200000",
      createdAt: "2026-03-18",
      status: "paid",
    },
  ]);

  const handleCopy = (link: GeneratedLink) => {
    navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateLink = () => {
    if (!title) {
      toast.error("Enter a title for the payment link");
      return;
    }
    const newId = `TL-${Date.now()}`;
    const newLink: GeneratedLink = {
      id: newId,
      title,
      amount: "0.00",
      url: `https://trustlockpay.lovable.app/pay/${newId}`,
      createdAt: new Date().toISOString().split("T")[0],
      status: "active",
    };
    setLinks((prev) => [newLink, ...prev]);
    setTitle("");
    setShowCreate(false);
    toast.success("Payment link created! Share it with your buyer.");
  };

  return (
    <div>
      <VendorHeader title="Standalone Payment Links" />
      <div className="p-3 sm:p-6 space-y-6 max-w-4xl mx-auto">
        {/* Info banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground text-sm">P2P Escrow Links — No Website Required</p>
              <p>Create a shareable payment link with an attached invoice. Your buyer reviews the invoice, pays through TrustLock's escrow, and funds are held securely until delivery is confirmed. Works for Facebook Marketplace, WhatsApp deals, freelance gigs, and more.</p>
            </div>
          </CardContent>
        </Card>

        {/* Create section */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Your Links</h2>
          <Button size="sm" className="gap-2" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" /> New Link
          </Button>
        </div>

        {showCreate && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Create Payment Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Link Title</Label>
                <Input
                  placeholder="e.g. Logo Design, Used iPhone 15, Consulting Fee"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Invoice preview */}
              <div className="border border-border rounded-lg p-4 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground mb-3">📄 Invoice Preview (buyer will see this)</p>
                <StandaloneInvoice vendorName="Your Business" onProceed={() => {}} />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateLink} className="gap-2">
                  <Link2 className="w-4 h-4" /> Generate Link
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Links list */}
        <div className="space-y-3">
          {links.map((link) => (
            <Card key={link.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{link.title}</p>
                    <Badge
                      variant={link.status === "paid" ? "default" : link.status === "active" ? "outline" : "secondary"}
                      className="text-[10px]"
                    >
                      {link.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{link.url}</p>
                  <p className="text-[10px] text-muted-foreground">Created {link.createdAt}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => handleCopy(link)}
                  >
                    {copiedId === link.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedId === link.id ? "Copied" : "Copy"}
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5 text-xs">
                    <ExternalLink className="w-3 h-3" /> Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VendorStandaloneLinks;
