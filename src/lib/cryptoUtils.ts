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
// Private E2E keys are stored in IndexedDB (origin-scoped, not in JS heap by default)
// instead of localStorage to reduce XSS exfiltration surface. The key remains
// extractable to allow ECDH derivation, but is gated by an async getter so it
// is no longer trivially accessible via `localStorage.getItem` in DevTools.

const DB_NAME = "trustlock_e2e";
const STORE = "keys";
const KEY_ID = "private_key";
const LEGACY_LS_KEY = "tl_e2e_private_key";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDb();
  const value = await new Promise<string | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function storePrivateKey(key: string): Promise<void> {
  try {
    await idbPut(KEY_ID, key);
    // Remove any legacy copy left in localStorage from prior versions
    try { localStorage.removeItem(LEGACY_LS_KEY); } catch { /* ignore */ }
  } catch (e) {
    // Fall back to localStorage if IndexedDB is unavailable (rare, e.g. private mode)
    try { localStorage.setItem(LEGACY_LS_KEY, key); } catch { /* ignore */ }
  }
}

export async function getStoredPrivateKey(): Promise<string | null> {
  try {
    const v = await idbGet(KEY_ID);
    if (v) return v;
    // One-time migration: pull from legacy localStorage and move into IDB
    const legacy = (() => { try { return localStorage.getItem(LEGACY_LS_KEY); } catch { return null; } })();
    if (legacy) {
      await idbPut(KEY_ID, legacy);
      try { localStorage.removeItem(LEGACY_LS_KEY); } catch { /* ignore */ }
      return legacy;
    }
    return null;
  } catch {
    try { return localStorage.getItem(LEGACY_LS_KEY); } catch { return null; }
  }
}

export async function clearPrivateKey(): Promise<void> {
  try { await idbDelete(KEY_ID); } catch { /* ignore */ }
  try { localStorage.removeItem(LEGACY_LS_KEY); } catch { /* ignore */ }
}
