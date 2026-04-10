import { useState } from "react";
import { Languages, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TRANSLATE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French", native: "Français" },
  { code: "sw", label: "Swahili", native: "Kiswahili" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "am", label: "Amharic", native: "አማርኛ" },
  { code: "ha", label: "Hausa", native: "Hausa" },
  { code: "yo", label: "Yoruba", native: "Yorùbá" },
  { code: "zu", label: "Zulu", native: "isiZulu" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "it", label: "Italian", native: "Italiano" },
];

interface MessageTranslateButtonProps {
  /** Fields to translate — each has a getter and setter */
  fields: { value: string; setValue: (v: string) => void; label?: string }[];
  /** Use sandbox mode (no real API call — simulates translation) */
  sandbox?: boolean;
  className?: string;
}

/**
 * A translate button that appears in compose / reply areas.
 * When tapped, shows a language picker dropdown. On selection,
 * translates all provided text fields in-place to the chosen language.
 */
const MessageTranslateButton = ({ fields, sandbox, className }: MessageTranslateButtonProps) => {
  const [translating, setTranslating] = useState(false);

  const handleTranslate = async (langLabel: string) => {
    const nonEmpty = fields.filter((f) => f.value.trim());
    if (nonEmpty.length === 0) {
      toast.info("Nothing to translate — type your message first");
      return;
    }

    setTranslating(true);
    try {
      if (sandbox) {
        // Sandbox: call real translate edge function anyway (it works without auth)
        for (const field of nonEmpty) {
          const { data, error } = await supabase.functions.invoke("translate", {
            body: { text: field.value, targetLanguage: langLabel },
          });
          if (error) throw error;
          if (data?.translated) field.setValue(data.translated);
        }
      } else {
        // Real: call translate edge function
        for (const field of nonEmpty) {
          const { data, error } = await supabase.functions.invoke("translate", {
            body: { text: field.value, targetLanguage: langLabel },
          });
          if (error) throw error;
          if (data?.translated) field.setValue(data.translated);
        }
      }
      toast.success(`Translated to ${langLabel}`);
    } catch (err) {
      console.error("Translation error:", err);
      toast.error("Translation failed. Please try again.");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={translating}
          className={cn("gap-1 text-xs h-8 px-2", className)}
          title="Translate message"
        >
          {translating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Languages className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Translate</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 max-h-72 overflow-y-auto">
        <DropdownMenuLabel className="text-[10px]">Translate to</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {TRANSLATE_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleTranslate(lang.label)}
            className="flex items-center justify-between text-sm cursor-pointer"
          >
            <span>{lang.native || lang.label}</span>
            <span className="text-[10px] text-muted-foreground uppercase">{lang.code}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MessageTranslateButton;
