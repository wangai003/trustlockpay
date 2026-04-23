// Browser-side Solidity compiler using solc-js loaded from CDN.
// Compiles in the main thread (acceptable for one-off admin deploys).
// Recursively resolves @openzeppelin imports from jsdelivr.

declare global {
  interface Window {
    Module?: any;
    soljson?: any;
  }
}

const SOLC_CDN = "https://binaries.soliditylang.org/bin/soljson-v0.8.24+commit.e11b9ed9.js";
const OZ_VERSION = "5.0.2";

let solcPromise: Promise<any> | null = null;

async function loadSolc(): Promise<any> {
  if (solcPromise) return solcPromise;
  solcPromise = (async () => {
    // Load soljson UMD into global scope
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SOLC_CDN;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load solc compiler"));
      document.head.appendChild(script);
    });
    // solc-js wrapper from CDN as ESM
    const wrapperMod: any = await import(/* @vite-ignore */ "https://esm.sh/solc@0.8.24/wrapper.js");
    const wrapper = wrapperMod.default || wrapperMod;
    return wrapper((window as any).Module);
  })();
  return solcPromise;
}

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

  async function scan(ozPath: string) {
    const key = `@openzeppelin/contracts/${ozPath}`;
    if (imports[key]) return;
    const contents = await fetchOZ(ozPath);
    imports[key] = contents;
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

export interface CompiledArtifact {
  abi: any[];
  bytecode: string;
}

export async function compileContracts(
  sources: Record<string, string>
): Promise<Record<string, Record<string, CompiledArtifact>>> {
  const solc = await loadSolc();
  const imports = await resolveAllImports(sources);

  const findImports = (path: string) => {
    if (imports[path]) return { contents: imports[path] };
    return { error: "File not found: " + path };
  };

  const input = {
    language: "Solidity",
    sources: Object.fromEntries(
      Object.entries(sources).map(([n, c]) => [n, { content: c }])
    ),
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

  const result: Record<string, Record<string, CompiledArtifact>> = {};
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
