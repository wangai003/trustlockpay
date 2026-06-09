// Server-side admin authentication service
import { supabase } from "@/integrations/supabase/client";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth`;

async function callAdminAuth(action: string, params: Record<string, string>) {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ action, ...params }),
  });
  return res.json();
}

export interface AdminLoginResult {
  success: boolean;
  needsSetup?: boolean;
  name?: string;
  username?: string;
  adminId?: string;
  isChief?: boolean;
  chiefRank?: number | null;
  departmentSlug?: string | null;
  locked?: boolean;
  remaining?: number;
  error?: string;
}

export async function serverAdminLogin(identifier: string, password: string): Promise<AdminLoginResult> {
  return callAdminAuth("login", { identifier, password });
}

export async function serverAdminSetup(username: string, email: string, password: string, tempPassword: string): Promise<{ success: boolean; error?: string }> {
  return callAdminAuth("setup", { username, email, password, tempPassword });
}

export async function serverAdminReset(email: string, currentPassword: string, password: string): Promise<{ success: boolean; error?: string }> {
  return callAdminAuth("reset", { email, currentPassword, password });
}

export async function serverAdminLookup(identifier: string): Promise<{ exists: boolean; isSetup: boolean }> {
  return callAdminAuth("lookup", { identifier });
}

// serverCheckPassword removed — it backed an unauthenticated password-oracle
// endpoint. UI visibility of reset/setup flows must rely on successful login.

