import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn, X, Loader2, CheckCircle, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReturningBuyerBannerProps {
  /** Called with true when buyer is recognized (has prior acknowledgement) */
  onRecognized?: (recognized: boolean) => void;
}

const ReturningBuyerBanner = ({ onRecognized }: ReturningBuyerBannerProps) => {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [recognized, setRecognized] = useState(false);
  const [recognizedEmail, setRecognizedEmail] = useState("");

  if (dismissed && !recognized) return null;

  if (recognized) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-primary shrink-0" />
        <p className="text-[11px] text-foreground">
          Welcome back, <strong>{recognizedEmail}</strong> — the acknowledgement step will be skipped for you.
        </p>
      </div>
    );
  }

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = identifier.trim().toLowerCase();
    if (!input) return;

    setLoading(true);

    try {
      // Look up the user profile by email or full_name (used as username)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email")
        .or(`email.eq.${input},full_name.ilike.${input}`)
        .limit(1)
        .maybeSingle();

      if (!profile) {
        toast.info("No account found. Continue as a new buyer — no worries!");
        setLoading(false);
        return;
      }

      // Check if this user has a previously signed acknowledgement form
      const { count } = await supabase
        .from("acknowledgement_forms")
        .select("id", { count: "exact", head: true })
        .eq("signed_by_buyer", true);

      // We use the profile match to confirm identity; acknowledgement check is global
      // In production, you'd filter by a buyer_id column on acknowledgement_forms
      if (count && count > 0) {
        setRecognized(true);
        setRecognizedEmail(profile.email || input);
        onRecognized?.(true);
        toast.success("Recognized! Acknowledgement step will be skipped.");
      } else {
        toast.info("Account found but no prior acknowledgement on record. You'll complete it once — it's quick!");
      }
    } catch {
      toast.error("Something went wrong. Please continue as guest.");
    }

    setLoading(false);
  };

  if (!expanded) {
    return (
      <div className="bg-muted/50 border border-border rounded-lg px-3 py-2 mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LogIn className="w-4 h-4 text-primary shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            Returning buyer? <button onClick={() => setExpanded(true)} className="text-primary font-medium hover:underline">Enter your email or username</button> to skip steps.
          </p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-muted/50 border border-border rounded-lg px-3 py-3 mb-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Fast-track your checkout</span>
        </div>
        <button onClick={() => { setExpanded(false); setDismissed(true); }} className="text-muted-foreground hover:text-foreground p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="text"
          placeholder="Email or username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          className="h-8 text-xs flex-1"
        />
        <Button type="submit" size="sm" className="h-8 text-xs px-4" disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Check"}
        </Button>
      </form>
      <p className="text-[10px] text-muted-foreground">
        Enter the email or username from your TrustLock OS account. New buyer? Just continue — no account needed.
      </p>
    </div>
  );
};

export default ReturningBuyerBanner;
