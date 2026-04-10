/**
 * Client-side encryption utilities for TrustLock messaging.
 *
 * - Server-side (admin channels): calls encrypt-message edge function
 * - Peer-to-peer (E2E): X25519 ECDH + AES-256-GCM via Web Crypto API
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ─── Server-side encryption helpers (admin/compliance channels) ─────────

export async function serverEncrypt(body: string): Promise<{ ciphertext: string; nonce: string }> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/encrypt-message`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action: "encrypt", body }),
    }
  );
  if (!res.ok) throw new Error("Encryption failed");
  return res.json();
}

export async function serverDecrypt(ciphertext: string, nonce: string): Promise<string> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/encrypt-message`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action: "decrypt", ciphertext, nonce }),
    }
  );
  if (!res.ok) throw new Error("Decryption failed");
  const data = await res.json();
  return data.plaintext;
}

export async function serverDecryptBatch(
  messages: { id: string; body: string; nonce: string }[]
): Promise<Record<string, string>> {
  if (messages.length === 0) return {};
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/encrypt-message`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action: "decrypt_batch", messages }),
    }
  );
  if (!res.ok) throw new Error("Batch decryption failed");
  const data = await res.json();
  const map: Record<string, string> = {};
  data.results.forEach((r: { id: string; plaintext: string }) => {
    map[r.id] = r.plaintext;
  });
  return map;
}

// ─── E2E encryption helpers (peer-to-peer buyer/vendor messages) ────────

export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const pubRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privRaw = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  return {
    publicKey: btoa(String.fromCharCode(...new Uint8Array(pubRaw))),
    privateKey: btoa(String.fromCharCode(...new Uint8Array(privRaw))),
  };
}

async function deriveSharedKey(
  myPrivateKeyB64: string,
  theirPublicKeyB64: string
): Promise<CryptoKey> {
  const privBytes = Uint8Array.from(atob(myPrivateKeyB64), (c) => c.charCodeAt(0));
  const pubBytes = Uint8Array.from(atob(theirPublicKeyB64), (c) => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"]
  );
  const publicKey = await crypto.subtle.importKey(
    "raw",
    pubBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256
  );

  return crypto.subtle.importKey("raw", sharedBits, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function e2eEncrypt(
  plaintext: string,
  myPrivateKeyB64: string,
  theirPublicKeyB64: string
): Promise<{ ciphertext: string; nonce: string }> {
  const key = await deriveSharedKey(myPrivateKeyB64, theirPublicKeyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    nonce: btoa(String.fromCharCode(...iv)),
  };
}

export async function e2eDecrypt(
  ciphertext: string,
  nonce: string,
  myPrivateKeyB64: string,
  theirPublicKeyB64: string
): Promise<string> {
  const key = await deriveSharedKey(myPrivateKeyB64, theirPublicKeyB64);
  const iv = Uint8Array.from(atob(nonce), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return decoder.decode(decrypted);
}

// ─── Key management helpers ─────────────────────────────────────────────

const PRIVATE_KEY_STORAGE = "tl_e2e_private_key";

export function storePrivateKey(key: string): void {
  localStorage.setItem(PRIVATE_KEY_STORAGE, key);
}

export function getStoredPrivateKey(): string | null {
  return localStorage.getItem(PRIVATE_KEY_STORAGE);
}

export function clearPrivateKey(): void {
  localStorage.removeItem(PRIVATE_KEY_STORAGE);
}
