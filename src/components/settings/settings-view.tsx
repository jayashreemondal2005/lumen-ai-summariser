"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Download, FileText, Keyboard, Monitor, Moon, RotateCcw, ShieldCheck, Sparkles, Sun, Trash2 } from "lucide-react";
import {
  AVATAR_COLORS,
  AVATAR_EMOJIS,
  useConsent,
  useGuestHistory,
  usePrefs,
  type AvatarColor,
} from "@/lib/client/stores";
import { LANGUAGES, LEGAL_VERSIONS, LENGTH_LABELS, STYLE_LABELS, STYLES, SUMMARY_LENGTHS } from "@/lib/config";
import { LEGAL_DOCS } from "@/lib/legal";
import { supabaseBrowser, accountsEnabled } from "@/lib/client/supabase-browser";
import { toMarkdown } from "@/lib/client/format";
import { useAuth, useToast } from "../providers";
import { Avatar, useAvatar } from "../avatar";
import { Button, ButtonLink, Field, Spinner, inputClass } from "../ui";

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 rounded-2xl border border-line bg-surface p-5 shadow-hair sm:p-6">
      <h2 id={`${id}-h`} className="text-[16px] font-semibold text-ink">
        {title}
      </h2>
      {description ? <p className="mt-0.5 text-sm text-ink-3">{description}</p> : null}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Row({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
            {label}
          </label>
        ) : (
          <p className="text-sm font-medium text-ink">{label}</p>
        )}
        {hint ? <p className="text-[13px] text-ink-3">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ v: T; text: string; icon?: React.ReactNode }>; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-[10px] bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={o.v === value}
          onClick={() => onChange(o.v)}
          className={`press inline-flex h-8 items-center gap-1.5 rounded-[7px] px-3 text-[13px] font-medium ${
            o.v === value ? "bg-surface text-ink shadow-hair ring-1 ring-line" : "text-ink-3 hover:text-ink"
          }`}
        >
          {o.icon}
          {o.text}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`press relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-surface-3 ring-1 ring-line-strong"}`}
    >
      <span className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
    </button>
  );
}

