import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const codeSnippet = `<!-- Add TrustLock Pay to your checkout page -->
<script src="https://cdn.azix.world/trustlock-pay.js"></script>
<div id="trustlock-pay-widget"></div>

<script>
  TrustLockPay.init({
    vendorId: "your-vendor-id",
    apiKey: "tlp_live_...",
    currency: "USD",
    theme: "light",
    onSuccess: (tx) => {
      console.log("Escrow created:", tx.id);
    },
    onError: (err) => {
      console.error("Payment failed:", err);
    }
  });
</script>`;

const TrustLockIntegration = () => {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    toast({ title: "Copied!", description: "Code snippet copied to clipboard." });
  };

  return (
    <section id="integrate" className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Integrate in Minutes
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Drop a single script tag into your checkout page and TrustLock handles the rest.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="mt-14 max-w-3xl mx-auto"
        >
          <Card className="border-primary/20 overflow-hidden">
            <div className="bg-green-dark px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground/30" />
                </div>
                <span className="text-xs text-primary-foreground/60 font-mono">checkout.html</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 h-7 px-2"
              >
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy
              </Button>
            </div>
            <CardContent className="p-0">
              <pre className="p-6 text-sm font-mono text-foreground overflow-x-auto leading-relaxed bg-muted/30">
                <code>{codeSnippet}</code>
              </pre>
            </CardContent>
          </Card>

          <div className="mt-8 grid sm:grid-cols-3 gap-4 text-center">
            {[
              { step: "1", title: "Get API Keys", desc: "Sign up and receive your vendor credentials" },
              { step: "2", title: "Add Script Tag", desc: "Paste the code into your checkout page" },
              { step: "3", title: "Accept Payments", desc: "Start receiving escrow-protected payments" },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {s.step}
                </div>
                <h4 className="mt-2 font-heading font-bold text-sm text-foreground">{s.title}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustLockIntegration;
