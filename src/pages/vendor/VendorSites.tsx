import VendorHeader from "@/components/vendor/VendorHeader";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Plus, ExternalLink, Copy, Trash2, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useVendorSites, useAddSite, useDeleteSite } from "@/hooks/useSupabaseData";

const VendorSites = () => {
  const { vendor } = useVendor();
  const [showAdd, setShowAdd] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [sitePlatform, setSitePlatform] = useState("");
  const [siteUrl, setSiteUrl] = useState("");

  const { data: dbSites = [] } = useVendorSites();
  const addSite = useAddSite();
  const deleteSite = useDeleteSite();

  // Merge context sites with DB sites for display
  const allSites = dbSites.length > 0
    ? dbSites.map(s => ({ id: s.id, name: s.name, platform: s.platform || "Custom", url: s.url || "" }))
    : vendor.sites;

  const handleAddSite = async () => {
    if (!siteName) return;
    await addSite.mutateAsync({ name: siteName, platform: sitePlatform, url: siteUrl });
    setSiteName(""); setSitePlatform(""); setSiteUrl("");
    setShowAdd(false);
  };

  const handleDeleteSite = async (siteId: string) => {
    await deleteSite.mutateAsync(siteId);
  };

  return (
    <div>
      <VendorHeader title="My Sites" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold">Connected Platforms</h2>
            <p className="text-sm text-muted-foreground">Manage all your websites and e-commerce platforms</p>
          </div>
          <Button onClick={() => setShowAdd(!showAdd)} className="gap-2"><Plus className="w-4 h-4" /> Add Site</Button>
        </div>

        {/* Add Site Form */}
        {showAdd && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Add New Site</CardTitle>
              <CardDescription>Connect another platform to your TrustLock account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site Name</Label>
                  <Input placeholder="e.g., My Etsy Store" value={siteName} onChange={e => setSiteName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Input placeholder="e.g., Shopify, WooCommerce, Custom" value={sitePlatform} onChange={e => setSitePlatform(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Website URL</Label>
                  <Input placeholder="e.g., mystore.myshopify.com" value={siteUrl} onChange={e => setSiteUrl(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddSite}>Connect Site</Button>
                <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connected Sites */}
        <div className="grid gap-4">
          {allSites.map((site) => (
            <Card key={site.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-bold">{site.name}</h3>
                      <Badge variant="secondary" className="text-[10px]">{site.platform}</Badge>
                      <Badge className="bg-primary/15 text-primary text-[10px]"><CheckCircle className="w-3 h-3 mr-0.5" /> Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> {site.url}
                    </p>

                    {/* Integration Script */}
                    <div className="mt-3 bg-muted/30 rounded-lg p-3">
                      <p className="text-xs font-semibold mb-2">Integration Script</p>
                      <div className="bg-background rounded border border-border p-2 font-mono text-xs overflow-x-auto">
                        {`<script src="https://cdn.trustlock.africa/widget.js" data-site-id="${site.id}" data-vendor-id="${vendor.name.toLowerCase().replace(/\s/g, '-')}"></script>`}
                      </div>
                      <Button variant="ghost" size="sm" className="mt-2 text-xs gap-1"><Copy className="w-3 h-3" /> Copy</Button>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleDeleteSite(site.id)}>
                    <Trash2 className="w-4 h-4" />
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

export default VendorSites;
