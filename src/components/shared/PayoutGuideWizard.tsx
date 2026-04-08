/**
 * PayoutGuideWizard — Scenario-specific interactive wizard
 * 
 * Guides buyers/vendors through what to expect and what actions to take
 * when a payout, refund, or split-payment event is triggered on their order.
 * Each scenario has unique messaging explaining the flow, required steps,
 * and expected timelines.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Info,
  Wallet, Building2, Smartphone, CreditCard, Shield, Globe,
  Clock, ArrowDown, Split, Undo2, DollarSign, FileCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Scenario types ── */
export type PayoutScenario =
  | "buyer_full_refund"
  | "buyer_split_refund"
  | "buyer_milestone_refund"
  | "vendor_full_release"
  | "vendor_split_release"
  | "vendor_milestone_release";

interface WizardStep {
  title: string;
  icon: React.ReactNode;
  description: string;
  details: string[];
  actionRequired?: boolean;
  actionLabel?: string;
}

interface ScenarioConfig {
  title: string;
  subtitle: string;
  badge: string;
  badgeVariant: "default" | "destructive" | "secondary" | "outline";
  icon: React.ReactNode;
  steps: WizardStep[];
}

const SCENARIOS: Record<PayoutScenario, ScenarioConfig> = {
  /* ── BUYER: Full Refund ── */
  buyer_full_refund: {
    title: "Your Full Refund",
    subtitle: "The vendor's funds are being returned to you in full.",
    badge: "Full Refund",
    badgeVariant: "destructive",
    icon: <Undo2 className="h-6 w-6" />,
    steps: [
      {
        title: "Refund Approved",
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        description: "A full refund has been approved for your order. The escrow funds will be returned to you.",
        details: [
          "The full order amount (minus any non-refundable processing fees) will be returned",
          "TrustLock's 1% escrow fee is waived on refunds — you receive the vendor's subtotal back",
          "The refund is initiated by the TrustLock admin team after review"
        ],
      },
      {
        title: "Enter Your Payment Details",
        icon: <Wallet className="h-5 w-5 text-primary" />,
        description: "Tell us exactly where to send your refund. Choose from the payment methods available for your region.",
        details: [
          "Go to your Order page → click 'Request Payout' or 'Receive Refund'",
          "Select your preferred payment method (bank transfer, mobile money, crypto wallet, etc.)",
          "Enter the account details carefully — funds cannot be recalled once sent",
          "You will be asked to confirm a disclaimer before submission"
        ],
        actionRequired: true,
        actionLabel: "Go to My Orders to enter details",
      },
      {
        title: "Admin Processing",
        icon: <Shield className="h-5 w-5 text-amber-500" />,
        description: "TrustLock's Finance team will process your refund using the details you provided.",
        details: [
          "An admin will enter your order number to trigger the automated refund sequence",
          "The system will route funds through the appropriate pathway for your payment method",
          "Crypto refunds are returned directly on-chain; fiat refunds go through off-ramp providers",
          "All movements are recorded on the blockchain proof chain for your protection"
        ],
      },
      {
        title: "Funds Arrive",
        icon: <DollarSign className="h-5 w-5 text-green-500" />,
        description: "Your refund is on its way! Delivery time depends on your chosen method.",
        details: [
          "Direct crypto (USDC): Usually within minutes",
          "Stripe reverse charge: 5–10 business days to original card",
          "Transak/Coinbase off-ramp: 1–3 business days",
          "Bank transfer / Mobile money: 2–5 business days depending on region"
        ],
      },
    ],
  },

  /* ── BUYER: Split Payment Refund ── */
  buyer_split_refund: {
    title: "Your Split-Payment Refund",
    subtitle: "A compromise was reached — you're receiving a partial refund of the escrow funds.",
    badge: "Split Payment",
    badgeVariant: "secondary",
    icon: <Split className="h-6 w-6" />,
    steps: [
      {
        title: "Compromise Reached",
        icon: <FileCheck className="h-5 w-5 text-blue-500" />,
        description: "After dispute resolution, a split-payment compromise has been agreed upon. You will receive your designated share.",
        details: [
          "The escrow funds have been divided between you and the vendor",
          "Your share is 100% of the buyer portion — no additional fees are deducted from your side",
          "The vendor's share has a 1% TrustLock escrow fee deducted from their portion"
        ],
      },
      {
        title: "Enter Your Payment Details",
        icon: <Wallet className="h-5 w-5 text-primary" />,
        description: "Let us know where to send your portion of the split. The same payment methods as a full refund are available.",
        details: [
          "Navigate to your Order page and select 'Receive Refund'",
          "Choose your preferred method — your region may determine which options are available",
          "Double-check your account details before confirming",
          "A disclaimer confirmation is required before submission"
        ],
        actionRequired: true,
        actionLabel: "Go to My Orders to enter details",
      },
      {
        title: "Dual Routing",
        icon: <Globe className="h-5 w-5 text-indigo-500" />,
        description: "TrustLock processes both sides simultaneously — your refund and the vendor's payout happen in parallel.",
        details: [
          "Your share is routed through the Refund Router (same as a full refund)",
          "The vendor's share is routed through the Payout Router separately",
          "Both movements are independently anchored to the blockchain proof chain",
          "You'll receive a confirmation once your funds have been dispatched"
        ],
      },
      {
        title: "Funds Arrive",
        icon: <DollarSign className="h-5 w-5 text-green-500" />,
        description: "Delivery time depends on your payment method — same timelines as a full refund.",
        details: [
          "Direct crypto: Minutes",
          "Stripe: 5–10 business days",
          "Off-ramp (Transak/Coinbase): 1–3 business days",
          "Bank/Mobile money: 2–5 business days"
        ],
      },
    ],
  },

  /* ── BUYER: Milestone Refund ── */
  buyer_milestone_refund: {
    title: "Your Milestone Refund",
    subtitle: "Unreleased milestone funds are being returned to you.",
    badge: "Milestone Refund",
    badgeVariant: "outline",
    icon: <Undo2 className="h-6 w-6" />,
    steps: [
      {
        title: "Milestone Refund Triggered",
        icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
        description: "One or more milestones were not completed, and the remaining escrowed funds tied to those milestones are being refunded.",
        details: [
          "Only the unreleased milestone amounts are refunded — previously released milestones are final",
          "The refund amount is calculated based on the milestone schedule agreed at checkout",
          "No additional TrustLock fees are deducted from refunded milestones"
        ],
      },
      {
        title: "Enter Your Payment Details",
        icon: <Wallet className="h-5 w-5 text-primary" />,
        description: "Provide your preferred payout method so we can return the unreleased milestone funds.",
        details: [
          "Go to your Order page → Milestones tab → 'Receive Refund'",
          "Select payment method and enter details",
          "Confirm disclaimer to authorize"
        ],
        actionRequired: true,
        actionLabel: "Go to My Orders",
      },
      {
        title: "Processing & Delivery",
        icon: <Clock className="h-5 w-5 text-muted-foreground" />,
        description: "Admin processes the milestone refund using your payment details. Same delivery timelines apply.",
        details: [
          "Crypto: Minutes  |  Stripe: 5–10 days  |  Off-ramp: 1–3 days  |  Bank: 2–5 days"
        ],
      },
    ],
  },

  /* ── VENDOR: Full Release ── */
  vendor_full_release: {
    title: "Your Full Payout",
    subtitle: "The buyer has confirmed delivery — your funds are being released from escrow.",
    badge: "Full Release",
    badgeVariant: "default",
    icon: <DollarSign className="h-6 w-6" />,
    steps: [
      {
        title: "Escrow Release Confirmed",
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        description: "The buyer has confirmed receipt of goods/services. Your escrowed funds are ready for payout.",
        details: [
          "99% of the remaining balance goes to you",
          "1% is retained by TrustLock as the escrow service fee",
          "The payout is triggered after admin verification of the release"
        ],
      },
      {
        title: "Enter Your Payout Details",
        icon: <Wallet className="h-5 w-5 text-primary" />,
        description: "Tell us how you'd like to receive your earnings. Choose from available payment rails for your region.",
        details: [
          "Go to your Dashboard → Payout section",
          "Select your preferred method: Stripe Connect, bank transfer, mobile money, or crypto wallet",
          "For crypto payouts, select your chain and enter your wallet address",
          "For bank transfers, enter your full banking details including SWIFT/routing codes",
          "Confirm the disclaimer to authorize the payout"
        ],
        actionRequired: true,
        actionLabel: "Go to Payout Settings",
      },
      {
        title: "Admin Execution",
        icon: <Shield className="h-5 w-5 text-amber-500" />,
        description: "TrustLock's Finance department processes your payout using the Payout Router.",
        details: [
          "An admin enters your order number to trigger the automated payout sequence",
          "Stripe Connect: Direct transfer to your connected account",
          "Transak off-ramp: USDC converted to your local currency",
          "Direct crypto: USDC sent to your wallet address",
          "Bank/Mobile money: Queued for manual processing by the finance team"
        ],
      },
      {
        title: "Funds Arrive",
        icon: <DollarSign className="h-5 w-5 text-green-500" />,
        description: "Your payout is on its way!",
        details: [
          "Direct crypto: Minutes",
          "Stripe Connect: 2–7 business days",
          "Transak off-ramp: 1–3 business days",
          "Bank/Mobile money: 2–5 business days"
        ],
      },
    ],
  },

  /* ── VENDOR: Split Release ── */
  vendor_split_release: {
    title: "Your Split-Payment Payout",
    subtitle: "A compromise was reached — you're receiving your designated share of the escrow.",
    badge: "Split Payment",
    badgeVariant: "secondary",
    icon: <Split className="h-6 w-6" />,
    steps: [
      {
        title: "Compromise Applied",
        icon: <FileCheck className="h-5 w-5 text-blue-500" />,
        description: "The dispute was resolved with a split-payment compromise. Your share has been calculated.",
        details: [
          "Your share is the vendor portion of the compromise minus the 1% TrustLock escrow fee",
          "The buyer receives their portion through a separate refund pathway",
          "Both movements happen simultaneously but through independent routes"
        ],
      },
      {
        title: "Enter Your Payout Details",
        icon: <Wallet className="h-5 w-5 text-primary" />,
        description: "Provide your preferred payment method so your share can be routed correctly.",
        details: [
          "Go to your Dashboard → Payout section",
          "Select method and enter account details",
          "Confirm the disclaimer to authorize"
        ],
        actionRequired: true,
        actionLabel: "Go to Payout Settings",
      },
      {
        title: "Processing & Delivery",
        icon: <Clock className="h-5 w-5 text-muted-foreground" />,
        description: "Your share is processed through the Payout Router with the same pathways as a full release.",
        details: [
          "Crypto: Minutes  |  Stripe: 2–7 days  |  Off-ramp: 1–3 days  |  Bank: 2–5 days"
        ],
      },
    ],
  },

  /* ── VENDOR: Milestone Release ── */
  vendor_milestone_release: {
    title: "Your Milestone Payout",
    subtitle: "A milestone has been approved — your fractional payout is being processed.",
    badge: "Milestone Release",
    badgeVariant: "outline",
    icon: <ArrowDown className="h-6 w-6" />,
    steps: [
      {
        title: "Milestone Approved",
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        description: "The buyer has approved this milestone. Your portion of the escrowed funds is being released.",
        details: [
          "You receive your milestone percentage minus a fractional portion of the 1% escrow fee",
          "The TrustLock fee is spread across all milestones proportionally — not deducted from just one",
          "Each milestone release is independently anchored to the blockchain proof chain"
        ],
      },
      {
        title: "Ensure Payout Details Are Set",
        icon: <Wallet className="h-5 w-5 text-primary" />,
        description: "Make sure your payout details are already on file. If not, enter them now before the admin processes this milestone.",
        details: [
          "Your payout method from previous milestones will be reused if already set",
          "If this is your first milestone, go to your Payout section to set up your payment method",
          "You can update your payment method between milestones if needed"
        ],
        actionRequired: true,
        actionLabel: "Check Payout Settings",
      },
      {
        title: "Processing & Delivery",
        icon: <Clock className="h-5 w-5 text-muted-foreground" />,
        description: "Same delivery timelines as a full release — routed through the Payout Router.",
        details: [
          "Crypto: Minutes  |  Stripe: 2–7 days  |  Off-ramp: 1–3 days  |  Bank: 2–5 days"
        ],
      },
    ],
  },
};

