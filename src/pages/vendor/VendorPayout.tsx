import { useState } from "react";
import VendorHeader from "@/components/vendor/VendorHeader";
import TrustLockOSPayout from "@/components/shared/TrustLockOSPayout";
import PendingRoutingCard from "@/components/shared/PendingRoutingCard";
import SavedPayoutWallets from "@/components/shared/SavedPayoutWallets";
import { useVendor } from "@/contexts/VendorContext";
import { useAuth } from "@/hooks/useAuth";

const SUPPORTED_CHAINS = [
  { id: "polygon", name: "Polygon (MATIC)" },
  { id: "ethereum", name: "Ethereum (ETH)" },
  { id: "bsc", name: "BNB Smart Chain" },
  { id: "arbitrum", name: "Arbitrum" },
  { id: "optimism", name: "Optimism" },
  { id: "avalanche", name: "Avalanche (C-Chain)" },
  { id: "base", name: "Base" },
  { id: "solana", name: "Solana" },
  { id: "tron", name: "Tron (TRC-20)" },
];

const VendorPayout = () => {
  const { isTestnet } = useVendor();
  const { user } = useAuth();
  const [chain, setChain] = useState("polygon");
  return (
    <div>
      <VendorHeader title="TrustLock OS Payout" />
      <div className="p-3 sm:p-6 space-y-4">
        <PendingRoutingCard surface="trustlock_os_payout" userId={user?.id} />
        <SavedPayoutWallets
          chain={chain}
          supportedChains={SUPPORTED_CHAINS}
          onSelect={(_addr, c) => setChain(c)}
        />
        <TrustLockOSPayout
          role="vendor"
          isTestnet={isTestnet}
          prefillOrderNumber={isTestnet ? "TL-00042" : ""}
          prefillAmount={isTestnet ? "4500.00" : ""}
        />
      </div>
    </div>
  );
};

export default VendorPayout;
