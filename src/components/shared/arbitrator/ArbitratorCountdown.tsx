/**
 * ArbitratorCountdown — Live countdown timer showing time remaining
 * for buyer/vendor to agree on an arbitrator (7-day window).
 */
import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface Props {
  deadline: string; // ISO date string
  label?: string;
}

const ArbitratorCountdown = ({ deadline, label = "Arbitrator agreement deadline" }: Props) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const target = new Date(deadline).getTime();
  const diff = Math.max(0, target - now);
  const expired = diff === 0;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const isUrgent = days <= 1 && !expired;

  if (expired) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
        <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
        <div>
          <p className="text-[10px] font-semibold text-destructive">Selection window expired</p>
          <p className="text-[9px] text-destructive/70">Platform will auto-assign an arbitrator</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
      isUrgent ? "bg-destructive/5 border-destructive/20" : "bg-accent/5 border-accent/20"
    }`}>
      <Clock className={`w-3.5 h-3.5 shrink-0 ${isUrgent ? "text-destructive animate-pulse" : "text-accent-foreground"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-1.5">
          {days > 0 && (
            <span className={`font-mono text-sm font-bold ${isUrgent ? "text-destructive" : "text-foreground"}`}>
              {days}<span className="text-[9px] font-normal text-muted-foreground">d</span>
            </span>
          )}
          <span className={`font-mono text-sm font-bold ${isUrgent ? "text-destructive" : "text-foreground"}`}>
            {String(hours).padStart(2, "0")}<span className="text-[9px] font-normal text-muted-foreground">h</span>
          </span>
          <span className={`font-mono text-sm font-bold ${isUrgent ? "text-destructive" : "text-foreground"}`}>
            {String(minutes).padStart(2, "0")}<span className="text-[9px] font-normal text-muted-foreground">m</span>
          </span>
          <span className={`font-mono text-sm font-bold ${isUrgent ? "text-destructive" : "text-foreground"}`}>
            {String(seconds).padStart(2, "0")}<span className="text-[9px] font-normal text-muted-foreground">s</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default ArbitratorCountdown;
