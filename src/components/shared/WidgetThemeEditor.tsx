// Phase 2: Widget theming — vendors customize their checkout widget appearance
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Shield, Palette, Eye, Save, CreditCard, Lock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WidgetThemeEditorProps {
  vendorId: string;
  vendorName?: string;
  currentTheme?: WidgetTheme;
  onSaved?: () => void;
}

export interface WidgetTheme {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  fontFamily: string;
  showPoweredBy: boolean;
  buttonText: string;
  logoUrl: string;
}

const defaultTheme: WidgetTheme = {
  primaryColor: "#166534",
  accentColor: "#D4A843",
  backgroundColor: "#ffffff",
  textColor: "#1a1a1a",
  borderRadius: "12",
  fontFamily: "system",
  showPoweredBy: true,
  buttonText: "Pay with TrustLock",
  logoUrl: "",
};

const fontOptions = [
  { value: "system", label: "System Default" },
  { value: "inter", label: "Inter" },
  { value: "poppins", label: "Poppins" },
  { value: "roboto", label: "Roboto" },
];

const WidgetThemeEditor = ({ vendorId, vendorName = "Vendor", currentTheme, onSaved }: WidgetThemeEditorProps) => {
  const [theme, setTheme] = useState<WidgetTheme>({ ...defaultTheme, ...currentTheme });
  const [saving, setSaving] = useState(false);

  const updateTheme = (key: keyof WidgetTheme, value: string | boolean) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("vendor_settings")
        .update({ widget_theme: theme as any })
        .eq("vendor_id", vendorId);

      if (error) throw error;
      toast.success("Widget theme saved");
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to save theme");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <CardTitle className="text-sm">Widget Theme Editor</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Customize how the TrustLock checkout widget appears on your site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Primary Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={theme.primaryColor} onChange={(e) => updateTheme("primaryColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                <Input value={theme.primaryColor} onChange={(e) => updateTheme("primaryColor", e.target.value)} className="h-8 text-xs flex-1" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Accent Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={theme.accentColor} onChange={(e) => updateTheme("accentColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                <Input value={theme.accentColor} onChange={(e) => updateTheme("accentColor", e.target.value)} className="h-8 text-xs flex-1" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Background</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={theme.backgroundColor} onChange={(e) => updateTheme("backgroundColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                <Input value={theme.backgroundColor} onChange={(e) => updateTheme("backgroundColor", e.target.value)} className="h-8 text-xs flex-1" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Text Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={theme.textColor} onChange={(e) => updateTheme("textColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                <Input value={theme.textColor} onChange={(e) => updateTheme("textColor", e.target.value)} className="h-8 text-xs flex-1" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Border Radius (px)</Label>
              <Input type="number" min="0" max="24" value={theme.borderRadius} onChange={(e) => updateTheme("borderRadius", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Font</Label>
              <Select value={theme.fontFamily} onValueChange={(v) => updateTheme("fontFamily", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fontOptions.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Button Text</Label>
            <Input value={theme.buttonText} onChange={(e) => updateTheme("buttonText", e.target.value)} className="h-8 text-xs" placeholder="Pay with TrustLock" />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Show "Powered by TrustLock"</Label>
            <Switch checked={theme.showPoweredBy} onCheckedChange={(v) => updateTheme("showPoweredBy", v)} />
          </div>

          <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Theme"}
          </Button>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <CardTitle className="text-sm">Live Preview</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 p-5 space-y-4 relative"
            style={{
              backgroundColor: theme.backgroundColor,
              color: theme.textColor,
              borderColor: theme.primaryColor + "40",
              borderRadius: `${theme.borderRadius}px`,
            }}
          >
            <div
              className="absolute -top-3 left-4 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"
              style={{ backgroundColor: theme.primaryColor, color: "#fff" }}
            >
              <Shield className="w-3 h-3" /> TrustLock Pay
            </div>

            <div className="text-center mt-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto" style={{ backgroundColor: theme.primaryColor + "15" }}>
                <Lock className="w-5 h-5" style={{ color: theme.primaryColor }} />
              </div>
              <p className="font-bold text-sm mt-2" style={{ color: theme.textColor }}>Secure Escrow Payment</p>
              <p className="text-[11px] mt-1" style={{ color: theme.textColor + "99" }}>
                Funds held until you confirm delivery
              </p>
            </div>

            <div className="rounded-lg px-3 py-2 border" style={{ borderColor: theme.textColor + "20" }}>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" style={{ color: theme.textColor + "80" }} />
                <span className="text-xs" style={{ color: theme.textColor + "80" }}>Card ending •••• 4242</span>
              </div>
            </div>

            <div className="rounded-lg px-3 py-2 border" style={{ borderColor: theme.textColor + "20" }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: theme.textColor + "80" }}>Escrow Amount</span>
                <span className="font-bold" style={{ color: theme.primaryColor }}>$200.00</span>
              </div>
            </div>

            <button
              className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 text-white"
              style={{
                backgroundColor: theme.primaryColor,
                borderRadius: `${Math.max(4, parseInt(theme.borderRadius) - 4)}px`,
              }}
            >
              {theme.buttonText} <ChevronRight className="w-4 h-4" />
            </button>

            {theme.showPoweredBy && (
              <div className="flex items-center justify-center gap-1 text-[10px]" style={{ color: theme.textColor + "60" }}>
                <Shield className="w-3 h-3" /> Powered by TrustLock · Azix Protocol
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WidgetThemeEditor;
