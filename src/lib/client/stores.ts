"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LanguageCode, SummaryLength, SummaryStyle } from "../config";
import { LEGAL_VERSIONS } from "../config";
import type { SummariseEvent, SummariseStage, SummaryResult } from "../schemas";

/* ------------------------------------------------------------------ */
/* Consent (Terms of Service acceptance)                               */
/* ------------------------------------------------------------------ */

interface ConsentState {
  anonId: string;
  termsVersion: string | null;
  acceptedAt: string | null;
  gateOpen: boolean;
  /** What to run once the user accepts (e.g. the summary they asked for). */
  pending: (() => void) | null;
  accept: (version: string) => void;
  requireConsent: (then: () => void) => void;
  closeGate: () => void;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "00000000-0000-4000-8000-000000000000";
}

export const useConsent = create<ConsentState>()(
  persist(
    (set, get) => ({
      anonId: uuid(),
      termsVersion: null,
      acceptedAt: null,
      gateOpen: false,
      pending: null,
      accept: (version) => {
        const then = get().pending;
        set({ termsVersion: version, acceptedAt: new Date().toISOString(), gateOpen: false, pending: null });
        then?.();
      },
      requireConsent: (then) => {
        if (get().termsVersion === LEGAL_VERSIONS.terms) return then();
        set({ gateOpen: true, pending: then });
      },
      closeGate: () => set({ gateOpen: false, pending: null }),
    }),
    {
      name: "lumen.consent.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ anonId: s.anonId, termsVersion: s.termsVersion, acceptedAt: s.acceptedAt }),
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Preferences (this browser)                                          */
/* ------------------------------------------------------------------ */

export const AVATAR_EMOJIS = ["🦊", "🐼", "🦉", "🐯", "🐬", "🦋", "🌸", "🪷", "🌙", "⭐", "🍀", "🔥", "🎧", "📚", "☕", "🚀", "🎨", "🧠"] as const;
export const AVATAR_COLORS = [
  { id: "cobalt", bg: "#E3E9FD", ring: "#2F5BEA" },
  { id: "teal", bg: "#DDF4F1", ring: "#12B5A6" },
  { id: "rose", bg: "#FCE4EA", ring: "#D6336C" },
  { id: "amber", bg: "#FFF0D6", ring: "#C77700" },
  { id: "violet", bg: "#ECE5FD", ring: "#6E48E0" },
  { id: "slate", bg: "#E7EAEF", ring: "#4A5568" },
] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number]["id"];

export interface Prefs {
  defaultLength: SummaryLength;
  language: LanguageCode;
  style: SummaryStyle;
  textSize: "default" | "large";
  reduceMotion: boolean;
  saveHistory: boolean;
  autoScroll: boolean;
  avatar: { emoji: string; color: AvatarColor } | null;
  tourDone: boolean;
}

interface PrefsState extends Prefs {
  set: (p: Partial<Prefs>) => void;
  reset: () => void;
}

const DEFAULT_PREFS: Prefs = {
  defaultLength: "standard",
  language: "en",
  style: "neutral",
  textSize: "default",
  reduceMotion: false,
  saveHistory: true,
  autoScroll: true,
  avatar: null,
  tourDone: false,
};

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFS,
      set: (p) => set(p),
      reset: () => set({ ...DEFAULT_PREFS, tourDone: true }),
    }),
    { name: "lumen.prefs.v1", storage: createJSONStorage(() => localStorage) },
  ),
);

/* ------------------------------------------------------------------ */
/* Guest history (this browser only)                                   */
/* ------------------------------------------------------------------ */

const GUEST_HISTORY_MAX = 50;

