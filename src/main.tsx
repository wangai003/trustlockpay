import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { hydrateWalletConfig } from "./lib/feeEngine";

// Fire-and-forget: pull real custodian wallet addresses from edge function
hydrateWalletConfig();

// PWA guard: prevent service worker in iframes/preview environments
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

createRoot(document.getElementById("root")!).render(<App />);
