import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, ArrowLeft, CheckCircle, FileText, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SANDBOX_INDUSTRIES } from "./sandboxIndustryData";
import { SandboxCountdown } from "./SandboxCountdown";

const SandboxStorePage = () => {
  const { industry } = useParams<{ industry: string }>();
  const navigate = useNavigate();
  const config = SANDBOX_INDUSTRIES.find(i => i.key === industry);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Industry not found</p>
          <Link to="/sandbox/store"><Button variant="outline">Back to Store</Button></Link>
        </div>
      </div>
    );
  }

  const subtotal = config.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const fee = Math.round(subtotal * 0.015 * 100) / 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Vendor site header */}
      <header className={`bg-gradient-to-r ${config.color} text-white`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <h1 className="font-bold text-sm">{config.vendorName}</h1>
              <p className="text-[10px] opacity-80">{config.vendorTagline}</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 text-[10px]">Sandbox Demo</Badge>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Link to="/sandbox/store" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-3 h-3" /> Back to Marketplace
        </Link>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Order Summary — {config.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {config.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.qty} {item.unit} × ${item.unitPrice.toLocaleString()}</p>
                      </div>
                      <p className="font-semibold">${(item.qty * item.unitPrice).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">TrustLock Escrow Fee (1.5%)</span><span>${fee.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold text-base pt-1"><span>Total</span><span>${(subtotal + fee).toLocaleString()}</span></div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 italic">{config.invoiceNote}</p>
              </CardContent>
            </Card>

            {/* Milestones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Escrow Milestone Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {config.milestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">{i + 1}</div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{m.title}</p>
                        {m.documentGate && <p className="text-[10px] text-muted-foreground">📄 Requires: {m.documentGate}</p>}
                      </div>
                      <Badge variant="outline" className="text-[10px]">{m.percentage}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Required Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {config.documents.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      <span className="flex-1">{d.name}</span>
                      <Badge variant="outline" className="text-[9px]">
                        {d.owner === "vendor" ? "(V) Vendor" : d.owner === "buyer" ? "(B) Buyer" : "(V/B) Either"}
                      </Badge>
                      {d.required && <Badge className="text-[9px] bg-red-100 text-red-700 border-red-200">Required</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar — TrustLock Widget */}
          <div className="space-y-4">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 text-center space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center mx-auto">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
                <p className="text-xs font-semibold text-foreground">Escrow-Protected Payment</p>
                <p className="text-[10px] text-muted-foreground">Your funds are held securely until all milestones are completed and you confirm delivery.</p>
                <Button
                  className="w-full"
                  onClick={() => navigate(`/sandbox/checkout/${config.key}`)}
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Pay with TrustLock — ${(subtotal + fee).toLocaleString()}
                </Button>
                <p className="text-[9px] text-muted-foreground">Powered by TrustLock Pay™</p>
              </CardContent>
            </Card>

            <SandboxCountdown />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SandboxStorePage;