interface HistoryState {
  items: SummaryResult[];
  add: (s: SummaryResult) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useGuestHistory = create<HistoryState>()(
  persist(
    (set) => ({
      items: [],
      add: (s) =>
        set((st) => ({
          items: [s, ...st.items.filter((i) => i.id !== s.id)].slice(0, GUEST_HISTORY_MAX),
        })),
      remove: (id) => set((st) => ({ items: st.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: "lumen.history.v1", storage: createJSONStorage(() => localStorage) },
  ),
);

/* ------------------------------------------------------------------ */
/* Summariser request state                                            */
/* ------------------------------------------------------------------ */

export type SummariserStatus = "idle" | "loading" | "success" | "error";

export interface SummariserError {
  code: string;
  message: string;
  retryable: boolean;
}

interface SummariserState {
  url: string;
  length: SummaryLength;
  status: SummariserStatus;
  stage: SummariseStage | null;
  completed: SummariseStage[];
  result: SummaryResult | null;
  error: SummariserError | null;
  controller: AbortController | null;
  setUrl: (url: string) => void;
  setLength: (l: SummaryLength) => void;
  run: (opts: { url: string; length: SummaryLength; signedIn: boolean; language?: LanguageCode; style?: SummaryStyle; save?: boolean }) => Promise<void>;
  cancel: () => void;
  reset: () => void;
  show: (r: SummaryResult) => void;
}

export const useSummariser = create<SummariserState>()(
  persist(
    (set, get) => ({
      url: "",
      length: "standard",
      status: "idle",
      stage: null,
      completed: [],
      result: null,
      error: null,
      controller: null,
      setUrl: (url) => set({ url }),
      setLength: (length) => set({ length }),
      cancel: () => {
        get().controller?.abort();
        set({ status: "idle", stage: null, completed: [], controller: null });
      },
      reset: () => {
        get().controller?.abort();
        set({ status: "idle", stage: null, completed: [], result: null, error: null, controller: null, url: "" });
      },
      show: (r) => set({ status: "success", result: r, error: null, stage: null, url: r.url }),
      run: async ({ url, length, signedIn, language = "en", style = "neutral", save = true }): Promise<void> => {
        get().controller?.abort();
        const controller = new AbortController();
        set({ status: "loading", stage: "validating", completed: [], error: null, result: null, controller });

        const fail = (e: SummariserError): void => {
          set({ status: "error", error: e, stage: null, controller: null });
        };

        let res: Response;
        try {
          res = await fetch("/api/summarise", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, length, language, style, save }),
            signal: controller.signal,
          });
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          return fail({ code: "OFFLINE", message: "We couldn't reach Lumen. Check your internet connection.", retryable: true });
        }

        if (!res.ok || !res.body) {
          let payload: { error?: { code?: string; message?: string } } = {};
          try {
            payload = await res.json();
          } catch {
            /* not JSON */
          }
          return fail({
            code: payload.error?.code || `HTTP_${res.status}`,
            message: payload.error?.message || "Something went wrong. Please try again.",
            retryable: res.status >= 500 || res.status === 429,
          });
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finished = false;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let nl: number;
            while ((nl = buffer.indexOf("\n")) >= 0) {
              const line = buffer.slice(0, nl).trim();
              buffer = buffer.slice(nl + 1);
              if (!line) continue;
              const evt = JSON.parse(line) as SummariseEvent;
              if (evt.type === "stage") {
                const prev = get().stage;
                set((s) => ({
                  stage: evt.stage,
                  completed: prev && prev !== evt.stage ? [...s.completed, prev] : s.completed,
                }));
              } else if (evt.type === "result") {
                finished = true;
                set({ status: "success", result: evt.data, stage: null, completed: [], controller: null });
                if (!signedIn && save) useGuestHistory.getState().add(evt.data);
              } else if (evt.type === "error") {
                finished = true;
                fail({ code: evt.code, message: evt.message, retryable: evt.retryable });
              }
            }
          }
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          return fail({ code: "STREAM", message: "The connection dropped before the summary finished. Please try again.", retryable: true });
        }
        if (!finished) {
          fail({ code: "STREAM", message: "The summary didn't finish in time. Please try again.", retryable: true });
        }
      },
    }),
    {
      name: "lumen.summariser.v1",
      storage: createJSONStorage(() => sessionStorage),
      // Only the form inputs survive a reload; request state does not.
      partialize: (s) => ({ length: s.length }),
    },
  ),
);
