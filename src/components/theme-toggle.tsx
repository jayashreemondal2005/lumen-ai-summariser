"use client";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "system" | "light" | "dark";
const ORDER: Theme[] = ["system", "light", "dark"];
const LABEL: Record<Theme, string> = { system: "System theme", light: "Light theme", dark: "Dark theme" };

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const t = localStorage.getItem("lumen.theme");
      if (t === "light" || t === "dark") setTheme(t);
    } catch {
      /* ignore */
    }
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]!;
    setTheme(next);
    try {
      if (next === "system") {
        localStorage.removeItem("lumen.theme");
        delete document.documentElement.dataset.theme;
      } else {
        localStorage.setItem("lumen.theme", next);
        document.documentElement.dataset.theme = next;
      }
    } catch {
      if (next === "system") delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = next;
    }
  }

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const nextLabel = LABEL[ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]!];
  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
      aria-label={`${LABEL[theme]}. Switch to ${nextLabel.toLowerCase()}`}
      title={LABEL[theme]}
    >
      <Icon className="size-[18px]" strokeWidth={1.8} />
    </button>
  );
}
