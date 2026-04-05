import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, X, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ReturningBuyerBannerProps {
  /** Called after a successful sign-in so the parent can re-check skip logic */
  onSignedIn?: () => void;
}

const ReturningBuyerBanner = ({ onSignedIn }: ReturningBuyerBannerProps) => {
  const { user, signIn } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Already signed in
  if (user) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-primary shrink-0" />
        <p className="text-[11px] text-foreground">
          Signed in as <strong>{user.email}</strong> — previously completed steps will be skipped.
        </p>
      </div>
    );
  }

  if (dismissed) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed in! Skipping steps you've already completed.");
      onSignedIn?.();
    }
  };

  if (!expanded) {
    return (
      <div className="bg-muted/50 border border-border rounded-lg px-3 py-2 mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LogIn className="w-4 h-4 text-primary shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            Returning buyer? <button onClick={() => setExpanded(true)} className="text-primary font-medium hover:underline">Sign in</button> to skip steps you've already completed.
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
          <LogIn className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Sign in to fast-track checkout</span>
        </div>
        <button onClick={() => { setExpanded(false); setDismissed(true); }} className="text-muted-foreground hover:text-foreground p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <form onSubmit={handleLogin} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-8 text-xs flex-1"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="h-8 text-xs flex-1"
        />
        <Button type="submit" size="sm" className="h-8 text-xs px-4" disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Sign In"}
        </Button>
      </form>
      <p className="text-[10px] text-muted-foreground">
        Don't have an account? Continue as guest — you can create one after checkout.
      </p>
    </div>
  );
};

export default ReturningBuyerBanner;
