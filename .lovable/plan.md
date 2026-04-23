
## Fix solc compilation timeout

The browser is timing out compiling Solidity because solc-js (~10MB) runs on the main thread and blocks the UI. Two complementary fixes:

### 1. Move compilation into a Web Worker
Create `src/workers/solcWorker.ts` — a dedicated worker that loads soljson + the wrapper off the main thread, resolves OpenZeppelin imports, and returns artifacts. The main thread stays responsive and the browser won't kill the tab.

### 2. Stream progress + remove the timeout race
Currently `solcCompiler.ts` has a 60s `Promise.race` timeout on runtime init. On slower mobile networks the 10MB CDN download alone can exceed that. We'll:
- Drop the artificial timeout (let the worker run as long as it needs).
- Post `progress` messages from the worker (`loading-compiler`, `fetching-imports`, `compiling`) so the UI shows live status instead of a frozen spinner.

### 3. Cache the compiler in IndexedDB
First run downloads soljson once, caches the script text in IndexedDB, and subsequent compiles load it instantly via `eval`/`Blob` URL inside the worker. Cuts repeat compiles from ~60s to ~3s.

### Files to change
- **New** `src/workers/solcWorker.ts` — worker that owns solc lifecycle, OZ import resolution, and compilation.
- **Rewrite** `src/lib/solcCompiler.ts` — thin wrapper that spawns the worker with `new Worker(new URL('../workers/solcWorker.ts', import.meta.url), { type: 'module' })`, forwards sources, and surfaces `onProgress` callbacks. Public API `compileContracts(sources, onProgress?)` stays backward-compatible.
- **Update** `src/pages/admin/AdminDeployContracts.tsx` — pass an `onProgress` handler that updates a status string under the Deploy button (e.g., "Downloading compiler 42%…", "Resolving imports…", "Compiling 3 contracts…"), so the user sees activity instead of assuming it hung.

### Why this fixes the timeout
- Main-thread blocking is the actual root cause of "timeout" symptoms — Chrome/Safari throttle or kill long synchronous WASM/asm.js work on the UI thread, especially on mobile. Workers have no such limit.
- The `onRuntimeInitialized` 60s guard was firing on slow connections before solc even finished downloading. Removing it (worker context) eliminates the false timeout.
- IndexedDB caching makes subsequent attempts near-instant, so retries during debugging don't compound.

### Out of scope (not needed)
- No edge function changes — the function already accepts pre-compiled artifacts and works correctly.
- No server-side compilation — already proven to hit `WORKER_RESOURCE_LIMIT` on Supabase edge runtime.
