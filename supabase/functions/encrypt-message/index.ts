import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

/**
 * encrypt-message – server-side AES-256-GCM encryption for admin/compliance channels.
 * Derives the encryption key from SUPABASE_SERVICE_ROLE_KEY so no extra secret is needed.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(): Promise<CryptoKey> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const raw = await crypto.subtle.digest("SHA-256", encoder.encode(serviceKey + ":trustlock-msg-v1"));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encrypt(plaintext: string): Promise<{ ciphertext: string; nonce: string }> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext));
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    nonce: btoa(String.fromCharCode(...iv)),
  };
}

async function decrypt(ciphertext: string, nonce: string): Promise<string> {
  const key = await deriveKey();
  const iv = Uint8Array.from(atob(nonce), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return decoder.decode(decrypted);
}

async function verifyCaller(req: Request): Promise<{ userId: string | null; isService: boolean }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { userId: null, isService: false };
  const token = authHeader.replace("Bearer ", "");
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return { userId: null, isService: true };
  try {
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data, error } = await anon.auth.getUser();
    if (error || !data?.user) return { userId: null, isService: false };
    return { userId: data.user.id, isService: false };
  } catch { return { userId: null, isService: false }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const caller = await verifyCaller(req);
    if (!caller.isService && !caller.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, body, ciphertext, nonce, messages } = await req.json();

    // Decrypt actions require admin role (or service role)
    if ((action === "decrypt" || action === "decrypt_batch") && !caller.isService) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: adminRole } = await supabase
        .from("user_roles").select("role").eq("user_id", caller.userId!).eq("role", "admin").maybeSingle();
      if (!adminRole) {
        return new Response(JSON.stringify({ error: "Forbidden — admin role required to decrypt" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }



    if (action === "encrypt" && body) {
      const result = await encrypt(body);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "decrypt" && ciphertext && nonce) {
      const plaintext = await decrypt(ciphertext, nonce);
      return new Response(JSON.stringify({ plaintext }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "decrypt_batch" && Array.isArray(messages)) {
      const results = await Promise.all(
        messages.map(async (m: { id: string; body: string; nonce: string }) => {
          try {
            const plaintext = await decrypt(m.body, m.nonce);
            return { id: m.id, plaintext };
          } catch {
            return { id: m.id, plaintext: "[decryption failed]" };
          }
        })
      );
      return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // encrypt_and_store – encrypts body and inserts into specified table
    if (action === "encrypt_and_store") {
      const { table, row } = await req.json().catch(() => ({ table: null, row: null }));
      // This path handled by the client calling encrypt first then inserting
      return new Response(JSON.stringify({ error: "Use encrypt action then insert client-side" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use encrypt, decrypt, or decrypt_batch" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
