// Round-robin forward helper for admin messaging.
// Picks the next staff member in the target department (skipping the sender)
// and creates an encrypted admin direct message addressed to them.

import { supabase } from "@/integrations/supabase/client";
import { serverEncrypt } from "@/lib/cryptoUtils";

interface AdminStaff {
  id: string;
  name: string;
  username: string;
  is_chief?: boolean;
  is_deleted?: boolean;
  department_slug?: string;
}

async function listStaff(chiefAdminId: string): Promise<AdminStaff[]> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-admin-staff`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ action: "list", chiefAdminId }),
    }
  );
  const json = await res.json();
  return (json.accounts || json.staff || []) as AdminStaff[];
}

/** Picks the next eligible recipient in the target department using the RR pointer. */
export async function pickRoundRobinRecipient(
  callerAdminId: string,
  targetDepartmentSlug: string
): Promise<AdminStaff | null> {
  const all = await listStaff(callerAdminId);
  const pool = all.filter(
    (s) =>
      !s.is_deleted &&
      s.department_slug === targetDepartmentSlug &&
      s.id !== callerAdminId
  );
  if (pool.length === 0) return null;

  const { data: pointer } = await supabase
    .from("admin_department_rr_pointer")
    .select("last_assigned_index")
    .eq("department_slug", targetDepartmentSlug)
    .maybeSingle();

  const lastIdx = pointer?.last_assigned_index ?? -1;
  const nextIdx = (lastIdx + 1) % pool.length;
  const assignee = pool[nextIdx];

  await supabase.from("admin_department_rr_pointer").upsert(
    {
      department_slug: targetDepartmentSlug,
      last_assigned_index: nextIdx,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "department_slug" }
  );

  return assignee;
}

/**
 * Forwards a plaintext body to the next round-robin admin in the chosen
 * department. Returns the assigned recipient (or null if dept is empty).
 */
export async function forwardMessageToDepartment(params: {
  callerAdminId: string;
  fromDepartmentLabel: string;
  targetDepartmentSlug: string;
  bodyPlaintext: string;
  note?: string;
}): Promise<AdminStaff | null> {
  const assignee = await pickRoundRobinRecipient(
    params.callerAdminId,
    params.targetDepartmentSlug
  );
  if (!assignee) return null;

  const header = `↪ Forwarded from ${params.fromDepartmentLabel}${
    params.note ? `\nNote: ${params.note}` : ""
  }\n— — —\n`;
  const composed = header + params.bodyPlaintext;

  const { ciphertext, nonce } = await serverEncrypt(composed);
  const { error } = await supabase.from("admin_direct_messages").insert({
    sender_id: params.callerAdminId,
    recipient_id: assignee.id,
    body: JSON.stringify({ ciphertext, nonce }),
    is_encrypted: true,
    encryption_version: 1,
  });
  if (error) throw error;

  return assignee;
}
