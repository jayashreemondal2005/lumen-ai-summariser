"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const BCP47: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  pa: "pa-IN",
  ur: "ur-PK",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  ja: "ja-JP",
  ar: "ar-SA",
};

/** Read-aloud using the browser's built-in speech synthesis (no network, no cost). */
export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const queue = useRef<SpeechSynthesisUtterance[]>([]);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    queue.current = [];
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, lang = "en") => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const tag = BCP47[lang] ?? "en-IN";
      const voices = window.speechSynthesis.getVoices();
      const voice =
        voices.find((v) => v.lang === tag) || voices.find((v) => v.lang.startsWith(tag.slice(0, 2))) || undefined;
      // Chrome stops long utterances, so speak sentence by sentence.
      const parts = text
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?।؟。])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      queue.current = parts.map((p, i) => {
        const u = new SpeechSynthesisUtterance(p);
        u.lang = tag;
        if (voice) u.voice = voice;
        u.rate = 1;
        if (i === parts.length - 1) u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        return u;
      });
      setSpeaking(true);
      for (const u of queue.current) window.speechSynthesis.speak(u);
    },
    [supported],
  );

  return { supported, speaking, speak, stop };
}
