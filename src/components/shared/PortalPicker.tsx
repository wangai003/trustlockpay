import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, ShoppingBag, Store, Landmark } from "lucide-react";

interface PortalPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "login" | "signup";
}

const portals = [
  {
    role: "vendor",
    label: "Vendor",
    desc: "Sell products & services with escrow protection",
    icon: Store,
    loginPath: "/trustlock/vendor/login",
    signupPath: "/trustlock/vendor/signup",
  },
  {
    role: "buyer",
    label: "Buyer",
    desc: "Shop securely with funds held in escrow",
    icon: ShoppingBag,
    loginPath: "/trustlock/buyer/login",
    signupPath: "/trustlock/buyer/signup",
  },
  {
    role: "lender",
    label: "Lender",
    desc: "Finance vendors & manage loan portfolios",
    icon: Landmark,
    loginPath: "/trustlock/lender/login",
    signupPath: "/trustlock/lender/signup",
  },
  {
    role: "admin",
    label: "Admin",
    desc: "Manage platform operations & compliance",
    icon: Shield,
    loginPath: "/trustlock/admin/login",
    signupPath: "/trustlock/admin/login",
  },
];

const PortalPicker = ({ open, onOpenChange, mode }: PortalPickerProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "Log In" : "Get Started"}</DialogTitle>
          <DialogDescription>
            {mode === "login"
              ? "Choose your portal to log in."
              : "Select how you'd like to use TrustLock."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {portals.map((p) => (
            <Button
              key={p.role}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 px-4"
              onClick={() => {
                onOpenChange(false);
                navigate(mode === "login" ? p.loginPath : p.signupPath);
              }}
            >
              <p.icon className="w-5 h-5 text-primary shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold">{p.label}</p>
                <p className="text-xs text-muted-foreground font-normal">{p.desc}</p>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PortalPicker;
