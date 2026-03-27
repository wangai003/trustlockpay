import { useState } from "react";
import { Shield, Lock, X, ChevronRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Visual mockup of what the TrustLock widget looks like on a vendor's
 * external checkout page. This is a PREVIEW ONLY — the actual widget
 * is rendered by David's widget.js loaded via script tag.
 */
const WidgetPreviewMockup = () => {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-foreground">Widget Preview — What buyers see on your site</p>
      <p className="text-[10px] text-muted-foreground">
        This is a preview of the TrustLock badge that appears on your checkout page. Click it to see the popup.
      </p>

      {/* Simulated vendor checkout area */}
      <div className="relative border border-border rounded-xl bg-background overflow-hidden">
        {/* Fake product area */}
        <div className="p-4 border-b border-border bg-muted/10">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Your Checkout Page</p>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-xl">📦</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Sample Product</p>
              <p className="text-xs text-muted-foreground">Qty: 1</p>
            </div>
            <p className="text-base font-bold">$250.00</p>
          </div>
        </div>

        {/* Shield Badge — this is what appears on the vendor site */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPopup(true)}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-lg border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-foreground leading-tight">Protected by TrustLock</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Escrow-secured payment</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>Funds held until delivery confirmed</span>
          </div>
        </div>

        {/* Popup Overlay Preview */}
        {showPopup && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 animate-in fade-in duration-200">
            <div className="bg-background rounded-xl border border-border shadow-xl w-[90%] max-w-sm mx-auto overflow-hidden">
              {/* Popup Header */}
              <div className="bg-[hsl(var(--green-dark,145,60%,12%))] p-4 flex items-center justify-between"
                style={{ background: "linear-gradient(135deg, hsl(145 60% 12%), hsl(145 50% 18%))" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">TrustLock Pay</p>
                    <p className="text-white/60 text-[10px]">Escrow Checkout</p>
                  </div>
                </div>
                <button onClick={() => setShowPopup(false)} className="text-white/60 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Popup Steps Preview */}
              <div className="p-4 space-y-3">
                {[
                  { step: 1, label: "Invoice Review", done: true },
                  { step: 2, label: "Compliance Screening", done: false },
                  { step: 3, label: "Acknowledgement", done: false },
                  { step: 4, label: "Sign Contract", done: false },
                  { step: 5, label: "Escrow Payment", done: false },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      s.done
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {s.done ? <CheckCircle className="w-3.5 h-3.5" /> : s.step}
                    </div>
                    <span className={`text-xs ${s.done ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Popup Footer */}
              <div className="p-4 border-t border-border bg-muted/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">Total (incl. fees)</span>
                  <span className="text-sm font-bold">$254.75</span>
                </div>
                <Button className="w-full text-xs gap-2" size="sm" onClick={() => setShowPopup(false)}>
                  <Shield className="w-3.5 h-3.5" /> Continue to Secure Checkout
                </Button>
                <p className="text-[9px] text-muted-foreground text-center mt-2">
                  Powered by TrustLock · An Azix Product
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Badge variant="outline" className="text-[9px]">
        Click the shield badge above to see the popup preview
      </Badge>
    </div>
  );
};

export default WidgetPreviewMockup;
