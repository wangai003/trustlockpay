import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Language {
  code: string;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "sw", label: "Swahili", nativeLabel: "Kiswahili" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "zh", label: "Chinese (Mandarin)", nativeLabel: "中文" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "am", label: "Amharic", nativeLabel: "አማርኛ" },
  { code: "ha", label: "Hausa", nativeLabel: "Hausa" },
  { code: "yo", label: "Yoruba", nativeLabel: "Yorùbá" },
  { code: "zu", label: "Zulu", nativeLabel: "isiZulu" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe" },
  { code: "ru", label: "Russian", nativeLabel: "Русский" },
  { code: "it", label: "Italian", nativeLabel: "Italiano" },
];

interface TranslationCache {
  [key: string]: string;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  translateText: (text: string, targetLang?: string) => Promise<string>;
  translateMessage: (text: string, targetLang?: string) => Promise<string>;
  isTranslating: boolean;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "tl_preferred_language";

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const savedCode = localStorage.getItem(STORAGE_KEY) || "en";
  const savedLang = SUPPORTED_LANGUAGES.find((l) => l.code === savedCode) || SUPPORTED_LANGUAGES[0];

  const [language, setLanguageState] = useState<Language>(savedLang);
  const [isTranslating, setIsTranslating] = useState(false);
  const [uiCache, setUiCache] = useState<TranslationCache>({});

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang.code);
    // Clear UI cache when language changes
    setUiCache({});
  }, []);

  const callTranslate = useCallback(async (text: string, targetLang: string): Promise<string> => {
    if (targetLang === "en" && /^[\x00-\x7F\s]*$/.test(text)) return text;
    if (!text.trim()) return text;

    const { data, error } = await supabase.functions.invoke("translate", {
      body: { text, targetLanguage: targetLang },
    });

    if (error) {
      console.error("Translation error:", error);
      throw error;
    }
    return data?.translated || text;
  }, []);

  // Translate a chat message on demand
  const translateMessage = useCallback(async (text: string, targetLang?: string): Promise<string> => {
    const target = targetLang || language.code;
    if (target === "en" && /^[\x00-\x7F\s]*$/.test(text)) return text;
    setIsTranslating(true);
    try {
      return await callTranslate(text, SUPPORTED_LANGUAGES.find(l => l.code === target)?.label || target);
    } catch {
      toast.error("Translation failed. Please try again.");
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, [language, callTranslate]);

  // Translate arbitrary text (for UI elements) — uses cache
  const translateText = useCallback(async (text: string, targetLang?: string): Promise<string> => {
    const target = targetLang || language.code;
    if (target === "en") return text;
    const cacheKey = `${target}:${text}`;
    if (uiCache[cacheKey]) return uiCache[cacheKey];

    try {
      const result = await callTranslate(text, SUPPORTED_LANGUAGES.find(l => l.code === target)?.label || target);
      setUiCache((prev) => ({ ...prev, [cacheKey]: result }));
      return result;
    } catch {
      return text;
    }
  }, [language, callTranslate, uiCache]);

  // Synchronous lookup for cached translations — returns original if not cached
  const t = useCallback((text: string): string => {
    if (language.code === "en") return text;
    const cacheKey = `${language.code}:${text}`;
    return uiCache[cacheKey] || text;
  }, [language, uiCache]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translateText, translateMessage, isTranslating, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
