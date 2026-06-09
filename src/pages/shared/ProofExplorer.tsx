import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Shield } from "lucide-react";
import TransactionProofChain from "@/components/shared/TransactionProofChain";
import ProofCertificate from "@/components/shared/ProofCertificate";
import VendorHeader from "@/components/vendor/VendorHeader";
import BuyerHeader from "@/components/buyer/BuyerHeader";

interface ProofExplorerProps {
  role: "buyer" | "vendor";
}

const ProofExplorer = ({ role }: ProofExplorerProps) => {
  const [input, setInput] = useState("");
  const [txId, setTxId] = useState<string | null>(null);

  const Header = role === "vendor" ? VendorHeader : BuyerHeader;

  return (
    <div>
      <Header title="Proof Explorer" />
      <div className="p-3 sm:p-6 space-y-4 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Blockchain Proof Lookup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Enter a transaction ID to view its full on-chain proof chain and download a tamper-proof certificate.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Transaction ID (UUID)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="text-xs"
              />
              <Button size="sm" onClick={() => setTxId(input.trim() || null)} disabled={!input.trim()}>
                <Search className="w-3.5 h-3.5 mr-1" /> Lookup
              </Button>
            </div>
          </CardContent>
        </Card>

        {txId && (
          <>
            <ProofCertificate transactionId={txId} />
            <TransactionProofChain transactionId={txId} />
          </>
        )}
      </div>
    </div>
  );
};

export default ProofExplorer;
