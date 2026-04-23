import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, AlertTriangle, ExternalLink, Rocket, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compileContracts } from "@/lib/solcCompiler";

// Inline contract sources — fetched from /contracts at request time via raw URLs
// NOTE: For Lovable preview we read them from the same origin's published static files.
// We keep them here as constants so the function call has zero filesystem dependency.

const FORWARDER_SRC = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
contract TrustLockForwarder is ERC2771Forwarder {
  constructor() ERC2771Forwarder("TrustLockForwarder") {}
}`;

type Network = "amoy" | "polygon";

interface Deployment {
  id: string;
  network: string;
  contract_name: string;
  contract_address: string;
  tx_hash: string;
  block_number: number | null;
  verification_status: string;
  metadata: any;
  created_at: string;
}

export default function AdminDeployContracts() {
  const [network, setNetwork] = useState<Network>("amoy");
  const [deploying, setDeploying] = useState(false);
  const [history, setHistory] = useState<Deployment[]>([]);
  const [latest, setLatest] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  async function loadHistory() {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("deployment_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error && data) setHistory(data as Deployment[]);
    setLoadingHistory(false);
  }

  useEffect(() => { loadHistory(); }, []);

  async function fetchSource(filename: string): Promise<string> {
    const r = await fetch(`/contracts/${filename}`);
    if (!r.ok) throw new Error(`Cannot load ${filename} — ensure it's in /public/contracts/`);
    return await r.text();
  }

  async function handleDeploy() {
    if (!confirm(
      network === "polygon"
        ? "⚠️ MAINNET DEPLOYMENT — This will spend real MATIC. Are you absolutely sure?"
        : "Deploy to Polygon Amoy testnet? This is a rehearsal — no real funds."
    )) return;

    setDeploying(true);
    setLatest(null);
    try {
      toast.info("Loading contract sources…");
      const [escrow, registry] = await Promise.all([
        fetchSource("TrustLockEscrow.sol"),
        fetchSource("TrustLockRegistry.sol"),
      ]);

      const adminAuth = JSON.parse(localStorage.getItem("tl_admin_auth") || "{}");

      toast.info(`Compiling & deploying to ${network === "polygon" ? "Polygon Mainnet" : "Amoy Testnet"}…`, {
        description: "This takes 30–90 seconds. Do not close this page.",
      });

      const { data, error } = await supabase.functions.invoke("deploy-contracts", {
        body: {
          network,
          admin_id: adminAuth.adminId ?? null,
          sources: {
            "TrustLockEscrow.sol": escrow,
            "TrustLockRegistry.sol": registry,
          },
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Deployment failed");

      setLatest(data);
      toast.success("✅ Contracts deployed successfully!");
      loadHistory();
    } catch (e: any) {
      console.error(e);
      toast.error("Deployment failed", { description: e.message });
    } finally {
      setDeploying(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Rocket className="h-8 w-8 text-primary" />
          Smart Contract Deployment
        </h1>
        <p className="text-muted-foreground mt-1">
          Deploy TrustLockForwarder, TrustLockRegistry, and TrustLockEscrow to Polygon.
        </p>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Pre-deployment checklist</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Deployer wallet funded (≥0.5 POL on Amoy / ≥3 MATIC on Mainnet)</li>
            <li>Escrow + Transaction wallet addresses configured in secrets</li>
            <li>Relayer wallet configured (will be set as Registry operator)</li>
            <li>POLYGON_AMOY_RPC_URL and POLYGON_RPC_URL configured</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Deploy</CardTitle>
          <CardDescription>Choose network and deploy in one click.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={network} onValueChange={(v) => setNetwork(v as Network)}>
            <TabsList>
              <TabsTrigger value="amoy">🧪 Amoy Testnet (recommended first)</TabsTrigger>
              <TabsTrigger value="polygon">🚀 Polygon Mainnet</TabsTrigger>
            </TabsList>
            <TabsContent value="amoy" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Risk-free rehearsal. Get free POL from{" "}
                <a href="https://faucet.polygon.technology/" target="_blank" rel="noreferrer" className="underline">
                  faucet.polygon.technology
                </a>.
              </p>
            </TabsContent>
            <TabsContent value="polygon" className="mt-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Mainnet — real funds</AlertTitle>
                <AlertDescription>
                  Each deployment costs ~1–3 MATIC. Only proceed after successful testnet rehearsal.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          <Button
            size="lg"
            onClick={handleDeploy}
            disabled={deploying}
            className="w-full"
            variant={network === "polygon" ? "destructive" : "default"}
          >
            {deploying ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deploying…</>
            ) : (
              <><Rocket className="mr-2 h-4 w-4" /> Deploy to {network === "polygon" ? "Mainnet" : "Amoy Testnet"}</>
            )}
          </Button>
        </CardContent>
      </Card>

      {latest && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" /> Deployment complete
            </CardTitle>
            <CardDescription>
              {latest.network} · Chain ID {latest.chainId}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(latest.contracts).map(([name, addr]: any) => (
              <div key={name} className="flex items-center justify-between p-3 rounded-md bg-muted">
                <div>
                  <div className="font-medium capitalize">{name}</div>
                  <code className="text-xs text-muted-foreground break-all">{addr}</code>
                </div>
                <a href={`${latest.explorer}/address/${addr}`} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3 w-3 mr-1" /> View
                  </Button>
                </a>
              </div>
            ))}
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Next:</strong> save these addresses as secrets
                (<code>FORWARDER_CONTRACT_ADDRESS</code>, <code>REGISTRY_CONTRACT_ADDRESS</code>,{" "}
                <code>ESCROW_CONTRACT_ADDRESS</code>) so edge functions can use them.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Deployment History</CardTitle>
          <CardDescription>Append-only audit log.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deployments yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-md border text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={d.network === "polygon" ? "destructive" : "secondary"}>
                        {d.network}
                      </Badge>
                      <span className="font-medium">{d.contract_name}</span>
                      <Badge variant="outline">{d.verification_status}</Badge>
                    </div>
                    <code className="text-xs text-muted-foreground break-all block mt-1">
                      {d.contract_address}
                    </code>
                    <span className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleString()}
                    </span>
                  </div>
                  {d.metadata?.explorer && (
                    <a href={d.metadata.explorer} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
