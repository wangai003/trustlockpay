// Thin wrapper that runs solc in a Web Worker. Public API is backward-compatible.
// Optional onProgress callback receives live status updates from the worker.

export interface CompiledArtifact {
  abi: any[];
  bytecode: string;
}

export interface CompileProgress {
  phase: string;
  detail?: string;
  pct?: number;
}

let worker: Worker | null = null;
let nextId = 1;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("../workers/solcWorker.ts", import.meta.url), { type: "module" });
  }
  return worker;
}

export async function compileContracts(
  sources: Record<string, string>,
  onProgress?: (p: CompileProgress) => void
): Promise<Record<string, Record<string, CompiledArtifact>>> {
  const w = getWorker();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      const msg = e.data;
      if (!msg) return;
      if (msg.type === "progress") {
        onProgress?.(msg.progress as CompileProgress);
        return;
      }
      if (msg.id !== id) return;
      w.removeEventListener("message", handler);
      if (msg.type === "result") resolve(msg.artifacts);
      else if (msg.type === "error") reject(new Error(msg.message));
    };
    w.addEventListener("message", handler);
    w.postMessage({ type: "compile", id, sources });
  });
}