function useTheme(): [string, (t: string) => void] {
  const [theme, setTheme] = useState("system");
  useEffect(() => {
    const read = () => {
      try {
        setTheme(localStorage.getItem("lumen.theme") || "system");
      } catch {
        /* ignore */
      }
    };
    read();
    window.addEventListener("lumen:theme", read);
    return () => window.removeEventListener("lumen:theme", read);
  }, []);
  const apply = (t: string) => {
    setTheme(t);
    try {
      if (t === "system") localStorage.removeItem("lumen.theme");
      else localStorage.setItem("lumen.theme", t);
    } catch {
      /* ignore */
    }
    if (t === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    window.dispatchEvent(new Event("lumen:theme"));
  };
  return [theme, apply];
}

/* ------------------------------------------------------------------ */

function ProfileSection() {
  const { user } = useAuth();
  const toast = useToast();
  const setPrefs = usePrefs((s) => s.set);
  const current = useAvatar(user);
  const [emoji, setEmoji] = useState<string | null>(current.emoji);
  const [color, setColor] = useState<AvatarColor>(current.color);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const nameId = useId();

  useEffect(() => {
    setEmoji(current.emoji);
    setColor(current.color);
    setName((user?.user_metadata?.full_name as string) || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function save() {
    setSaving(true);
    setPrefs({ avatar: emoji ? { emoji, color } : null });
    if (user) {
      const { error } = await supabaseBrowser()!.auth.updateUser({
        data: { avatar_emoji: emoji, avatar_color: color, full_name: name.trim() || user.user_metadata?.full_name },
      });
      setSaving(false);
      if (error) return toast("Couldn't save your profile.", "error");
    } else setSaving(false);
    toast("Profile saved", "success");
  }

  return (
    <Section id="profile" title="Profile" description={user ? "How you appear in Lumen." : "Pick an avatar for this browser. Sign in to sync it."}>
      <div className="flex items-center gap-4">
        <Avatar user={user} emoji={emoji} color={color} size={64} />
        <div className="text-sm text-ink-2">
          <p className="font-medium text-ink">{user ? name || user.email : "Guest"}</p>
          <p className="text-ink-3">{user ? user.email : "Not signed in"}</p>
        </div>
      </div>

      {user ? (
        <div className="max-w-sm">
          <Field label="Display name" htmlFor={nameId}>
            <input id={nameId} className={inputClass} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
        </div>
      ) : null}

      <div>
        <p className="text-sm font-medium text-ink">Avatar</p>
        <div role="radiogroup" aria-label="Avatar emoji" className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-10">
          <button
            type="button"
            role="radio"
            aria-checked={emoji === null}
            aria-label="Initials"
            onClick={() => setEmoji(null)}
            className={`press flex aspect-square items-center justify-center rounded-xl border text-[13px] font-semibold ${emoji === null ? "border-primary bg-primary-soft text-primary-ink" : "border-line text-ink-3 hover:border-line-strong"}`}
          >
            Aa
          </button>
          {AVATAR_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={emoji === e}
              aria-label={`Avatar ${e}`}
              onClick={() => setEmoji(e)}
              className={`press flex aspect-square items-center justify-center rounded-xl border text-[22px] ${emoji === e ? "border-primary bg-primary-soft" : "border-line hover:border-line-strong"}`}
            >
              {e}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Avatar colour" className="mt-3 flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={color === c.id}
              aria-label={`Colour ${c.id}`}
              onClick={() => setColor(c.id)}
              className="press relative size-8 rounded-full ring-1 ring-black/10"
              style={{ background: c.bg, boxShadow: color === c.id ? `0 0 0 2px var(--surface), 0 0 0 4px ${c.ring}` : undefined }}
            >
              {color === c.id ? <Check className="absolute inset-0 m-auto size-4" style={{ color: c.ring }} /> : null}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <Spinner /> : null} Save profile
        </Button>
        {!user && accountsEnabled ? (
          <ButtonLink href="/sign-up" variant="secondary">
            Create an account
          </ButtonLink>
        ) : null}
      </div>
    </Section>
  );
}

export function SettingsView() {
  const prefs = usePrefs();
  const consent = useConsent();
  const guestItems = useGuestHistory((s) => s.items);
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [theme, setTheme] = useTheme();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  function exportHistory(kind: "json" | "md") {
    const items = guestItems;
    const body = kind === "json" ? JSON.stringify(items, null, 2) : items.map(toMarkdown).join("\n---\n\n");
    const blob = new Blob([body], { type: kind === "json" ? "application/json" : "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lumen-history.${kind}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function clearLocal() {
    if (!window.confirm("Clear Lumen's data in this browser? This removes guest history, preferences and your Terms acceptance here. Your account (if any) is not affected.")) return;
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith("lumen.")) localStorage.removeItem(k);
      for (const k of Object.keys(sessionStorage)) if (k.startsWith("lumen.")) sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
    toast("Browser data cleared");
    setTimeout(() => window.location.assign("/"), 400);
  }

  if (!hydrated) return <SettingsSkeleton />;

  const languageId = "set-language";
  return (
    <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
      <nav aria-label="Settings sections" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <ul className="space-y-1 text-sm">
          {[
            ["profile", "Profile"],
            ["appearance", "Appearance"],
            ["summaries", "Summaries"],
            ["privacy", "History & privacy"],
            ["help", "Tour & shortcuts"],
            ["legal", "Legal & consent"],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="press block rounded-lg px-3 py-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-6">
        <ProfileSection />

        <Section id="appearance" title="Appearance">
          <Row label="Theme" hint="Follow your device, or pick one.">
            <Segmented
              label="Theme"
              value={theme}
              onChange={setTheme}
              options={[
                { v: "system", text: "System", icon: <Monitor className="size-3.5" /> },
                { v: "light", text: "Light", icon: <Sun className="size-3.5" /> },
                { v: "dark", text: "Dark", icon: <Moon className="size-3.5" /> },
              ]}
            />
          </Row>
          <Row label="Reading text size" hint="Makes summaries easier to read.">
            <Segmented
              label="Reading text size"
              value={prefs.textSize}
              onChange={(v) => prefs.set({ textSize: v })}
              options={[
                { v: "default", text: "Default" },
                { v: "large", text: "Large" },
              ]}
            />
          </Row>
          <Row label="Reduce animations" hint="Turns off motion effects.">
            <Switch label="Reduce animations" checked={prefs.reduceMotion} onChange={(v) => prefs.set({ reduceMotion: v })} />
          </Row>
        </Section>

        <Section id="summaries" title="Summaries" description="Defaults for new summaries. You can still change them on the home page.">
          <Row label="Default length">
            <Segmented
              label="Default length"
              value={prefs.defaultLength}
              onChange={(v) => prefs.set({ defaultLength: v })}
              options={SUMMARY_LENGTHS.map((l) => ({ v: l, text: LENGTH_LABELS[l].label }))}
            />
          </Row>
          <Row label="Writing style" hint={STYLE_LABELS[prefs.style].hint}>
            <Segmented label="Writing style" value={prefs.style} onChange={(v) => prefs.set({ style: v })} options={STYLES.map((s) => ({ v: s, text: STYLE_LABELS[s].label }))} />
          </Row>
          <Row label="Summary language" hint="Lumen can summarise any page in these languages." htmlFor={languageId}>
            <select id={languageId} className={`${inputClass} h-10 w-56`} value={prefs.language} onChange={(e) => prefs.set({ language: e.target.value as typeof prefs.language })}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} {l.native !== l.name ? `· ${l.native}` : ""}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Scroll to the result" hint="Jump to the summary when it's ready.">
            <Switch label="Scroll to the result" checked={prefs.autoScroll} onChange={(v) => prefs.set({ autoScroll: v })} />
          </Row>
        </Section>

        <Section id="privacy" title="History & privacy">
          <Row label="Save my history" hint={user ? "Save new summaries to your account." : "Keep new summaries in this browser."}>
            <Switch label="Save my history" checked={prefs.saveHistory} onChange={(v) => prefs.set({ saveHistory: v })} />
          </Row>
          {!user ? (
            <Row label="Export browser history" hint={`${guestItems.length} summar${guestItems.length === 1 ? "y" : "ies"} saved here.`}>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => exportHistory("md")} disabled={!guestItems.length}>
                  <FileText className="size-3.5" /> Markdown
                </Button>
                <Button size="sm" variant="secondary" onClick={() => exportHistory("json")} disabled={!guestItems.length}>
                  <Download className="size-3.5" /> JSON
                </Button>
              </div>
            </Row>
          ) : (
            <Row label="Your account data" hint="Download everything, or delete your account.">
              <ButtonLink href="/account" size="sm" variant="secondary">
                Open Account
              </ButtonLink>
            </Row>
          )}
          <Row label="Clear this browser" hint="Removes guest history, preferences and saved consent here.">
            <Button size="sm" variant="danger" onClick={clearLocal}>
              <Trash2 className="size-3.5" /> Clear data
            </Button>
          </Row>
        </Section>

        <Section id="help" title="Tour & shortcuts">
          <Row label="Product tour" hint="A 30-second walk-through of Lumen.">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                prefs.set({ tourDone: false });
                router.push("/?tour=1");
              }}
            >
              <Sparkles className="size-3.5" /> Replay tour
            </Button>
          </Row>
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <Keyboard className="size-4" /> Keyboard shortcuts
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {[
                ["/", "Focus the link box"],
                ["Enter", "Summarise"],
                ["Esc", "Close dialogs and Tara"],
                ["← →", "Change summary length"],
              ].map(([k, d]) => (
                <div key={k} className="flex items-center gap-3">
                  <dt>
                    <kbd className="inline-flex min-w-8 justify-center rounded-md border border-line-strong bg-bg-subtle px-2 py-0.5 font-mono text-[12px] text-ink">{k}</kbd>
                  </dt>
                  <dd className="text-ink-2">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>

        <Section id="legal" title="Legal & consent">
          <div className="flex gap-3 rounded-xl bg-bg-subtle px-4 py-3 text-sm">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-ink" />
            <p className="text-ink-2">
              {consent.termsVersion ? (
                <>
                  You accepted Terms of Service <span className="font-medium text-ink">v{consent.termsVersion}</span>
                  {consent.acceptedAt ? ` on ${new Date(consent.acceptedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : ""}.
                  {consent.termsVersion !== LEGAL_VERSIONS.terms ? " A newer version is available." : ""}
                </>
              ) : (
                "You haven't accepted the Terms of Service in this browser yet. We'll ask before your first summary."
              )}
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {LEGAL_DOCS.map((d) => (
              <li key={d.slug}>
                <Link href={`/legal/${d.slug}`} className="press flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm hover:bg-bg-subtle">
                  <span className="font-medium text-ink">{d.title}</span>
                  <span className="text-[12px] text-ink-3">v{d.version}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Row label="Reset preferences" hint="Restore default settings.">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                prefs.reset();
                toast("Preferences reset");
              }}
            >
              <RotateCcw className="size-3.5" /> Reset
            </Button>
          </Row>
        </Section>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading settings">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface p-6">
          <div className="skeleton h-5 w-32" />
          <div className="mt-6 space-y-4">
            <div className="skeleton h-9 w-full" />
            <div className="skeleton h-9 w-4/5" />
            <div className="skeleton h-9 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
