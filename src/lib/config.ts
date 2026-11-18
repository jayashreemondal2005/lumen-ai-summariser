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
  privacy: "1.0.0",
  cookies: "1.0.0",
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
} as const;

export const SUMMARY_LENGTHS = ["brief", "standard", "detailed"] as const;
export type SummaryLength = (typeof SUMMARY_LENGTHS)[number];

export const LENGTH_LABELS: Record<SummaryLength, { label: string; hint: string }> = {
  brief: { label: "Brief", hint: "A few lines and 3 key points" },
  standard: { label: "Standard", hint: "A paragraph and 5 key points" },
  detailed: { label: "Detailed", hint: "A fuller read and up to 7 key points" },
};
