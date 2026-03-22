import { CheckCircle, XCircle } from "lucide-react";

export interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

export const passwordRules: PasswordRule[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One number", test: (pw) => /\d/.test(pw) },
  { label: "One special character (!@#$%^&*)", test: (pw) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw) },
];

export const isPasswordStrong = (pw: string) => passwordRules.every((r) => r.test(pw));

export const PasswordStrengthMeter = ({ password }: { password: string }) => {
  if (!password) return null;
  const passed = passwordRules.filter((r) => r.test(password)).length;
  const pct = (passed / passwordRules.length) * 100;

  return (
    <div className="space-y-2 mt-2">
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${
            pct <= 25 ? "bg-destructive" : pct <= 50 ? "bg-accent" : pct <= 75 ? "bg-amber-500" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="space-y-1">
        {passwordRules.map((rule) => {
          const pass = rule.test(password);
          return (
            <div key={rule.label} className="flex items-center gap-1.5 text-[11px]">
              {pass ? (
                <CheckCircle className="w-3 h-3 text-primary shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
              <span className={pass ? "text-primary" : "text-muted-foreground"}>{rule.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
