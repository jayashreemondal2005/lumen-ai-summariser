// Public, non-secret configuration shared by server and client code.

export const APP_NAME = "Lumen";
export const APP_TAGLINE = "Clarity for every page.";
export const APP_DESCRIPTION =
  "Lumen reads any public web page and gives you a clear summary and the key points in seconds. Free to use as a guest.";
export const OPERATOR_NAME = "Jayashree Mondal";
export const OPERATOR_LOCATION = "Kolkata, West Bengal, India";
export const MASCOT_NAME = "Tara";

/** Bump these when the legal text changes; consent records store the version accepted. */
export const LEGAL_VERSIONS = {
  terms: "1.0.0",
  privacy: "1.1.0",
  cookies: "1.1.0",
  aiDisclaimer: "1.0.0",
  acceptableUse: "1.0.0",
} as const;
export const LEGAL_EFFECTIVE_DATE = "18 November 2026";

export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL || // set by Netlify at build and run time
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export const LIMITS = {
  urlMaxLength: 2048,
  /** Requests per window for anonymous and signed-in callers. */
  summarisePerMinute: 6,
  summarisePerDay: 60,
  taraPerMinute: 10,
  ticketsPerHour: 3,
  ticketsPerDayPerEmail: 5,
  askPerMinute: 10,
  rewritePerMinute: 10,
  /** Daily caps per visitor for the AI helpers. */
  askPerDay: 120,
  rewritePerDay: 120,
  taraPerDay: 150,
} as const;

export const SUMMARY_LENGTHS = ["brief", "standard", "detailed"] as const;
export type SummaryLength = (typeof SUMMARY_LENGTHS)[number];

export const LENGTH_LABELS: Record<SummaryLength, { label: string; hint: string }> = {
  brief: { label: "Brief", hint: "A few lines and 3 key points" },
  standard: { label: "Standard", hint: "A paragraph and 5 key points" },
  detailed: { label: "Detailed", hint: "A fuller read and up to 7 key points" },
};

/* ------------------------------------------------------------------ */
/* Output language and writing style                                   */
/* ------------------------------------------------------------------ */

export const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ur", name: "Urdu", native: "اردو", rtl: true },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ar", name: "Arabic", native: "العربية", rtl: true },
] as const;
export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as unknown as [LanguageCode, ...LanguageCode[]];
export function languageName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? "English";
}
export function isRtl(code: string): boolean {
  const l = LANGUAGES.find((x) => x.code === code);
  return Boolean(l && "rtl" in l && l.rtl);
}

export const STYLES = ["neutral", "simple", "executive"] as const;
export type SummaryStyle = (typeof STYLES)[number];
export const STYLE_LABELS: Record<SummaryStyle, { label: string; hint: string }> = {
  neutral: { label: "Balanced", hint: "Clear and neutral, for most pages" },
  simple: { label: "Simple", hint: "Plain words and short sentences" },
  executive: { label: "Executive", hint: "Decisions, numbers and impact first" },
};
