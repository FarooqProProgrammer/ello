export const LANGUAGES = [
  { code: "ur", name: "Urdu" },
  { code: "hi", name: "Hindi" },
  { code: "ar", name: "Arabic" },
  { code: "bn", name: "Bengali" },
  { code: "zh", name: "Chinese" },
  { code: "es", name: "Spanish" },
  { code: "pt", name: "Portuguese" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ru", name: "Russian" },
  { code: "tr", name: "Turkish" },
  { code: "fa", name: "Persian" },
  { code: "id", name: "Indonesian" },
  { code: "vi", name: "Vietnamese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "it", name: "Italian" },
  { code: "pl", name: "Polish" },
  { code: "uk", name: "Ukrainian" },
  { code: "th", name: "Thai" },
];

const RTL_LANGUAGES = new Set(["ur", "ar", "fa"]);

export interface TranslationLanguage {
  code: string;
  name: string;
  rtl: boolean;
}

/** Language for translations and explanations: the learner's native language, defaulting to Urdu. */
export function translationLanguage(code: string | null | undefined): TranslationLanguage {
  const lang = LANGUAGES.find((l) => l.code === code) ?? LANGUAGES.find((l) => l.code === "ur")!;
  return { code: lang.code, name: lang.name, rtl: RTL_LANGUAGES.has(lang.code) };
}

export function languageName(code: string | null | undefined): string | null {
  if (!code) return null;
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}
