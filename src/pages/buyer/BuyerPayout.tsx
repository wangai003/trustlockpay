import { useState } from "react";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import TrustLockOSPayout from "@/components/shared/TrustLockOSPayout";
import PendingRoutingCard from "@/components/shared/PendingRoutingCard";
import SavedPayoutWallets from "@/components/shared/SavedPayoutWallets";
import { useBuyer } from "@/contexts/BuyerContext";
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

const BuyerPayout = () => {
  const { isTestnet } = useBuyer();
  const { user } = useAuth();
  const [chain, setChain] = useState("polygon");
  return (
    <div>
      <BuyerHeader title="TrustLock OS Payout" />
      <div className="p-3 sm:p-6 space-y-4">
        <PendingRoutingCard surface="trustlock_os_payout" userId={user?.id} />
        <SavedPayoutWallets
          chain={chain}
          supportedChains={SUPPORTED_CHAINS}
          onSelect={(_addr, c) => setChain(c)}
        />
        <TrustLockOSPayout role="buyer" isTestnet={isTestnet} />
      </div>
    </div>
  );
};

export default BuyerPayout;
