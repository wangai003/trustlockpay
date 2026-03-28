// Phase 2: Corridor-specific onboarding — customize first-run experience by industry
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Pickaxe, Wheat, Ship, Building2, Fuel,
  CheckCircle2, ArrowRight, Globe, Shield,
} from "lucide-react";

interface CorridorOnboardingProps {
  role: "vendor" | "buyer";
  onComplete: (corridor: CorridorConfig) => void;
}

export interface CorridorConfig {
  industry: string;
  corridor: string;
  preferredCurrency: string;
  preferredLanguage: string;
  notificationChannels: string[];
}

const corridors = [
  {
    id: "ng_oil",
    label: "Nigerian Oil & Gas Services",
    icon: Fuel,
    industry: "mining",
    description: "Oil services, gas equipment, petrochemical exports",
    defaultCurrency: "NGN",
    features: ["LC replacement", "Milestone-based payments", "Insurance verification"],
  },
  {
    id: "gh_cocoa",
    label: "Ghanaian Cocoa & Commodities",
    icon: Wheat,
    industry: "agriculture",
    description: "Cocoa beans, cashews, shea butter exports",
    defaultCurrency: "GHS",
    features: ["Quality grading gates", "Phytosanitary docs", "Export permits"],
  },
  {
    id: "ke_agriculture",
    label: "Kenyan Agriculture & Floriculture",
    icon: Wheat,
    industry: "agriculture",
    description: "Tea, coffee, flowers, avocados, horticulture",
    defaultCurrency: "KES",
    features: ["Cold chain tracking", "M-Pesa payouts", "Phytosanitary gates"],
  },
  {
    id: "za_mining",
    label: "South African Mining & Minerals",
    icon: Pickaxe,
    industry: "mining",
    description: "Gold, platinum, chrome, manganese exports",
    defaultCurrency: "ZAR",
    features: ["Assay certificate gates", "Multi-phase drilling", "Observer verification"],
  },
  {
    id: "ea_logistics",
    label: "East African Logistics & Freight",
    icon: Ship,
    industry: "logistics",
    description: "Cross-border freight, port operations, warehousing",
    defaultCurrency: "KES",
    features: ["GPS-verified milestones", "Pay-per-leg model", "Bill of lading gates"],
  },
  {
    id: "wa_construction",
    label: "West African Construction & Real Estate",
    icon: Building2,
    industry: "construction",
    description: "Infrastructure, commercial buildings, housing",
    defaultCurrency: "NGN",
    features: ["Building permits", "Staged payments", "Environmental clearance"],
  },
];

const currencies = [
  { code: "USD", label: "US Dollar ($)" },
  { code: "NGN", label: "Nigerian Naira (₦)" },
  { code: "KES", label: "Kenyan Shilling (KSh)" },
  { code: "ZAR", label: "South African Rand (R)" },
  { code: "GHS", label: "Ghanaian Cedi (GH₵)" },
  { code: "UGX", label: "Ugandan Shilling (USh)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
];

const languages = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "sw", label: "Kiswahili" },
  { code: "ar", label: "العربية" },
];

const CorridorOnboarding = ({ role, onComplete }: CorridorOnboardingProps) => {
  const [selectedCorridor, setSelectedCorridor] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("en");
  const [channels, setChannels] = useState<string[]>(["email"]);

  const corridor = corridors.find((c) => c.id === selectedCorridor);

  const toggleChannel = (ch: string) => {
    setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  };

  const handleComplete = () => {
    if (!corridor) return;
    onComplete({
      industry: corridor.industry,
      corridor: corridor.id,
      preferredCurrency: currency,
      preferredLanguage: language,
      notificationChannels: channels,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg text-foreground">Select Your Trade Corridor</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          This customizes your dashboard, milestones, compliance documents, and payment rails
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {corridors.map((c) => {
          const Icon = c.icon;
          const isSelected = selectedCorridor === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCorridor(c.id);
                setCurrency(c.defaultCurrency);
              }}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.label}</p>
                  <p className="text-[11px] text-muted-foreground">{c.description}</p>
                </div>
              </div>
              {isSelected && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 flex flex-wrap gap-1">
                  {c.features.map((f) => (
                    <Badge key={f} variant="outline" className="text-[9px]">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> {f}
                    </Badge>
                  ))}
                </motion.div>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {corridor && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Configure Preferences</CardTitle>
                <CardDescription className="text-xs">These can be changed later in Settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Preferred Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (<SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {languages.map((l) => (<SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Notification Channels</Label>
                  <div className="flex flex-wrap gap-2">
                    {["email", "sms", "whatsapp", "in_app"].map((ch) => (
                      <button
                        key={ch}
                        onClick={() => toggleChannel(ch)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                          channels.includes(ch)
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {ch === "in_app" ? "In-App" : ch.charAt(0).toUpperCase() + ch.slice(1)}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    SMS & WhatsApp notifications require phone number verification (coming soon)
                  </p>
                </div>

                <Button className="w-full gap-2" onClick={handleComplete}>
                  Continue with {corridor.label} <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CorridorOnboarding;
