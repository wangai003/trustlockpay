import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import StandaloneInvoice from "@/components/shared/StandaloneInvoice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Link2, Copy, Check, Plus, ExternalLink, Shield, Search,
  Trash2, Power, PowerOff, MoreVertical, Filter,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { TaxLineItem } from "@/components/shared/TaxBreakdown";
import TLId from "@/components/shared/TLId";
import { dynTLId } from "@/lib/tlIdRegistry";

interface GeneratedLink {
  id: string;
  link_id: string;
  title: string;
  grand_total: number;
  created_at: string;
  status: string;
}

type StatusFilter = "all" | "active" | "inactive" | "paid";

const VendorStandaloneLinks = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [links, setLinks] = useState<GeneratedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<GeneratedLink | null>(null);

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

  // Filtered & searched links
  const filteredLinks = useMemo(() => {
    let result = links;
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.link_id.toLowerCase().includes(q) ||
          l.grand_total.toFixed(2).includes(q)
      );
    }
    return result;
  }, [links, statusFilter, searchQuery]);

  const handleCopy = (link: GeneratedLink) => {
    navigator.clipboard.writeText(`${baseUrl}/pay/${link.link_id}`);
    setCopiedId(link.link_id);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleStatus = async (link: GeneratedLink) => {
    const newStatus = link.status === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("standalone_links")
      .update({ status: newStatus })
      .eq("id", link.id);

    if (error) {
      toast.error("Failed to update link status");
      return;
    }
    setLinks((prev) =>
      prev.map((l) => (l.id === link.id ? { ...l, status: newStatus } : l))
    );
    toast.success(`Link ${newStatus === "active" ? "activated" : "deactivated"}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("standalone_links")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      toast.error("Failed to delete link");
    } else {
      setLinks((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      toast.success("Payment link deleted");
    }
    setDeleteTarget(null);
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

    const { data } = await supabase
      .from("standalone_links")
      .select("id, link_id, title, grand_total, created_at, status")
      .order("created_at", { ascending: false });

    if (data) setLinks(data);
    setShowCreate(false);
    toast.success("Payment link created! Share it with your buyer.");
  };

  const statusColor = (status: string) => {
    if (status === "paid") return "default";
    if (status === "active") return "outline";
    return "secondary";
  };

  const totalRevenue = links
    .filter((l) => l.status === "paid")
    .reduce((sum, l) => sum + l.grand_total, 0);

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

        {/* Stats row */}
        {links.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-foreground">{links.length}</p>
                <p className="text-[10px] text-muted-foreground">Total Links</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-foreground">{links.filter((l) => l.status === "active").length}</p>
                <p className="text-[10px] text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-primary">${totalRevenue.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">Paid Revenue</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create + search row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold">Your Links</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search links..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs w-full sm:w-48"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
                  <Filter className="w-3 h-3" />
                  {statusFilter === "all" ? "All" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["all", "active", "inactive", "paid"] as StatusFilter[]).map((f) => (
                  <DropdownMenuItem key={f} onClick={() => setStatusFilter(f)} className="text-xs">
                    {f === "all" ? "All Statuses" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <TLId code="TL-V-LNK-BTN-CREATE" inline>
              <Button size="sm" className="gap-2 h-8" onClick={() => setShowCreate(!showCreate)}>
                <Plus className="w-3.5 h-3.5" /> New
              </Button>
            </TLId>
          </div>
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
        ) : filteredLinks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Link2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {links.length === 0
                  ? 'No payment links yet. Tap "New" to create one.'
                  : "No links match your search or filter."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredLinks.map((link, rowIdx) => {
              const row = rowIdx + 1;
              return (
                <Card key={link.id} className={link.status === "inactive" ? "opacity-60" : ""}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <TLId code={dynTLId("V", "LNK", row, "LBL-TITLE")} inline>
                          <p className="text-sm font-semibold truncate">{link.title}</p>
                        </TLId>
                        <TLId code={dynTLId("V", "LNK", row, "STS")} inline>
                          <Badge variant={statusColor(link.status)} className="text-[10px]">
                            {link.status}
                          </Badge>
                        </TLId>
                      </div>
                      <TLId code={dynTLId("V", "LNK", row, "LBL-AMOUNT")} inline>
                        <p className="text-xs font-semibold text-primary">${link.grand_total.toFixed(2)}</p>
                      </TLId>
                      <TLId code={dynTLId("V", "LNK", row, "LBL-URL")} inline>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{baseUrl}/pay/{link.link_id}</p>
                      </TLId>
                      <p className="text-[10px] text-muted-foreground">Created {new Date(link.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <TLId code={dynTLId("V", "LNK", row, "BTN-COPY")} inline>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => handleCopy(link)}
                          disabled={link.status === "inactive"}
                        >
                          {copiedId === link.link_id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedId === link.link_id ? "Copied" : "Copy"}
                        </Button>
                      </TLId>
                      <TLId code={dynTLId("V", "LNK", row, "BTN-PREVIEW")} inline>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-xs"
                          onClick={() => navigate(`/pay/${link.link_id}`)}
                        >
                          <ExternalLink className="w-3 h-3" /> Preview
                        </Button>
                      </TLId>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(link)}
                            className="text-xs gap-2"
                            disabled={link.status === "paid"}
                          >
                            {link.status === "active" ? (
                              <><PowerOff className="w-3.5 h-3.5" /> Deactivate</>
                            ) : (
                              <><Power className="w-3.5 h-3.5" /> Activate</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(link)}
                            className="text-xs gap-2 text-destructive focus:text-destructive"
                            disabled={link.status === "paid"}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Link?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the link <strong>{deleteTarget?.link_id}</strong> and it will no longer be accessible by buyers. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VendorStandaloneLinks;
