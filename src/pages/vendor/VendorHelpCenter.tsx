import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package, CreditCard, ShieldCheck, AlertTriangle, Globe, Settings,
  ArrowRight, Truck, ToggleRight, MessageSquare
} from "lucide-react";

const guides = [
  {
    title: "Getting Started",
    icon: Package,
    steps: [
      "Complete KYC verification (Settings → KYC & Verification)",
      "Add your website (My Sites → Add Site)",
      "Embed the TrustLock Pay widget on your checkout page",
      "Set your payout preferences (Settings → Payout Preferences)",
      "Receive your first escrow payment!",
    ],
  },
  {
    title: "Managing Orders & Deliveries",
    icon: Truck,
    steps: [
      "View new orders in Transactions → filter by 'In Escrow'",
      "Click 'Mark as Shipped' to update delivery status",
      "Or enable Auto-Delivery in Settings for automatic confirmation",
      "Buyer has 48 hours to confirm receipt or file a dispute",
      "Funds release automatically after the countdown",
    ],
  },
  {
    title: "Auto-Delivery Toggle",
    icon: ToggleRight,
    steps: [
      "Go to Settings → Fulfillment Automation",
      "Enable 'Auto-Delivery Confirmation'",
      "When payment is received, shipment status auto-updates",
      "Best for digital goods or high-volume sellers",
      "You can disable it anytime for manual control",
    ],
  },
  {
    title: "Payouts & Fees",
    icon: CreditCard,
    steps: [
      "Tier A (Managed): TrustLock handles fiat conversion (1.5% fee)",
      "Tier B (Self-Custody): Direct to your Polygon wallet (1.0% fee)",
      "Payouts process within 24-48 hours after escrow release",
      "View payout history in Payouts tab",
      "Platform fee: 2.5% (products) or 3% (services) per transaction",
    ],
  },
  {
    title: "KYC & Verification Tiers",
    icon: ShieldCheck,
    steps: [
      "Tier 1 (Basic): Email + phone → $500/transaction limit",
      "Tier 2 (Standard): Government ID + selfie → $5,000 limit",
      "Tier 3 (Enhanced): Business docs + bank statement → Unlimited",
      "Upload documents in KYC & Verification page",
      "Verification typically takes 24-48 hours",
    ],
  },
  {
    title: "Handling Disputes",
    icon: AlertTriangle,
    steps: [
      "You'll be notified when a buyer opens a dispute",
      "You have 48 hours to respond with evidence",
      "Upload tracking numbers, photos, and correspondence",
      "Emmanuel AI analyzes evidence and recommends resolution",
      "Admin makes the final decision — you can appeal once",
    ],
  },
  {
    title: "Integrating TrustLock Pay",
    icon: Globe,
    steps: [
      "Go to My Sites and add your website URL",
      "Copy the embed script tag provided",
      "Paste it into your website's checkout page",
      "TrustLock Pay button appears alongside other payment methods",
      "Works with Shopify, WooCommerce, and custom sites",
    ],
  },
  {
    title: "Using TrustLock Assist AI",
    icon: MessageSquare,
    steps: [
      "Access via the 'TrustLock Assist' tab in the sidebar",
      "Ask questions about platform features, orders, or policies",
      "First 20 queries per month are free",
      "If the AI can't resolve your issue, it'll suggest contacting Admin",
      "Use Contact Admin in Messages for complex issues",
    ],
  },
];

const VendorHelpCenter = () => (
  <div>
    <VendorHeader title="Help Center" />
    <div className="p-3 sm:p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="font-heading text-lg font-bold">How to Use TrustLock OS</h2>
        <p className="text-sm text-muted-foreground">Step-by-step guides for every feature. Tap a section to expand.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {guides.map((guide) => (
          <Card key={guide.title}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <guide.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">{guide.title}</h3>
              </div>
              <ol className="space-y-2 pl-1">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

export default VendorHelpCenter;
