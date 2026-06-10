import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Shield, ShoppingBag, Store, Landmark, FlaskConical, Globe } from "lucide-react";

interface PortalPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "login" | "signup";
}

type Portal = {
  role: string;
  label: string;
  sublabel: string;
  desc: string;
  icon: typeof Store;
  mainnetLogin: string;
  mainnetSignup: string;
  testnetLogin: string;
  // Sandbox/testnet signup falls back to the testnet login (sandbox flow handles enrollment).
};

const portals: Portal[] = [
  {
    role: "vendor",
    label: "Vendor",
    sublabel: "(Contractor · Supplier · Exporter)",
    desc: "Sell products & services with escrow protection",
    icon: Store,
    mainnetLogin: "/trustlock/vendor/login",
    mainnetSignup: "/trustlock/vendor/signup",
    testnetLogin: "/trustlock/vendor/sandbox/login",
  },
  {
    role: "buyer",
    label: "Buyer",
    sublabel: "(Investor · Client · Funder · Principal)",
    desc: "Shop securely with funds held in escrow",
    icon: ShoppingBag,
    mainnetLogin: "/trustlock/buyer/login",
    mainnetSignup: "/trustlock/buyer/signup",
    testnetLogin: "/trustlock/buyer/sandbox/login",
  },
  {
    role: "lender",
    label: "Lender",
    sublabel: "(Bank · DFI · Fund Manager)",
    desc: "Finance vendors & manage loan portfolios",
    icon: Landmark,
    mainnetLogin: "/trustlock/lender/login",
    mainnetSignup: "/trustlock/lender/signup",
    testnetLogin: "/trustlock/lender/sandbox/login",
  },
  {
    role: "admin",
    label: "Admin",
    sublabel: "",
    desc: "Manage platform operations & compliance",
    icon: Shield,
    mainnetLogin: "/trustlock/admin/login",
    mainnetSignup: "/trustlock/admin/login",
    testnetLogin: "/trustlock/admin/sandbox/login",
  },
];

const PortalPicker = ({ open, onOpenChange, mode }: PortalPickerProps) => {
  const navigate = useNavigate();
  const [section, setSection] = useState<string>("mainnet");

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const renderPortalList = (network: "mainnet" | "testnet") => (
    <div className="space-y-2 pt-2">
      {portals.map((p) => {
        const path =
          network === "mainnet"
            ? mode === "login"
              ? p.mainnetLogin
              : p.mainnetSignup
            : p.testnetLogin;
        return (
          <Button
            key={`${network}-${p.role}`}
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3 px-4"
            onClick={() => go(path)}
          >
            <p.icon className="w-5 h-5 text-primary shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold">
                {p.label}{" "}
                {p.sublabel && (
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {p.sublabel}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground font-normal">{p.desc}</p>
            </div>
          </Button>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "Log In" : "Get Started"}</DialogTitle>
          <DialogDescription>
            Select a network, then choose your portal.
          </DialogDescription>
        </DialogHeader>

        <Accordion
          type="single"
          collapsible
          value={section}
          onValueChange={(v) => setSection(v)}
          className="w-full"
        >
          <AccordionItem value="mainnet">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Mainnet</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  Live network · Real funds
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>{renderPortalList("mainnet")}</AccordionContent>
          </AccordionItem>

          <AccordionItem value="testnet">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-testnet" />
                <span className="text-sm font-semibold">Testnet (Sandbox)</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  Practice mode · No real funds
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>{renderPortalList("testnet")}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </DialogContent>
    </Dialog>
  );
};

export default PortalPicker;
