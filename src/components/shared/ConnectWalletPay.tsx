/**
 * ConnectWalletPay — one-click crypto payment from self-custody wallets.
 *
 * Flow:
 *   1. User clicks "Connect Wallet" → Reown AppKit modal (MetaMask, Coinbase Wallet, Trust, Rainbow, 400+ wallets)
 *   2. Auto-switch to Polygon (or Amoy on testnet)
 *   3. Read user's USDC balance — show if sufficient
 *   4. User clicks "Pay" → triggers ERC-20 transfer() of exact amount to TrustLock intake wallet
 *   5. Wait for 1 confirmation → call verify-crypto-payment with the resulting tx hash
 *   6. Done — no manual TxID typing, no shortfall risk
 *
 * User pays a few cents in POL gas (Polygon is cheap). Gasless via TrustLockForwarder is a future upgrade.
 */
import { useEffect, useState } from "react";
import { useAccount, useChainId, useSwitchChain, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { polygon, polygonAmoy } from "@reown/appkit/networks";
import { Button } from "@/components/ui/button";
import { Wallet, CheckCircle2, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AZIX_WALLETS } from "@/lib/feeEngine";
import { initAppKit, USDC_ADDRESSES, USDT_ADDRESSES, ERC20_ABI } from "@/lib/walletConnect";
import { explorerTxUrl } from "@/lib/polygonExplorer";

interface ConnectWalletPayProps {
  amountUsd: number;
  token: "USDC" | "USDT";
  isTestnet: boolean;
  transactionId?: string;
  sessionId?: string;
  onVerified: (txHash: string, verifiedAmount: number) => void;
}

const ConnectWalletPay = ({
  amountUsd,
  token,
  isTestnet,
  transactionId,
  sessionId,
  onVerified,
}: ConnectWalletPayProps) => {
  // Initialize AppKit modal on first mount
  useEffect(() => { initAppKit(); }, []);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();

  const targetChain = isTestnet ? polygonAmoy : polygon;
  const onCorrectChain = chainId === targetChain.id;

  // Pick token contract for the active chain
  const tokenAddress = (isTestnet
    ? (token === "USDC" ? USDC_ADDRESSES.amoy : USDT_ADDRESSES.amoy)
    : (token === "USDC" ? USDC_ADDRESSES.polygon : USDT_ADDRESSES.polygon)
  ) as `0x${string}` | "";

  const recipient = AZIX_WALLETS.transaction.publicKey as `0x${string}`;
  const amountUnits = amountUsd > 0 ? parseUnits(amountUsd.toFixed(6), 6) : 0n;

  // Read user's token balance
  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress || undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!tokenAddress && onCorrectChain },
  });
  const balance = rawBalance ? Number(formatUnits(rawBalance as bigint, 6)) : 0;
  const insufficient = balance < amountUsd;

  // Write: transfer()
  const { writeContract, data: txHash, isPending: sending, error: sendError, reset: resetSend } = useWriteContract();

  // Wait for confirmation
  const { data: receipt, isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });

  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  // When confirmed on-chain, ping our backend to record + route
  useEffect(() => {
    if (!confirmed || !txHash || verified || verifying) return;
    (async () => {
      setVerifying(true);
      try {
        const { data, error } = await supabase.functions.invoke("verify-crypto-payment", {
          body: {
            txHash,
            expectedAmount: amountUsd,
            senderWallet: address,
            transactionId,
            sessionId,
            isTestnet,
            network: isTestnet ? "amoy" : "polygon",
          },
        });
        if (error) throw error;
        if ((data as any)?.verification === "confirmed") {
          setVerified(true);
          toast.success("✅ Payment confirmed on-chain — order generating.");
          onVerified(txHash, (data as any)?.transfer?.amount || amountUsd);
        } else if ((data as any)?.verification === "partial") {
          toast.warning(`Partial payment received. Shortfall: $${(data as any).shortfall}`);
        } else {
          toast.info((data as any)?.message || "Payment routed to support for review.");
        }
      } catch (e: any) {
        toast.error(`Verification failed: ${e.message || "unknown error"}`);
      } finally {
        setVerifying(false);
      }
    })();
  }, [confirmed, txHash, verified, verifying, amountUsd, address, transactionId, sessionId, isTestnet, onVerified]);

  const openModal = () => {
    // AppKit registers a web component <appkit-button> AND a global modal API
    const modal = (window as any).w3m || (window as any).appKit;
    if (modal?.open) return modal.open();
    // Fallback: trigger via custom event
    document.dispatchEvent(new CustomEvent("w3m:open"));
  };

  // ─── NOT CONNECTED ────────────────────────────
  if (!isConnected) {
    return (
      <div className="space-y-3 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
        <div className="flex items-start gap-2">
          <Wallet className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-foreground">One-Click Crypto Payment</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Connect your wallet (MetaMask, Coinbase Wallet, Trust, Rainbow, Rabby, Ledger, or scan QR with any mobile wallet). We'll send exactly <strong>${amountUsd.toFixed(2)} {token}</strong> on Polygon — no copy/paste, no TxID entry.
            </p>
          </div>
        </div>
        <Button type="button" className="w-full gap-2" onClick={openModal}>
          <Wallet className="w-4 h-4" /> Connect Wallet
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          Gas fee: ~$0.01 in POL · Settles in ~5 seconds on Polygon
        </p>
      </div>
    );
  }


  // ─── WRONG NETWORK ────────────────────────────
  if (!onCorrectChain) {
    return (
      <div className="space-y-3 p-4 rounded-lg border-2 border-yellow-500/40 bg-yellow-500/10">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-foreground">Wrong Network</p>
            <p className="text-[11px] text-muted-foreground">
              Your wallet is on chain {chainId}. Please switch to <strong>{targetChain.name}</strong> to continue.
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="w-full"
          disabled={switching}
          onClick={() => switchChain({ chainId: targetChain.id })}
        >
          {switching ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Switching...</> : `Switch to ${targetChain.name}`}
        </Button>
      </div>
    );
  }

  // ─── NO USDT ON AMOY GUARD ────────────────────
  if (!tokenAddress) {
    return (
      <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/5">
        <p className="text-xs text-destructive">
          {token} is not available on the {targetChain.name} testnet. Please select USDC instead.
        </p>
      </div>
    );
  }

  // ─── VERIFIED ─────────────────────────────────
  if (verified) {
    return (
      <div className="p-4 rounded-lg border-2 border-primary bg-primary/10 text-center space-y-2">
        <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
        <p className="text-sm font-bold text-foreground">Payment Confirmed</p>
        {txHash && (
          <a
            href={explorerTxUrl(txHash, isTestnet ? "amoy" : "polygon")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
          >
            View on PolygonScan <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  // ─── CONNECTED, READY TO PAY ──────────────────
  return (
    <div className="space-y-3 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between">
        <div className="text-[11px]">
          <p className="text-muted-foreground">Connected</p>
          <p className="font-mono text-foreground">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
        </div>
        <div className="text-right text-[11px]">
          <p className="text-muted-foreground">{token} Balance</p>
          <p className={`font-bold ${insufficient ? "text-destructive" : "text-foreground"}`}>
            {balance.toFixed(2)}
          </p>
        </div>
      </div>

      {insufficient && (
        <div className="p-2 rounded bg-destructive/10 border border-destructive/30 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-[10px] text-destructive">
            Insufficient balance. You need <strong>${amountUsd.toFixed(2)} {token}</strong> but have <strong>${balance.toFixed(2)}</strong>. Top up your wallet or switch payment method.
          </p>
        </div>
      )}

      <div className="p-3 rounded bg-background border border-border space-y-1 text-[11px]">
        <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold">{amountUsd.toFixed(2)} {token}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Network</span><span>{targetChain.name}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">To</span><span className="font-mono">{recipient.slice(0, 6)}...{recipient.slice(-4)}</span></div>
      </div>

      <Button
        type="button"
        className="w-full h-11 gap-2 text-sm font-semibold"
        disabled={insufficient || sending || confirming || verifying || amountUnits === 0n}
        onClick={() => {
          resetSend();
          writeContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [recipient, amountUnits],
          });


        }}
      >
        {sending && <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet...</>}
        {confirming && <><Loader2 className="w-4 h-4 animate-spin" /> Waiting for confirmation...</>}
        {verifying && <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>}
        {!sending && !confirming && !verifying && <><Wallet className="w-4 h-4" /> Pay {amountUsd.toFixed(2)} {token}</>}
      </Button>

      {txHash && (
        <a
          href={explorerTxUrl(txHash, isTestnet ? "amoy" : "polygon")}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 justify-center w-full"
        >
          View transaction <ExternalLink className="w-3 h-3" />
        </a>
      )}

      {sendError && (
        <p className="text-[10px] text-destructive">{sendError.message?.slice(0, 200)}</p>
      )}

      <button
        type="button"
        onClick={openModal}
        className="text-[10px] text-muted-foreground hover:text-foreground w-full text-center"
      >
        Disconnect or switch wallet
      </button>
    </div>
  );
};

export default ConnectWalletPay;
