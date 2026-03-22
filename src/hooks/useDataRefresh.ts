// Data refresh strategy hooks
// Real-time: Transactions, Orders, Notifications
// Polling: Analytics (5-10 min), Disputes (30s)
// On-demand: Archives

import { useEffect, useCallback, useState, useRef } from "react";

type RefreshStrategy = "realtime" | "polling" | "on-demand";

interface UseDataRefreshOptions {
  strategy: RefreshStrategy;
  intervalMs?: number; // for polling
  onRefresh: () => void;
  enabled?: boolean;
}

export function useDataRefresh({ strategy, intervalMs = 30000, onRefresh, enabled = true }: UseDataRefreshOptions) {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setLastRefresh(new Date());
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    if (strategy === "polling" && intervalMs > 0) {
      intervalRef.current = setInterval(refresh, intervalMs);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [strategy, intervalMs, refresh, enabled]);

  return { refresh, lastRefresh, isRefreshing };
}

// Preset hooks
export function useRealtimeRefresh(onRefresh: () => void, enabled = true) {
  return useDataRefresh({ strategy: "realtime", onRefresh, enabled });
}

export function useAnalyticsRefresh(onRefresh: () => void, enabled = true) {
  return useDataRefresh({ strategy: "polling", intervalMs: 5 * 60 * 1000, onRefresh, enabled });
}

export function useDisputeRefresh(onRefresh: () => void, enabled = true) {
  return useDataRefresh({ strategy: "polling", intervalMs: 30 * 1000, onRefresh, enabled });
}

export function useOnDemandRefresh(onRefresh: () => void) {
  return useDataRefresh({ strategy: "on-demand", onRefresh, enabled: false });
}
