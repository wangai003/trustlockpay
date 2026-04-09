import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { MilestoneDraft } from "./MilestoneNegotiation";

interface Props {
  milestones: MilestoneDraft[];
}

const COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-indigo-500",
];

const MilestoneNegotiationGantt = ({ milestones }: Props) => {
  const totalDays = useMemo(() => milestones.reduce((s, m) => s + (m.estimatedDays || 0), 0), [milestones]);

  if (totalDays === 0 || milestones.length === 0) return null;

  let cumulativeDay = 0;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium text-muted-foreground">Projected Timeline ({totalDays} days total)</p>
      <div className="relative w-full h-6 bg-muted/40 rounded-md overflow-hidden flex">
        {milestones.map((ms, idx) => {
          const width = (ms.estimatedDays / totalDays) * 100;
          const startDay = cumulativeDay;
          cumulativeDay += ms.estimatedDays;
          if (ms.estimatedDays <= 0) return null;
          return (
            <div
              key={ms.id}
              className={cn("h-full relative group", COLORS[idx % COLORS.length])}
              style={{ width: `${width}%` }}
              title={`${ms.title || `Stage ${idx + 1}`}: Day ${startDay + 1}–${cumulativeDay} (${ms.estimatedDays}d)`}
            >
              {width > 12 && (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-white truncate px-1">
                  {ms.estimatedDays}d
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {milestones.map((ms, idx) => (
          ms.estimatedDays > 0 && (
            <div key={ms.id} className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-sm", COLORS[idx % COLORS.length])} />
              <span className="text-[9px] text-muted-foreground truncate max-w-[100px]">
                {ms.title || `Stage ${idx + 1}`}
              </span>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default MilestoneNegotiationGantt;
