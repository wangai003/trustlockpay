import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2, User, Briefcase } from "lucide-react";

export type EntityType = "individual" | "company" | "sole_proprietor";

interface EntityTypeSelectorProps {
  entityType: EntityType;
  onEntityTypeChange: (type: EntityType) => void;
  companyName: string;
  onCompanyNameChange: (name: string) => void;
  role: "vendor" | "buyer";
}

const options: { value: EntityType; label: string; desc: string; icon: typeof User }[] = [
  { value: "individual", label: "Individual", desc: "Personal account", icon: User },
  { value: "company", label: "Company", desc: "Corporation / LLC / Ltd", icon: Building2 },
  { value: "sole_proprietor", label: "Sole Proprietor", desc: "Self-employed / freelancer", icon: Briefcase },
];

const EntityTypeSelector = ({
  entityType,
  onEntityTypeChange,
  companyName,
  onCompanyNameChange,
  role,
}: EntityTypeSelectorProps) => {
  const showCompanyName = entityType === "company" || entityType === "sole_proprietor";

  return (
    <div className="space-y-3">
      <Label>
        {role === "vendor" ? "I'm registering as" : "I'm signing up as"}
      </Label>
      <RadioGroup
        value={entityType}
        onValueChange={(v) => onEntityTypeChange(v as EntityType)}
        className="grid grid-cols-3 gap-2"
      >
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex flex-col items-center gap-1 rounded-lg border p-3 cursor-pointer transition-colors text-center ${
              entityType === opt.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <RadioGroupItem value={opt.value} className="sr-only" />
            <opt.icon className={`w-4 h-4 ${entityType === opt.value ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-xs font-medium">{opt.label}</span>
          </label>
        ))}
      </RadioGroup>

      {showCompanyName && (
        <div className="space-y-2">
          <Label htmlFor="companyName">
            {entityType === "company" ? "Company Name" : "Business / Trade Name"}
          </Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            placeholder={entityType === "company" ? "Acme Corp Ltd" : "My Freelance Business"}
            required
          />
        </div>
      )}
    </div>
  );
};

export default EntityTypeSelector;
