import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import EntityTypeSelector, { type EntityType } from "./EntityTypeSelector";

const EntityClassificationPrompt = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>("individual");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from("profiles")
      .select("entity_type_confirmed")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data && !data.entity_type_confirmed) {
          setOpen(true);
        }
      });
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    if ((entityType === "company" || entityType === "sole_proprietor") && !companyName.trim()) return;

    setSaving(true);
    await supabase.from("profiles").update({
      entity_type: entityType,
      company_name: entityType !== "individual" ? companyName.trim() : null,
      entity_type_confirmed: true,
    }).eq("id", user.id);
    setSaving(false);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Tell us about yourself</DialogTitle>
          <DialogDescription>
            This helps us tailor compliance requirements and documentation to your account type.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <EntityTypeSelector
            entityType={entityType}
            onEntityTypeChange={setEntityType}
            companyName={companyName}
            onCompanyNameChange={setCompanyName}
            role="buyer"
          />
          <Button
            onClick={handleSave}
            className="w-full"
            disabled={saving || ((entityType === "company" || entityType === "sole_proprietor") && !companyName.trim())}
          >
            {saving ? "Saving..." : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EntityClassificationPrompt;
