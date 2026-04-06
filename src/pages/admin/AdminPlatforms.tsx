import { useState, useEffect } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Key, Plus, Users, DollarSign, ShoppingCart, RefreshCw, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlatformRecord {
  id: string;
  platform_name: string;
  api_key_hash: string;
  platform_fee_percent: number;
  contact_email: string | null;
  payout_account: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
}

interface PlatformStats {
  total_transactions: number;
  total_gmv: number;
  platform_revenue_estimate: number;
  vendors: { total_tokens: number; claimed: number; pending: number };
  transaction_status: Record<string, number>;
}

const AdminPlatforms = () => {
  const [platforms, setPlatforms] = useState<PlatformRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newPlatform, setNewPlatform] = useState({ name: "", fee: "0", email: "" });
  const [selectedStats, setSelectedStats] = useState<{ platform: PlatformRecord; stats: PlatformStats } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchPlatforms = async () => {
    setLoading(true);
    const { data } = await supabase.from("platform_api_keys").select("*").order("created_at", { ascending: false });
    setPlatforms((data as unknown as PlatformRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPlatforms(); }, []);

  const generateApiKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "tlp_";
    for (let i = 0; i < 40; i++) key += chars[Math.floor(Math.random() * chars.length)];
    return key;
  };

  const handleAdd = async () => {
    if (!newPlatform.name) { toast.error("Platform name is required"); return; }
    const apiKey = generateApiKey();
    const { error } = await supabase.from("platform_api_keys").insert({
      platform_name: newPlatform.name,
      api_key_hash: apiKey,
      platform_fee_percent: Number(newPlatform.fee) || 0,
      contact_email: newPlatform.email || null,
    } as never);
    if (error) { toast.error(error.message); return; }
    toast.success(`Platform added. API Key: ${apiKey}`, { duration: 15000 });
    navigator.clipboard.writeText(apiKey);
    setShowAdd(false);
    setNewPlatform({ name: "", fee: "0", email: "" });
    fetchPlatforms();
  };

  const fetchStats = async (platform: PlatformRecord) => {
    setStatsLoading(true);
    try {
      const { data } = await supabase.functions.invoke("marketplace-bridge", {
        body: { action: "platform_dashboard", platform_api_key: platform.api_key_hash },
      });
      if (data?.stats) setSelectedStats({ platform, stats: data.stats });
      else toast.error("Could not load stats");
    } catch { toast.error("Failed to load platform stats"); }
    setStatsLoading(false);
  };

  return (
    <div>
      <AdminHeader title="Marketplace Platforms" />
      <div className="p-3 sm:p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <Building2 className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{platforms.length}</p>
            <p className="text-xs text-muted-foreground">Registered Platforms</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Key className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{platforms.filter(p => p.is_active).length}</p>
            <p className="text-xs text-muted-foreground">Active Keys</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Users className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">—</p>
            <p className="text-xs text-muted-foreground">Total Vendors</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <DollarSign className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">—</p>
            <p className="text-xs text-muted-foreground">Total GMV</p>
          </CardContent></Card>
        </div>

        {/* Platform table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Platforms</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchPlatforms}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
              <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Platform</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Register New Platform</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Platform Name</Label><Input value={newPlatform.name} onChange={e => setNewPlatform(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Jumia, Amazon" /></div>
                    <div><Label>Platform Fee %</Label><Input type="number" step="0.1" value={newPlatform.fee} onChange={e => setNewPlatform(p => ({ ...p, fee: e.target.value }))} placeholder="0" /></div>
                    <div><Label>Contact Email</Label><Input value={newPlatform.email} onChange={e => setNewPlatform(p => ({ ...p, email: e.target.value }))} placeholder="dev@platform.com" /></div>
                    <Button className="w-full" onClick={handleAdd}>Generate API Key & Register</Button>
                    <p className="text-xs text-muted-foreground">The API key will be shown once and copied to clipboard.</p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-muted-foreground text-sm py-4">Loading...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Fee %</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {platforms.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.platform_name}</TableCell>
                      <TableCell>{p.platform_fee_percent}%</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">{p.api_key_hash.slice(0, 12)}...</span>
                        <Button size="sm" variant="ghost" className="ml-1 h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(p.api_key_hash); toast.success("Copied"); }}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </TableCell>
                      <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => fetchStats(p)} disabled={statsLoading}>
                          <ShoppingCart className="w-3 h-3 mr-1" /> Stats
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {platforms.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No platforms registered yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Stats drawer */}
        {selectedStats && (
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                {selectedStats.platform.platform_name} — Dashboard
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelectedStats(null)}>Close</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xl font-bold text-foreground">{selectedStats.stats.total_transactions}</p>
                  <p className="text-xs text-muted-foreground">Transactions</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xl font-bold text-foreground">${selectedStats.stats.total_gmv.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total GMV</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xl font-bold text-foreground">${selectedStats.stats.platform_revenue_estimate.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Platform Revenue</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xl font-bold text-foreground">
                    {selectedStats.stats.vendors.claimed}/{selectedStats.stats.vendors.total_tokens}
                  </p>
                  <p className="text-xs text-muted-foreground">Vendors Claimed</p>
                </div>
              </div>
              {Object.keys(selectedStats.stats.transaction_status).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedStats.stats.transaction_status).map(([status, count]) => (
                    <Badge key={status} variant="outline">{status}: {count}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminPlatforms;
