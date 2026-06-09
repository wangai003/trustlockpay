import { useState } from "react";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

interface Props {
  /** Where to redirect after OAuth completes. Defaults to current page. */
  redirectTo?: string;
  /** Optional label tail e.g. "as Buyer" */
  context?: string;
}

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16.365 1.43c0 1.14-.46 2.23-1.21 3.04-.81.88-2.13 1.56-3.21 1.47-.13-1.09.4-2.23 1.15-3.05.83-.9 2.24-1.56 3.27-1.46zM20.4 17.18c-.55 1.27-.82 1.83-1.52 2.95-.98 1.56-2.36 3.5-4.07 3.52-1.52.02-1.91-.99-3.97-.98-2.06.01-2.49 1-4.01.98-1.71-.02-3.02-1.77-4-3.33-2.73-4.35-3.02-9.45-1.33-12.16C2.7 6.27 4.6 5.13 6.38 5.13c1.81 0 2.95 1 4.45 1 1.45 0 2.34-1 4.44-1 1.58 0 3.26.86 4.45 2.35-3.91 2.14-3.27 7.72.68 9.7z"/>
  </svg>
);

export const SocialLoginButtons = ({ redirectTo, context }: Props) => {
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);

  const handle = async (provider: "google" | "apple") => {
    try {
      setBusy(provider);
      const target = redirectTo ?? `${window.location.origin}${window.location.pathname}`;
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: target,
      });
      if (result.error) {
        toast.error(`Sign-in failed: ${result.error.message ?? "Unknown error"}`);
        setBusy(null);
      }
    } catch (e) {
      toast.error("Sign-in could not start");
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" onClick={() => handle("google")} disabled={!!busy} className="gap-2">
          <GoogleIcon /> {busy === "google" ? "..." : "Google"}
        </Button>
        <Button type="button" variant="outline" onClick={() => handle("apple")} disabled={!!busy} className="gap-2">
          <AppleIcon /> {busy === "apple" ? "..." : "Apple"}
        </Button>
      </div>
      {context && <p className="text-[10px] text-center text-muted-foreground">Signing in {context}</p>}
    </div>
  );
};

export default SocialLoginButtons;
