import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import TrustLockWatermark from "@/components/shared/TrustLockWatermark";
import trustlockLogo from "@/assets/trustlock-pay-logo.png";

const CURRENT_VERSION = 1;
const PLATFORM_DOMAIN = "trustlockpay.lovable.app";
const PLATFORM_EMAIL = `compliance@${PLATFORM_DOMAIN}`;

interface LenderLiabilityContractProps {
  userId: string;
  onSigned: () => void;
}

const LenderLiabilityContract = ({ userId, onSigned }: LenderLiabilityContractProps) => {
  const queryClient = useQueryClient();
  const [signature, setSignature] = useState("");
  const [title, setTitle] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [signing, setSigning] = useState(false);

  const { data: lenderProfile } = useQuery({
    queryKey: ["lender-profile-contract", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lender_profiles")
        .select("institution_name, institution_type")
        .eq("user_id", userId)
        .single();
      return data;
    },
  });

  const institutionName = lenderProfile?.institution_name || "Your Institution";
  const institutionType = lenderProfile?.institution_type || "Financing Entity";

  const handleSign = async () => {
    if (!signature.trim() || !title.trim() || !acknowledged) {
      toast.error("Please complete all required fields");
      return;
    }

    setSigning(true);
    try {
      // Get IP
      let ip = "unknown";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ip = ipData.ip;
      } catch {}

      // Insert liability contract
      const { error } = await supabase
        .from("liability_contracts")
        .insert({
          lender_id: userId,
          contract_version: CURRENT_VERSION,
          signature_text: signature.trim(),
          title_position: title.trim(),
          ip_address: ip,
          is_active: true,
          metadata: {
            institution_name: institutionName,
            institution_type: institutionType,
            signed_at_url: window.location.href,
            user_agent: navigator.userAgent,
          },
        });

      if (error) throw error;

      // Archive to protection_documents for admin
      await supabase.from("protection_documents").insert({
        document_type: "liability_contract",
        title: `Lender Liability Contract — ${institutionName}`,
        user_id: userId,
        role: "lender",
        retention_years: 7,
        signed_by_vendor: true,
        metadata: {
          lender_id: userId,
          institution_name: institutionName,
          institution_type: institutionType,
          contract_version: CURRENT_VERSION,
          signature_text: signature.trim(),
          title_position: title.trim(),
          ip_address: ip,
          signed_at: new Date().toISOString(),
          auto_generated: true,
        },
      });

      // Send notification to lender
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "liability_contract_signed",
        title: "✅ Liability Contract Signed",
        message: `You have signed the TrustLock Lender Liability Contract (v${CURRENT_VERSION}). A copy has been archived for your records.`,
        data: { contract_version: CURRENT_VERSION },
      });

      toast.success("Liability contract signed successfully");
      queryClient.invalidateQueries({ queryKey: ["lender-liability-contract"] });
      onSigned();
    } catch (err: any) {
      toast.error(err.message || "Failed to sign contract");
    } finally {
      setSigning(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const atBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
    if (atBottom) setScrolledToBottom(true);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[95vh] flex flex-col bg-card border border-border rounded-xl shadow-2xl overflow-hidden relative">
        {/* Watermark */}
        <TrustLockWatermark certificateId={`LC-${userId.slice(0, 8)}`} />

        {/* Header Bar */}
        <div className="bg-primary px-6 py-4 flex items-center gap-3 relative z-10 shrink-0">
          <img src={trustlockLogo} alt="TrustLock" className="h-8 w-auto brightness-0 invert" />
          <div>
            <h1 className="text-primary-foreground font-heading font-bold text-lg">
              LENDER LIABILITY CONTRACT
            </h1>
            <p className="text-primary-foreground/80 text-xs">
              Mandatory Agreement — Version {CURRENT_VERSION}
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-3 flex items-center gap-2 shrink-0 relative z-10">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive font-medium">
            You must read, acknowledge, and sign this contract before accessing the platform. This overlay cannot be dismissed.
          </p>
        </div>

        {/* Scrollable Contract Body */}
        <div className="flex-1 overflow-hidden relative z-10">
          <ScrollArea className="h-full" onScrollCapture={handleScroll}>
            <div className="px-6 py-5 space-y-5 text-sm text-foreground">
              {/* Preamble */}
              <div className="space-y-2">
                <h2 className="font-heading font-bold text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  LENDER LIABILITY & COMPLIANCE AGREEMENT
                </h2>
                <p className="text-muted-foreground text-xs">
                  Effective Date: April 10, 2026 &nbsp;|&nbsp; Issued by TrustLock (powered by Azix)
                </p>
              </div>

              <div className="space-y-1">
                <p>
                  This Lender Liability Contract ("<strong>Agreement</strong>") is entered into between{" "}
                  <strong>TrustLock</strong>, operated by <strong>Azix</strong> ("<strong>Platform</strong>"), and the
                  undersigned financing institution or individual lender ("<strong>Lender</strong>").
                </p>
                <p className="text-muted-foreground text-xs italic">
                  Institution: {institutionName} &nbsp;|&nbsp; Type: {institutionType}
                </p>
              </div>

              {/* Sections */}
              <ContractSection number={1} title="SCOPE & PURPOSE">
                <p>The Lender acknowledges that TrustLock operates as a trade escrow and settlement infrastructure platform. By accessing the Lender Portal, the Lender agrees to use the platform solely for lawful financing activities tied to verified escrow transactions managed by TrustLock.</p>
              </ContractSection>

              <ContractSection number={2} title="LENDER OBLIGATIONS">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Conduct independent due diligence on all financing recipients (vendors) prior to fund disbursement.</li>
                  <li>Comply with all applicable anti-money laundering (AML), counter-terrorism financing (CTF), and know-your-customer (KYC) regulations in the Lender's operating jurisdiction(s).</li>
                  <li>Report suspicious activities promptly through the platform's designated compliance channels.</li>
                  <li>Maintain accurate and current institutional registration and licensing documentation.</li>
                  <li>Adhere to the platform's tiered lending limits and exposure thresholds.</li>
                </ul>
              </ContractSection>

              <ContractSection number={3} title="PLATFORM LIMITATIONS">
                <p>TrustLock provides the platform for record-keeping, financing application workflow, certificate issuance, and optional milestone-linked repayment tracking. The Lender expressly acknowledges that:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>TrustLock is <strong>not</strong> a party to any financing agreement between the Lender and any vendor or borrower.</li>
                  <li>TrustLock does <strong>not</strong> guarantee repayment of any financing provided by the Lender.</li>
                  <li>TrustLock does <strong>not</strong> hold, manage, or disburse lending funds on behalf of the Lender.</li>
                  <li>Fund movements between Lender and Borrower occur <strong>off-platform</strong> and are the sole responsibility of the transacting parties.</li>
                </ul>
              </ContractSection>

              <ContractSection number={4} title="LIABILITY LIMITATIONS">
                <p>The Lender agrees that TrustLock, its affiliates, officers, directors, and employees shall not be held liable for:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Losses arising from the Lender's financing decisions, including defaults, fraud by borrowers, or misallocation of funds.</li>
                  <li>Regulatory actions taken against the Lender for non-compliance with applicable laws.</li>
                  <li>Interruptions, delays, or errors in the platform's operation, data processing, or notification systems.</li>
                  <li>Any disputes between the Lender and its financing recipients not directly related to escrow settlement operations.</li>
                </ul>
              </ContractSection>

              <ContractSection number={5} title="DATA & PRIVACY">
                <p>The Lender consents to TrustLock collecting, processing, and storing institutional and transactional data as necessary for platform operations, compliance monitoring, and regulatory reporting. All data handling is subject to the platform's Privacy Policy.</p>
              </ContractSection>

              <ContractSection number={6} title="KYB VERIFICATION REQUIREMENT">
                <p>The Lender acknowledges that full platform access is contingent upon completing the Know Your Business (KYB) verification process. Until KYB verification is approved by TrustLock administration, certain platform features may be restricted or unavailable.</p>
              </ContractSection>

              <ContractSection number={7} title="INDEMNIFICATION">
                <p>The Lender agrees to indemnify, defend, and hold harmless TrustLock and Azix from and against any claims, losses, damages, liabilities, and expenses (including reasonable legal fees) arising from or related to:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>The Lender's use of the platform in violation of this Agreement or applicable law.</li>
                  <li>Any financing activities conducted through or in connection with the platform.</li>
                  <li>Misrepresentation of the Lender's institutional status, capabilities, or licensing.</li>
                </ul>
              </ContractSection>

              <ContractSection number={8} title="TERMINATION">
                <p>TrustLock reserves the right to suspend or terminate the Lender's access at any time for violation of this Agreement, regulatory non-compliance, or conduct deemed harmful to the platform's integrity. Obligations under Sections 4, 5, and 7 survive termination.</p>
              </ContractSection>

              <ContractSection number={9} title="GOVERNING LAW">
                <p>This Agreement shall be governed by and construed in accordance with the laws of the applicable jurisdiction as determined by TrustLock's operational registration. Disputes shall be resolved through binding arbitration in accordance with the platform's Dispute Policy.</p>
              </ContractSection>

              <ContractSection number={10} title="DOCUMENT RETENTION">
                <p>This signed contract and all associated metadata will be retained for a minimum of <strong>seven (7) years</strong> in compliance with financial regulatory requirements. Copies are archived in both the Lender's and Administrator's document vaults.</p>
              </ContractSection>

              {/* Footer */}
              <div className="border-t border-border pt-4 mt-4 text-xs text-muted-foreground space-y-1">
                <p>TrustLock — Trade Escrow & Settlement Infrastructure</p>
                <p>Operated by Azix &nbsp;|&nbsp; {PLATFORM_EMAIL}</p>
                <p>Document retained for 7 years per compliance policy</p>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Signature Section */}
        <div className="border-t border-border px-6 py-4 space-y-3 bg-muted/30 relative z-10 shrink-0">
          {!scrolledToBottom && (
            <p className="text-xs text-muted-foreground text-center animate-pulse">
              ↓ Scroll to the bottom of the contract to enable signing
            </p>
          )}

          <div className="flex items-start gap-2">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(v) => setAcknowledged(!!v)}
              disabled={!scrolledToBottom}
            />
            <label htmlFor="acknowledge" className="text-xs text-foreground leading-tight cursor-pointer">
              I, the authorized representative of <strong>{institutionName}</strong>, have read, understood, and agree to be bound by all terms and conditions of this Lender Liability Contract.
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Full Legal Name (Signature)</label>
              <Input
                placeholder="Type your full name"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                disabled={!scrolledToBottom}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Title / Position</label>
              <Input
                placeholder="e.g. Chief Investment Officer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!scrolledToBottom}
                className="text-sm"
              />
            </div>
          </div>

          <Button
            onClick={handleSign}
            disabled={!signature.trim() || !title.trim() || !acknowledged || signing}
            className="w-full"
            size="lg"
          >
            {signing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Signing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Sign & Acknowledge Contract
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

const ContractSection = ({ number, title, children }: { number: number; title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h3 className="font-heading font-semibold text-sm text-foreground">
      {number}. {title}
    </h3>
    <div className="text-sm text-foreground/90 leading-relaxed">{children}</div>
  </div>
);

export default LenderLiabilityContract;
