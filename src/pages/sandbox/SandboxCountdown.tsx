import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { getSandboxExpiry } from "./sandboxIndustryData";

export const SandboxCountdown = () => {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = getSandboxExpiry().getTime() - Date.now();
      if (diff <= 0) { setRemaining("Expired"); return; }
      const days = Math.floor(diff / 86400000);
      const hrs = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${days}d ${hrs}h ${mins}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
      <Clock className="w-3 h-3" />
      <span>Active until Dec 31, 2026 · <span className="font-medium text-foreground">{remaining}</span></span>
    </div>
  );
};
