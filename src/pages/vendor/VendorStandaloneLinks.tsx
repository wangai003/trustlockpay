import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import StandaloneInvoice from "@/components/shared/StandaloneInvoice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, Check, Plus, ExternalLink, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { TaxLineItem } from "@/components/shared/TaxBreakdown";
import TLId from "@/components/shared/TLId";

interface GeneratedLink {
  id: string;
  link_id: string;
  title: string;
  grand_total: number;
  created_at: string;
  status: string;
}

const VendorStandaloneLinks = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [links, setLinks] = useState<GeneratedLink[]>([]);
  const [loading, setLoading] = useState(true);

  const baseUrl = window.location.origin;

  // Load vendor's links
  useEffect(() => {
    const loadLinks = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("standalone_links")
        .select("id, link_id, title, grand_total, created_at, status")
        .order("created_at", { ascending: false });

      if (!error && data) setLinks(data);
      setLoading(false);
    };
    loadLinks();
  }, [session?.user?.id]);

  const handleCopy = (link: GeneratedLink) => {
    navigator.clipboard.writeText(`${baseUrl}/pay/${link.link_id}`);
    setCopiedId(link.link_id);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateLink = async (invoice: {
    items: { id: string; description: string; quantity: number; unitPrice: number }[];
    taxItems: TaxLineItem[];
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    note: string;
  }) => {
    const linkId = `TL-${Date.now()}`;
    const vendorId = session?.user?.id;

    if (!vendorId) {
      toast.error("You must be logged in to create a link");
      return;
    }

    // Get vendor profile name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", vendorId)
      .single();

    const { error } = await supabase.from("standalone_links").insert({
      link_id: linkId,
      vendor_id: vendorId,
      vendor_name: profile?.full_name || "Vendor",
      title: invoice.items[0]?.description || "Payment Request",
      invoice_items: invoice.items as any,
      tax_items: invoice.taxItems as any,
      note: invoice.note,
      subtotal: invoice.subtotal,
      tax_total: invoice.taxTotal,
      grand_total: invoice.grandTotal,
      status: "active",
    });

    if (error) {
      toast.error("Failed to create link");
      return;
    }

    // Refresh list
    const { data } = await supabase
      .from("standalone_links")
      .select("id, link_id, title, grand_total, created_at, status")
      .order("created_at", { ascending: false });

    if (data) setLinks(data);
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
            <CardContent>
              <StandaloneInvoice
                vendorName={session?.user?.user_metadata?.full_name || "Your Business"}
                onProceed={handleCreateLink}
              />
            </CardContent>
          </Card>
        )}

        {/* Links list */}
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-8">Loading links...</p>
        ) : links.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Link2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No payment links yet. Tap "New Link" to create one.</p>
            </CardContent>
          </Card>
        ) : (
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
                    <p className="text-xs font-semibold text-primary">${link.grand_total.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{baseUrl}/pay/{link.link_id}</p>
                    <p className="text-[10px] text-muted-foreground">Created {new Date(link.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => handleCopy(link)}
                    >
                      {copiedId === link.link_id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedId === link.link_id ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-xs"
                      onClick={() => navigate(`/pay/${link.link_id}`)}
                    >
                      <ExternalLink className="w-3 h-3" /> Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorStandaloneLinks;
