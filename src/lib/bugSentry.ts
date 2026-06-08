// Bug Sentry — frontend intake for system errors.
// Routes to the `report_bug` Postgres function via the supabase client.
// All bugs land in `bug_reports` and notify the Technical & Engineering dept.

import { supabase } from "@/integrations/supabase/client";

export type BugSeverity = "critical" | "error" | "warning" | "info";
export type BugSource = "frontend" | "edge_function" | "database_trigger" | "cron" | "blockchain" | "manual";

export interface BugReportInput {
  severity: BugSeverity;
  category: string;            // e.g. "checkout", "auth", "payout", "render_crash"
  title: string;               // short — used for dedupe
  message: string;             // human-readable detail
  stackTrace?: string;
  context?: Record<string, unknown>;
  route?: string;
  userId?: string;
  userRole?: string;
}

/**
 * Report a bug from frontend code. Silent on failure — never throw
 * out of the sentry itself or we'd cascade.
 */
export async function reportBug(input: BugReportInput): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("report_bug", {
      _severity: input.severity,
      _source: "frontend" as BugSource,
      _category: input.category,
      _title: input.title.slice(0, 200),
      _message: input.message.slice(0, 2000),
      _stack_trace: input.stackTrace?.slice(0, 4000) ?? null,
      _context: (input.context ?? {}) as any,
      _route: input.route ?? (typeof window !== "undefined" ? window.location.pathname : null),
      _user_id: input.userId ?? null,
      _user_role: input.userRole ?? null,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("[bugSentry] failed to report:", error.message);
      return null;
    }
    return (data as string) ?? null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[bugSentry] threw:", e);
    return null;
  }
}

/**
 * Install global window error + unhandledrejection handlers.
 * Call once from App bootstrap.
 */
export function installGlobalBugSentry() {
  if (typeof window === "undefined") return;
  if ((window as any).__tl_bug_sentry_installed) return;
  (window as any).__tl_bug_sentry_installed = true;

  window.addEventListener("error", (ev) => {
    void reportBug({
      severity: "error",
      category: "uncaught_exception",
      title: ev.message || "Uncaught error",
      message: `${ev.message}\n@ ${ev.filename}:${ev.lineno}:${ev.colno}`,
      stackTrace: ev.error?.stack,
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const reason = ev.reason;
    const msg = typeof reason === "string" ? reason : reason?.message ?? "Unhandled promise rejection";
    void reportBug({
      severity: "error",
      category: "unhandled_rejection",
      title: msg.slice(0, 150),
      message: msg,
      stackTrace: reason?.stack,
    });
  });
}
