/// <reference lib="webworker" />
// Solc compilation worker. Runs off the main thread so the UI never freezes
// and the browser doesn't kill long-running asm.js init.

const SOLC_CDN = "https://binaries.soliditylang.org/bin/soljson-v0.8.24+commit.e11b9ed9.js";
const WRAPPER_CDN = "https://esm.sh/solc@0.8.24/wrapper.js";
const OZ_VERSION = "5.0.2";
const DB_NAME = "solc-cache";
const STORE = "scripts";
const CACHE_KEY = `soljson-${SOLC_CDN}`;

type Progress = { phase: string; detail?: string; pct?: number };
function post(progress: Progress) {
  (self as any).postMessage({ type: "progress", progress });
}

// ---------- IndexedDB cache ----------
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function cacheGet(key: string): Promise<string | null> {
  try {
    const db = await openDb();
    return await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).get(key);
      r.onsuccess = () => resolve((r.result as string) ?? null);
      r.onerror = () => reject(r.error);
    });
  } catch { return null; }
}
async function cachePut(key: string, val: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore cache errors */ }
}

// ---------- Fetch with progress ----------
async function fetchWithProgress(url: string, label: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch ${url} (${r.status})`);
  const total = Number(r.headers.get("content-length") || 0);
  if (!r.body || !total) {
    post({ phase: "downloading", detail: label });
    return await r.text();
  }
  const reader = r.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      post({ phase: "downloading", detail: label, pct: Math.round((received / total) * 100) });
    }
  }
  const buf = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) { buf.set(c, offset); offset += c.length; }
  return new TextDecoder().decode(buf);
}

// ---------- Load solc ----------
let solcInstance: any = null;
async function loadSolc(): Promise<any> {
  if (solcInstance) return solcInstance;

  post({ phase: "loading-compiler", detail: "Checking cache…" });
  let soljsonSrc = await cacheGet(CACHE_KEY);
  if (!soljsonSrc) {
    soljsonSrc = await fetchWithProgress(SOLC_CDN, "Solidity compiler (~10MB)");
    await cachePut(CACHE_KEY, soljsonSrc);
  } else {
    post({ phase: "loading-compiler", detail: "Loaded from cache" });
  }

  post({ phase: "initializing", detail: "Starting compiler runtime…" });
  const moduleReady = new Promise<any>((resolve) => {
    (self as any).Module = {
      onRuntimeInitialized() { resolve((self as any).Module); },
    };
  });
  // Execute soljson in worker scope. It attaches to self.Module.
  (0, eval)(soljsonSrc);
  const Module = await moduleReady;

  post({ phase: "initializing", detail: "Loading wrapper…" });
  const wrapperSrc = await fetchWithProgress(WRAPPER_CDN, "wrapper");
  // wrapper is an ES module — convert to a Blob and import it.
  const blobUrl = URL.createObjectURL(new Blob([wrapperSrc], { type: "text/javascript" }));
  const mod: any = await import(/* @vite-ignore */ blobUrl);
  URL.revokeObjectURL(blobUrl);
  const wrapper = mod.default || mod;
  solcInstance = wrapper(Module);
  return solcInstance;
}

// ---------- OZ import resolution ----------
const ozCache = new Map<string, string>();
async function fetchOZ(ozPath: string): Promise<string> {
  if (ozCache.has(ozPath)) return ozCache.get(ozPath)!;
  const url = `https://cdn.jsdelivr.net/npm/@openzeppelin/contracts@${OZ_VERSION}/${ozPath}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Cannot fetch @openzeppelin/contracts/${ozPath}`);
  const text = await r.text();
  ozCache.set(ozPath, text);
  return text;
}
async function resolveAllImports(sources: Record<string, string>): Promise<Record<string, string>> {
  const imports: Record<string, string> = {};
  let count = 0;
  async function scan(ozPath: string) {
    const key = `@openzeppelin/contracts/${ozPath}`;
    if (imports[key]) return;
    imports[key] = ""; // mark in-flight to dedupe
    const contents = await fetchOZ(ozPath);
    imports[key] = contents;
    count++;
    post({ phase: "fetching-imports", detail: `Resolved ${count} files` });
    const re = /import\s+(?:\{[^}]*\}\s+from\s+)?["']([^"']+)["']/g;
    const dir = ozPath.includes("/") ? ozPath.substring(0, ozPath.lastIndexOf("/")) : "";
    const tasks: Promise<void>[] = [];
    let m;
    while ((m = re.exec(contents)) !== null) {
      const imp = m[1];
      let resolved: string | null = null;
      if (imp.startsWith("@openzeppelin/contracts/")) {
        resolved = imp.replace("@openzeppelin/contracts/", "");
      } else if (imp.startsWith("./") || imp.startsWith("../")) {
        const parts = dir ? dir.split("/") : [];
        for (const seg of imp.split("/")) {
          if (seg === "." || seg === "") continue;
          if (seg === "..") parts.pop();
          else parts.push(seg);
        }
        resolved = parts.join("/");
      }
      if (resolved) tasks.push(scan(resolved));
    }
    await Promise.all(tasks);
  }
  for (const src of Object.values(sources)) {
    const re = /import\s+(?:\{[^}]*\}\s+from\s+)?["']([^"']+)["']/g;
    const tasks: Promise<void>[] = [];
    let m;
    while ((m = re.exec(src)) !== null) {
      if (m[1].startsWith("@openzeppelin/contracts/")) {
        tasks.push(scan(m[1].replace("@openzeppelin/contracts/", "")));
      }
    }
    await Promise.all(tasks);
  }
  return imports;
}

// ---------- Compile ----------
async function compile(sources: Record<string, string>) {
  const solc = await loadSolc();
  post({ phase: "fetching-imports", detail: "Resolving OpenZeppelin imports…" });
  const imports = await resolveAllImports(sources);

  const findImports = (path: string) => {
    if (imports[path]) return { contents: imports[path] };
    return { error: "File not found: " + path };
  };

  post({ phase: "compiling", detail: `Compiling ${Object.keys(sources).length} contracts…` });
  const input = {
    language: "Solidity",
    sources: Object.fromEntries(Object.entries(sources).map(([n, c]) => [n, { content: c }])),
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
      evmVersion: "paris",
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  if (output.errors) {
    const fatal = output.errors.filter((e: any) => e.severity === "error");
    if (fatal.length > 0) {
      throw new Error("Compilation failed:\n" + fatal.map((e: any) => e.formattedMessage).join("\n"));
    }
  }
  const result: Record<string, Record<string, { abi: any[]; bytecode: string }>> = {};
  for (const [file, contracts] of Object.entries(output.contracts || {})) {
    result[file] = {};
    for (const [name, c] of Object.entries(contracts as any)) {
      result[file][name] = {
        abi: (c as any).abi,
        bytecode: "0x" + (c as any).evm.bytecode.object,
      };
    }
  }
  return result;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, sources, id } = e.data || {};
  if (type !== "compile") return;
  try {
    const artifacts = await compile(sources);
    (self as any).postMessage({ type: "result", id, artifacts });
  } catch (err: any) {
    (self as any).postMessage({ type: "error", id, message: err?.message || String(err) });
  }
};

export {};
