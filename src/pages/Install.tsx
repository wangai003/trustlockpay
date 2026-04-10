import { useState, useEffect } from "react";
import { Shield, Download, CheckCircle, Smartphone, Monitor, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm text-foreground">Install TrustLock</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 space-y-6 w-full">
        {isInstalled ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-primary mx-auto" />
              <h1 className="text-xl font-bold text-foreground">TrustLock is Installed!</h1>
              <p className="text-sm text-muted-foreground">
                You can now access TrustLock from your home screen like a native app.
              </p>
              <Button onClick={() => navigate("/")} className="mt-4">Open App</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Install TrustLock</h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Add TrustLock to your home screen for instant access, offline support, and a native app experience — no app store needed.
              </p>
            </div>

            {/* Benefits */}
            <div className="grid gap-3">
              {[
                { icon: Smartphone, title: "Works on Any Phone", desc: "iPhone, Android, tablets — install directly from your browser" },
                { icon: Download, title: "Offline Access", desc: "View orders, documents, and dashboards even without internet" },
                { icon: Monitor, title: "Full-Screen Experience", desc: "Runs like a native app — no browser chrome or address bar" },
              ].map((item) => (
                <Card key={item.title}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Install action */}
            {deferredPrompt ? (
              <Button size="lg" className="w-full gap-2" onClick={handleInstall}>
                <Download className="w-5 h-5" />
                Install TrustLock
              </Button>
            ) : isIOS ? (
              <Card className="border-primary/20">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">How to install on iPhone / iPad:</p>
                  <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Tap the <strong>Share</strong> button (the square with an arrow) at the bottom of Safari</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                    <li>Tap <strong>"Add"</strong> in the top right</li>
                  </ol>
                  <p className="text-[10px] text-muted-foreground/70">Note: This must be done in Safari. Chrome on iOS does not support installation.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-muted">
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-semibold text-foreground">How to install:</p>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>Open this page in <strong>Chrome</strong> or <strong>Edge</strong></li>
                    <li>Tap the browser menu (⋮) in the top right</li>
                    <li>Select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></li>
                  </ol>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Install;
