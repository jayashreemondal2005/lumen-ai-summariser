"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/client/supabase-browser";
import { LEGAL_VERSIONS } from "@/lib/config";
import { useConsent, usePrefs } from "@/lib/client/stores";
import { TermsGate } from "./terms-gate";

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

interface AuthValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({ user: null, loading: false, signOut: async () => {} });
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) {
      setLoading(false);
      return;
    }
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabaseBrowser()?.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signOut }), [user, loading, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

interface Toast {
  id: number;
  text: string;
  tone: "neutral" | "success" | "error";
}

const ToastContext = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastContext);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback((text: string, tone: Toast["tone"] = "neutral") => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-rise pointer-events-auto flex items-center gap-2.5 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-bg shadow-pop"
          >
            <span
              aria-hidden
              className={`size-2 rounded-full ${t.tone === "error" ? "bg-[#ff6b72]" : t.tone === "success" ? "bg-accent" : "bg-ink-3"}`}
            />
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Consent sync: makes sure every accepted version is recorded server-side */
/* ------------------------------------------------------------------ */

function ConsentSync() {
  const { user } = useAuth();
  const termsVersion = useConsent((s) => s.termsVersion);
  const anonId = useConsent((s) => s.anonId);
  const synced = useRef<string>("");

  useEffect(() => {
    if (termsVersion !== LEGAL_VERSIONS.terms) return;
    const key = `${user?.id ?? anonId}:${termsVersion}`;
    if (synced.current === key) return;
    // Signed-in users who already accepted this version at sign-up need no new record.
    if (user && user.user_metadata?.terms_version === termsVersion && user.user_metadata?.consent_recorded) {
      synced.current = key;
      return;
    }
    synced.current = key;
    const storageKey = `lumen.consent.synced.${key}`;
    try {
      if (localStorage.getItem(storageKey)) return;
    } catch {
      /* ignore */
    }
    fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document: "terms", version: termsVersion, anonId: user ? undefined : anonId }),
    })
      .then((r) => {
        if (r.ok) {
          try {
            localStorage.setItem(storageKey, "1");
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {});
  }, [user, termsVersion, anonId]);

  // A signed-in user who accepted at sign-up shouldn't be asked again on a new device.
  useEffect(() => {
    if (user?.user_metadata?.terms_version === LEGAL_VERSIONS.terms && termsVersion !== LEGAL_VERSIONS.terms) {
      useConsent.setState({ termsVersion: LEGAL_VERSIONS.terms, acceptedAt: user.user_metadata.terms_accepted_at ?? null });
    }
  }, [user, termsVersion]);

  return null;
}

/* ------------------------------------------------------------------ */
/* Preferences: reading size and motion are applied to <html>          */
/* ------------------------------------------------------------------ */

function PrefsSync() {
  const textSize = usePrefs((s) => s.textSize);
  const reduceMotion = usePrefs((s) => s.reduceMotion);
  useEffect(() => {
    const el = document.documentElement;
    if (textSize === "large") el.dataset.text = "large";
    else delete el.dataset.text;
    if (reduceMotion) el.dataset.motion = "reduce";
    else delete el.dataset.motion;
  }, [textSize, reduceMotion]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
        <ConsentSync />
        <PrefsSync />
        <TermsGate />
      </ToastProvider>
    </AuthProvider>
  );
}