interface PayoutGuideWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenario: PayoutScenario;
  orderAmount?: number;
  userShare?: number;
  orderId?: string;
  onActionClick?: () => void;
}

export default function PayoutGuideWizard({
  open,
  onOpenChange,
  scenario,
  orderAmount,
  userShare,
  orderId,
  onActionClick,
}: PayoutGuideWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const config = SCENARIOS[scenario];
  const step = config.steps[currentStep];
  const isLast = currentStep === config.steps.length - 1;
  const isFirst = currentStep === 0;

  const handleNext = () => {
    if (isLast) {
      onOpenChange(false);
      setCurrentStep(0);
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) setCurrentStep((s) => s - 1);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setCurrentStep(0); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {config.icon}
            </div>
            <div>
              <DialogTitle className="text-lg">{config.title}</DialogTitle>
              <Badge variant={config.badgeVariant} className="mt-1 text-xs">
                {config.badge}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{config.subtitle}</p>
        </DialogHeader>

        {/* Amount summary */}
        {(orderAmount || userShare) && (
          <div className="flex gap-3 text-sm bg-muted/50 rounded-lg p-3">
            {orderAmount && (
              <div>
                <span className="text-muted-foreground">Order: </span>
                <span className="font-semibold">${orderAmount.toLocaleString()}</span>
              </div>
            )}
            {userShare && (
              <div>
                <span className="text-muted-foreground">Your share: </span>
                <span className="font-semibold text-green-600">${userShare.toLocaleString()}</span>
              </div>
            )}
            {orderId && (
              <div>
                <span className="text-muted-foreground">Order: </span>
                <span className="font-mono text-xs">{orderId.slice(0, 8)}</span>
              </div>
            )}
          </div>
        )}

        {/* Step progress */}
        <div className="flex items-center gap-1 my-2">
          {config.steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Step {currentStep + 1} of {config.steps.length}
        </p>

        <Separator />

        {/* Current step */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {step.icon}
            <h3 className="font-semibold">{step.title}</h3>
            {step.actionRequired && (
              <Badge variant="destructive" className="text-[10px] ml-auto">
                Action Required
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{step.description}</p>

          <ul className="space-y-2">
            {step.details.map((detail, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>

          {step.actionRequired && step.actionLabel && onActionClick && (
            <Button
              onClick={() => { onActionClick(); onOpenChange(false); setCurrentStep(0); }}
              className="w-full mt-2"
            >
              {step.actionLabel}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        <Separator />

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" size="sm" onClick={handleBack} disabled={isFirst}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button size="sm" onClick={handleNext}>
            {isLast ? "Done" : "Next"}
            {!isLast && <ArrowRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
