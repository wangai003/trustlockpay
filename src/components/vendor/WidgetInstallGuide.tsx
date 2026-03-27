import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle, ChevronDown, ChevronUp, HelpCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface WidgetInstallGuideProps {
  platform: string;
  siteId: string;
  vendorSlug: string;
}

const SCRIPT_TAG = (siteId: string, vendorSlug: string) =>
  `<script src="https://cdn.trustlock.africa/widget.js" data-site-id="${siteId}" data-vendor-id="${vendorSlug}"></script>`;

type PlatformGuide = {
  steps: { title: string; detail: string }[];
  videoLabel?: string;
  tip?: string;
};

const PLATFORM_GUIDES: Record<string, PlatformGuide> = {
  Shopify: {
    steps: [
      { title: "Log in to your Shopify admin", detail: "Go to your Shopify dashboard at your-store.myshopify.com/admin" },
      { title: "Go to Online Store → Themes", detail: "In the left sidebar, click "Online Store", then click "Themes"" },
      { title: "Click "Edit code"", detail: "On your current theme, click the three-dot menu (⋯) and select "Edit code"" },
      { title: "Open theme.liquid", detail: "In the left file list under "Layout", click on theme.liquid" },
      { title: "Paste the widget code", detail: "Scroll to the bottom. Find the </body> tag. Paste the TrustLock code on the line ABOVE </body>" },
      { title: "Click Save", detail: "Click the green "Save" button in the top-right corner. Done!" },
    ],
    tip: "The widget will automatically appear on your checkout pages within 5 minutes.",
  },
  WooCommerce: {
    steps: [
      { title: "Log in to your WordPress admin", detail: "Go to your-site.com/wp-admin and log in" },
      { title: "Go to Appearance → Theme Editor", detail: "In the left sidebar, hover over "Appearance" and click "Theme File Editor"" },
      { title: "Select footer.php", detail: "On the right side, find and click on "footer.php" in the file list" },
      { title: "Paste the widget code", detail: "Find the </body> tag at the bottom. Paste the TrustLock code on the line ABOVE it" },
      { title: "Click Update File", detail: "Click the "Update File" button at the bottom. Done!" },
    ],
    tip: "Alternatively, use a plugin like "Insert Headers and Footers" to paste the code without editing theme files.",
  },
  WordPress: {
    steps: [
      { title: "Log in to WordPress admin", detail: "Go to your-site.com/wp-admin" },
      { title: "Install "Insert Headers and Footers" plugin", detail: "Go to Plugins → Add New, search for "WPCode", install and activate it" },
      { title: "Go to Code Snippets → Header & Footer", detail: "In the left sidebar, click "Code Snippets" then "Header & Footer"" },
      { title: "Paste in the Footer section", detail: "Paste the TrustLock widget code in the "Footer" text box" },
      { title: "Click Save Changes", detail: "Scroll down and click "Save Changes". Done!" },
    ],
    tip: "Using a plugin is the safest way — it keeps your code even when you change themes.",
  },
  Wix: {
    steps: [
      { title: "Log in to your Wix dashboard", detail: "Go to wix.com and open your site's dashboard" },
      { title: "Go to Settings → Custom Code", detail: "Click "Settings" in the left menu, then scroll down to "Custom Code"" },
      { title: 'Click "+ Add Custom Code"', detail: "Click the button to add a new code snippet" },
      { title: "Paste the widget code", detail: "Paste the TrustLock code in the code box" },
      { title: "Set placement to "Body - end"", detail: 'Under "Place Code in", select "Body - end" and choose which pages' },
      { title: "Click Apply", detail: "Click Apply to save. The widget will appear on your live site!" },
    ],
  },
  Squarespace: {
    steps: [
      { title: "Log in to Squarespace", detail: "Go to squarespace.com and open your website" },
      { title: "Go to Settings → Advanced → Code Injection", detail: "Navigate to Settings → Advanced → Code Injection" },
      { title: "Paste in the Footer section", detail: "Paste the TrustLock code in the "Footer" text area" },
      { title: "Click Save", detail: "Click Save at the top. Your widget is now live!" },
    ],
    tip: "Code Injection requires a Squarespace Business plan or higher.",
  },
  "Jumia Seller": {
    steps: [
      { title: "No code installation needed", detail: "Jumia is a managed marketplace — you cannot add custom scripts directly" },
      { title: "Use TrustLock standalone links instead", detail: "Go to your Standalone Links page to create payment links for your Jumia products" },
      { title: "Share links with buyers", detail: "Send your TrustLock payment link to buyers via Jumia's messaging or WhatsApp" },
    ],
    tip: "Standalone links give your Jumia buyers the same escrow protection without needing website access.",
  },
  "Konga Seller": {
    steps: [
      { title: "No code installation needed", detail: "Konga is a managed marketplace — custom scripts cannot be added" },
      { title: "Use TrustLock standalone links", detail: "Create standalone payment links from your dashboard for your Konga products" },
      { title: "Share with buyers", detail: "Send payment links via Konga chat, WhatsApp, or SMS" },
    ],
    tip: "Standalone links work perfectly for marketplace sellers who can't modify their storefront code.",
  },
  "Flutterwave Store": {
    steps: [
      { title: "Log in to Flutterwave dashboard", detail: "Go to dashboard.flutterwave.com" },
      { title: "Go to Store → Settings", detail: "Navigate to your store settings" },
      { title: "Find Custom Scripts or Integration section", detail: "Look for a section that allows adding third-party scripts" },
      { title: "Paste the TrustLock widget code", detail: "Add the code in the custom scripts area and save" },
    ],
    tip: "If your Flutterwave store doesn't support custom scripts, use standalone links instead.",
  },
  "Paystack Storefront": {
    steps: [
      { title: "Use standalone links", detail: "Paystack Storefronts don't support custom script injection" },
      { title: "Create payment links in your dashboard", detail: "Go to Standalone Links and generate an escrow-protected payment link" },
      { title: "Share with your customers", detail: "Send the link via email, WhatsApp, or social media" },
    ],
    tip: "Standalone links provide the full TrustLock checkout experience for your Paystack customers.",
  },
};

