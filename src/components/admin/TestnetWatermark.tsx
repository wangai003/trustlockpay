import { useAdmin } from "@/contexts/AdminContext";
import { FlaskConical } from "lucide-react";

/**
 * Persistent, unmissable testnet indicator for the admin shell.
 * Rendered inside <AdminProvider>; no-op on mainnet.
 */
const TestnetWatermark = () => {
  const { isTestnet } = useAdmin();
  if (!isTestnet) return null;
  return (
    <>
      {/* Diagonal corner ribbon — visible on every admin page */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-3 right-3 z-[60] flex items-center gap-1 rounded-full bg-testnet px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-testnet-foreground shadow-lg"
      >
        <FlaskConical className="h-3 w-3" />
        Testnet
      </div>
      {/* Subtle outline frame so the entire viewport reads as sandbox */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[55] ring-2 ring-inset ring-testnet/40"
      />
    </>
  );
};

export default TestnetWatermark;
