/**
 * Offline Task Queue — IndexedDB-based queue for completing tasks offline.
 * Tasks are queued locally and synced when connectivity returns.
 */

const DB_NAME = "trustlock_offline";
const STORE_NAME = "pending_actions";
const DB_VERSION = 1;

type QueuedAction = {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  created_at: string;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function queueOfflineAction(action: string, payload: Record<string, unknown>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const item: QueuedAction = {
    id: crypto.randomUUID(),
    action,
    payload,
    created_at: new Date().toISOString(),
  };
  store.add(item);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingActions(): Promise<QueuedAction[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function removeAction(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncOfflineActions(
  invoker: (action: string, payload: Record<string, unknown>) => Promise<boolean>
): Promise<{ synced: number; failed: number }> {
  const actions = await getPendingActions();
  let synced = 0;
  let failed = 0;
  for (const a of actions) {
    try {
      const ok = await invoker(a.action, a.payload);
      if (ok) {
        await removeAction(a.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  return { synced, failed };
}