const DEFAULT_GUIDE: PlatformGuide = {
  steps: [
    { title: "Open your website editor", detail: "Log in to wherever you manage your website's code or settings" },
    { title: "Find the HTML editor", detail: "Look for a section where you can edit HTML, add custom code, or manage scripts" },
    { title: "Locate the </body> tag", detail: "Scroll to the very bottom of your HTML. Find the line that says </body>" },
    { title: "Paste the widget code above </body>", detail: "Copy the code below and paste it on the line JUST ABOVE </body>" },
    { title: "Save your changes", detail: "Click Save/Publish. Your TrustLock widget will be live!" },
  ],
  tip: "If you can't find where to paste code, most website builders have a "Custom Code" or "Embed" section in Settings.",
};

const WidgetInstallGuide = ({ platform, siteId, vendorSlug }: WidgetInstallGuideProps) => {
  const [showCode, setShowCode] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const guide = PLATFORM_GUIDES[platform] || DEFAULT_GUIDE;
  const scriptCode = SCRIPT_TAG(siteId, vendorSlug);
  const isMarketplace = ["Jumia Seller", "Konga Seller", "Paystack Storefront"].includes(platform);

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    toast.success("Widget code copied to clipboard!");
  };

  return (
    <div className="mt-3 bg-muted/20 rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-primary/5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">How to Install on {platform}</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {guide.steps.length} {guide.steps.length === 1 ? "step" : "steps"}
        </Badge>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-3">
        {guide.steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
            </div>
          </div>
        ))}

        {/* Tip */}
        {guide.tip && (
          <div className="flex items-start gap-2 mt-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
            <HelpCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Tip:</strong> {guide.tip}
            </p>
          </div>
        )}

        {/* Code block (hidden by default for marketplaces) */}
        {!isMarketplace && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-2 justify-between"
              onClick={() => setShowCode(!showCode)}
            >
              <span className="flex items-center gap-1.5">
                <Copy className="w-3 h-3" />
                {showCode ? "Hide widget code" : "Show widget code to copy"}
              </span>
              {showCode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>

            {showCode && (
              <div className="mt-2 space-y-2">
                <div className="bg-background rounded border border-border p-3 font-mono text-xs overflow-x-auto leading-relaxed">
                  {scriptCode}
                </div>
                <Button size="sm" className="gap-1.5 text-xs" onClick={handleCopy}>
                  <Copy className="w-3 h-3" /> Copy Code
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Marketplace alternative CTA */}
        {isMarketplace && (
          <div className="mt-2">
            <Button size="sm" variant="default" className="gap-1.5 text-xs" asChild>
              <a href="/trustlock/vendor/standalone-links">
                <ExternalLink className="w-3 h-3" /> Go to Standalone Links
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* Help footer */}
      <div className="px-4 py-2 bg-muted/10 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          Need help? Contact support or ask your TrustLock assistant for a walkthrough.
        </p>
      </div>
    </div>
  );
};

export default WidgetInstallGuide;
