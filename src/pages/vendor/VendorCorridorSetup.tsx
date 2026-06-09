import { useNavigate } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import CorridorOnboarding from "@/components/shared/CorridorOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const VendorCorridorSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleComplete = async (cfg: any) => {
    if (user?.id) {
      const { error } = await supabase
        .from("profiles")
        .update({
          industry: cfg.industry,
          preferred_currency: cfg.preferredCurrency,
          preferred_language: cfg.preferredLanguage,
        })
        .eq("id", user.id);
      if (error) {
        toast.error("Saved locally — sync failed: " + error.message);
      } else {
        toast.success("Corridor preferences saved");
      }
    }
    navigate("/trustlock/vendor");
  };

  return (
    <div>
      <VendorHeader title="Corridor Setup" />
      <div className="p-3 sm:p-6 max-w-4xl mx-auto">
        <CorridorOnboarding role="vendor" onComplete={handleComplete} />
      </div>
    </div>
  );
};

export default VendorCorridorSetup;
