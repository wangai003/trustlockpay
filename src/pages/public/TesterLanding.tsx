import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Copy, CheckCircle, Code, Monitor, Smartphone, ArrowRight, Zap, Lock, Eye, ChevronDown, ChevronUp, Play } from "lucide-react";
import { toast } from "sonner";

const WIDGET_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || "dbajucxswcgxllmwxnia"}.supabase.co/functions/v1/widget-embed`;

const PLATFORM_TIPS: Record<string, { label: string; steps: string[] }> = {
  shopify: {
    label: "Shopify",
    steps: [
      "Go to Online Store → Themes → Edit code",
      "Open theme.liquid under Layout",
      "Scroll to the bottom, find </body>",
      "Paste the code on the line ABOVE </body>",
      "Click Save",
    ],
  },
  wordpress: {
    label: "WordPress / WooCommerce",
    steps: [
      "Install & activate the WPCode plugin",
      "Go to Code Snippets → Header & Footer",
      "Paste the code in the Footer section",
      "Click Save Changes",
    ],
  },
  wix: {
    label: "Wix",
    steps: [
      "Go to Settings → Custom Code",
      "Click + Add Custom Code",
      "Paste the code, set placement to Body - End",
      "Click Apply",
    ],
  },
  squarespace: {
    label: "Squarespace",
    steps: [
      "Go to Settings → Advanced → Code Injection",
      "Paste the code in the Footer section",
      "Click Save",
    ],
  },
  html: {
    label: "Custom HTML / Other",
    steps: [
      "Open your HTML file in any editor",
      "Find the </body> tag at the bottom",
      "Paste the code on the line above it",
      "Save the file and refresh your browser",
    ],
  },
};

const TesterLanding = () => {
  const [siteName, setSiteName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const siteSlug = siteName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "my-site";
  const vendorSlug = vendorName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tester";

  const snippet = `<script src="${WIDGET_URL}" data-site-id="${siteSlug}" data-vendor-id="${vendorSlug}" data-mode="sandbox"></script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = snippet;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success("Widget code copied to clipboard!");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-b from-primary/5 to-background border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Test the TrustLock Escrow Widget
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">
            Add buyer protection to your website in 30 seconds. Paste one line of code → a secure checkout shield appears → test the full escrow flow. No signups. No cost. Sandbox mode only.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Badge variant="secondary" className="gap-1 text-xs">
              <Zap className="w-3 h-3" /> 30-Second Install
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Lock className="w-3 h-3" /> Sandbox Mode
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Eye className="w-3 h-3" /> No Account Required
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Step 1: Generate Code */}
        <Card className="border-primary/20">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                1
              </div>
              <div>
                <h2 className="text-base font-semibold">Generate Your Widget Code</h2>
                <p className="text-xs text-muted-foreground">Enter your details to create a personalized embed snippet</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Your Site Name</Label>
                <Input
                  placeholder="e.g., my-shop"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Your Name / Business</Label>
                <Input
                  placeholder="e.g., john-doe"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Generated code */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Your widget code:</Label>
              <div className="bg-muted rounded-lg p-3 font-mono text-xs leading-relaxed break-all select-all border border-border">
                {snippet}
              </div>
              <Button onClick={handleCopy} className="gap-2 text-sm w-full sm:w-auto">
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Code"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Choose Platform */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                2
              </div>
              <div>
                <h2 className="text-base font-semibold">Paste It On Your Site</h2>
                <p className="text-xs text-muted-foreground">Select your platform for step-by-step instructions</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(PLATFORM_TIPS).map(([key, { label }]) => (
                <Button
                  key={key}
                  variant={selectedPlatform === key ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-9"
                  onClick={() => setSelectedPlatform(selectedPlatform === key ? null : key)}
                >
                  {label}
                </Button>
              ))}
            </div>

            {selectedPlatform && PLATFORM_TIPS[selectedPlatform] && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-2 border border-border animate-in fade-in-50">
                <p className="text-xs font-semibold">{PLATFORM_TIPS[selectedPlatform].label} Instructions:</p>
                <ol className="space-y-1.5">
                  {PLATFORM_TIPS[selectedPlatform].steps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs">
                      <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Test */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                3
              </div>
              <div>
                <h2 className="text-base font-semibold">Test the Widget</h2>
                <p className="text-xs text-muted-foreground">After pasting, refresh your site and try it out</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center space-y-2 border border-border">
                <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-medium">Look for the Shield</p>
                <p className="text-[10px] text-muted-foreground">A blue shield button with a green "DEMO" badge appears bottom-right</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center space-y-2 border border-border">
                <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-medium">Click It</p>
                <p className="text-[10px] text-muted-foreground">The escrow checkout form opens in a modal. Fill in test details.</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center space-y-2 border border-border">
                <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-medium">See the Flow</p>
                <p className="text-[10px] text-muted-foreground">Complete the test payment → get a demo confirmation code → done!</p>
              </div>
            </div>

            {/* Live Preview Toggle */}
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-2"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showPreview ? "Hide Live Preview" : "See What It Looks Like"}
            </Button>

            {showPreview && (
              <div className="relative bg-muted/20 rounded-lg border border-border overflow-hidden" style={{ height: 400 }}>
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground p-4">
                  <div className="text-center space-y-3">
                    <p className="font-medium">Your website content appears here</p>
                    <p className="text-[10px]">The TrustLock shield button floats in the bottom-right corner ↘</p>
                  </div>
                </div>
                {/* Simulated shield button */}
                <div className="absolute bottom-5 right-5 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #1a56db, #0ea5e9)",
                    animation: "pulse 2s infinite",
                  }}
                >
                  <Shield className="w-7 h-7 text-white" />
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    DEMO
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="text-base font-semibold">Common Questions</h2>
            <div className="space-y-3">
              {[
                { q: "Is this free?", a: "Yes. Sandbox mode is completely free. No account needed, no credit card, no charges." },
                { q: "Will it affect my live payments?", a: "No. Sandbox mode simulates the escrow flow. No real money moves. Your existing checkout is unaffected." },
                { q: "What happens when I'm ready to go live?", a: "Sign up for a TrustLock vendor account, configure your payout method, and switch data-mode from 'sandbox' to 'live'." },
                { q: "What platforms does it work on?", a: "Any site where you can add HTML: Shopify, WooCommerce, WordPress, Wix, Squarespace, custom-built sites, and more." },
                { q: "How do I remove it?", a: "Just delete the script tag from your site. The widget disappears instantly." },
              ].map((item, i) => (
                <div key={i} className="border-b border-border last:border-0 pb-2 last:pb-0">
                  <p className="text-xs font-medium">{item.q}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.a}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center space-y-3 pb-8">
          <p className="text-xs text-muted-foreground">
            Questions or feedback? Email{" "}
            <a href="mailto:support@azix.world" className="text-primary font-semibold hover:underline">
              support@azix.world
            </a>
          </p>
          <p className="text-[10px] text-muted-foreground">
            Powered by <strong className="text-primary">TrustLock</strong> — Escrow protection for every transaction.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TesterLanding;
