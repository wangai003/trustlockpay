import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SwitchableRole = "vendor" | "buyer";

export function useRoleSwitcher(currentRole: SwitchableRole) {
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);

  const targetRole: SwitchableRole = currentRole === "vendor" ? "buyer" : "vendor";
  const targetLabel = targetRole === "vendor" ? "Vendor" : "Buyer";
  const targetPath = targetRole === "vendor" ? "/trustlock/vendor" : "/trustlock/buyer";

  const isMainnet = () => {
    const key = currentRole === "vendor" ? "tl_vendor_network" : "tl_buyer_network";
    return localStorage.getItem(key) === "mainnet";
  };

  const switchRole = useCallback(async () => {
    // Testnet mode — just navigate
    if (!isMainnet()) {
      const targetAuthKey = targetRole === "vendor" ? "tl_vendor_auth" : "tl_buyer_auth";
      const targetNetKey = targetRole === "vendor" ? "tl_vendor_network" : "tl_buyer_network";
      localStorage.setItem(targetAuthKey, "true");
      localStorage.setItem(targetNetKey, "testnet");
      navigate(targetPath);
      toast.success(`Switched to ${targetLabel} dashboard (Testnet)`);
      return;
    }

    // Mainnet mode — check session & add role if needed
    setSwitching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in first");
        setSwitching(false);
        return;
      }

      // Check if user already has the target role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", targetRole)
        .maybeSingle();

      if (!existingRole) {
        // Add the new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: targetRole });

        if (error) {
          toast.error("Could not activate role. Try again.");
          setSwitching(false);
          return;
        }
      }

      // Set auth flags for target dashboard
      const targetAuthKey = targetRole === "vendor" ? "tl_vendor_auth" : "tl_buyer_auth";
      const targetNetKey = targetRole === "vendor" ? "tl_vendor_network" : "tl_buyer_network";
      localStorage.setItem(targetAuthKey, "true");
      localStorage.setItem(targetNetKey, "mainnet");

      navigate(targetPath);
      toast.success(`Switched to ${targetLabel} dashboard`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSwitching(false);
    }
  }, [targetRole, targetLabel, targetPath, navigate]);

  return { switchRole, switching, targetLabel, targetRole };
}
