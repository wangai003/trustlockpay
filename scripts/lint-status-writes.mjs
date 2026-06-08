#!/usr/bin/env node
/**
 * Lint rule: forbid `.update({...status:...})` on the `transactions` table
 * outside an explicit allowlist of edge functions.
 *
 * Why: a cron handler (auto-route-sweeper) silently rewrote `status: "locked"`
 * on already-shipped orders, clobbering vendor progress (the "David" incident,
 * 2026-06-08). The DB now has a forward-only state-machine trigger that blocks
 * backwards transitions, but we also want to prevent the *pattern* from
 * spreading to new code where it can cause noisy failures.
 *
 * Allowlist = functions that are the legitimate authority for transaction
 * lifecycle transitions. Anything else writing transactions.status is a bug
 * smell and must be reviewed.
 *
 * Run: `node scripts/lint-status-writes.mjs`
 * Exit code 1 on violation.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "supabase/functions";

// Functions explicitly allowed to write `transactions.status`.
// Every entry here is the AUTHORITY for a specific lifecycle transition.
const ALLOWLIST = new Set([
  "manage-transaction",      // primary user-driven lifecycle (ship, deliver, release, cancel)
  "manage-dispute",          // dispute open/resolve/split
  "escrow-manager",          // auto-release + admin release/refund
  "manage-kyc",              // KYC hold -> locked exit
  "sanctions-screening",     // OFAC/sanctions block
  "wallet-routing-bridge",   // pending -> locked on inbound routing (forward-only)
  "manage-scan-remediation", // compliance scan remediation transitions
  "auto-route-sweeper",      // idempotent inbound sweep (guarded by inbound_routed_at)
  "compliance-velocity",     // velocity-based holds
  "refund-router",           // refund finalization
]);

// Match a `.from("transactions")` followed (within the same statement, up to
// ~400 chars / a few chained calls) by `.update({ ... status: ... })`.
// Using [\s\S] to span newlines; lazy match keeps it tight.
const TX_STATUS_UPDATE_RE =
  /\.from\(\s*["']transactions["']\s*\)[\s\S]{0,400}?\.update\(\s*\{[^}]*\bstatus\s*:/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

const violations = [];
for (const file of walk(ROOT)) {
  // Identify the edge-function name (immediate child of supabase/functions/).
  const rel = file.slice(ROOT.length + 1);
  const fnName = rel.split("/")[0];
  if (ALLOWLIST.has(fnName)) continue;

  const src = readFileSync(file, "utf8");
  if (!TX_FROM_RE.test(src)) continue;
  if (!STATUS_UPDATE_RE.test(src)) continue;

  // Per-line report for offending lines.
  src.split("\n").forEach((line, i) => {
    if (STATUS_UPDATE_RE.test(line)) {
      violations.push(`${file}:${i + 1}  ${line.trim()}`);
    }
  });
}

if (violations.length > 0) {
  console.error("❌ Forbidden transactions.status writes detected:\n");
  for (const v of violations) console.error("  " + v);
  console.error(
    `\nIf this write is legitimate, add the function to ALLOWLIST in scripts/lint-status-writes.mjs ` +
      `and document why it is the authority for that transition.\n` +
      `Cron/sweeper handlers MUST guard with an idempotency sentinel (e.g. inbound_routed_at) ` +
      `before issuing any status write.`,
  );
  process.exit(1);
}

console.log("✅ No unauthorized transactions.status writes found.");
