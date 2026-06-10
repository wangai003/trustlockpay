import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NetworkScope } from "@/lib/networkScope";

/**
 * Read-only visual sentinel for login surfaces. The route — not an in-app
 * toggle — chooses the network. The user must log out and re-enter on the
 * other route to switch scopes.
 */
export default function NetworkLockBanner({ scope }: { scope: NetworkScope }) {
  const isTestnet = scope === "testnet";
  return (
    <>
      <div
        className={cn(
          "fixed inset-x-0 top-0 h-[2px] z-50",
          isTestnet ? "bg-accent" : "bg-destructive"
        )}
        aria-hidden
      />
      <div
        className={cn(
          "mb-4 rounded-lg border p-3 text-sm flex items-center gap-2",
          isTestnet
            ? "bg-accent/10 border-accent/30 text-accent-foreground"
            : "bg-destructive/10 border-destructive/30 text-destructive"
        )}
        title="Network scope is locked at login. Sign out to switch."
      >
        <Lock className="w-4 h-4 shrink-0" />
        <div className="flex-1">
          <strong>
            {isTestnet ? "SANDBOX · TESTNET only" : "MAINNET · LIVE"}
          </strong>
          <span className="ml-2 opacity-80">
            {isTestnet
              ? "Simulated data. No real funds will move."
              : "Real funds and binding contracts. Verify before signing in."}
          </span>
        </div>
      </div>
    </>
  );
}
