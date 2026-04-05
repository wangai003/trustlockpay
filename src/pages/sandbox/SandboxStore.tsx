import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SANDBOX_INDUSTRIES } from "./sandboxIndustryData";
import { SandboxCountdown } from "./SandboxCountdown";

const SandboxStore = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-sm text-foreground">TrustLock Sandbox</span>
              <span className="text-[10px] text-muted-foreground ml-2">Demo Marketplace</span>
            </div>
          </div>
          <SandboxCountdown />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Choose an Industry to Experience
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Select any vendor below to walk through a full escrow-protected checkout — from invoice to payment to milestone tracking. No real payments. No account needed.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SANDBOX_INDUSTRIES.map((ind, i) => (
            <motion.div key={ind.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Link to={`/sandbox/store/${ind.key}`}>
                <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ind.color} flex items-center justify-center text-2xl mb-3`}>
                      {ind.icon}
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{ind.label}</h3>
                    <p className="text-xs text-muted-foreground mb-1">{ind.vendorName}</p>
                    <p className="text-[11px] text-muted-foreground mb-3">{ind.vendorTagline}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {ind.milestones.length} milestones · {ind.documents.length} docs
                      </span>
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/sandbox/login">
            <Button variant="outline" size="sm">← Back to Sandbox Login</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SandboxStore;
