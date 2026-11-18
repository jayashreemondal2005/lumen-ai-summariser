"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Clock3, LogIn, LogOut, Menu, Settings, Sparkles, UserPlus, UserRound, X } from "lucide-react";
import { LumenWordmark } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "./providers";
import { Avatar } from "./avatar";
import { accountsEnabled } from "@/lib/client/supabase-browser";
import { usePrefs } from "@/lib/client/stores";

const NAV = [
  { href: "/", label: "Summarise", tour: "nav-home" },
  { href: "/history", label: "History", tour: "nav-history" },
  { href: "/help", label: "Help", tour: "nav-help" },
];

function MenuLink({ href, icon: Icon, children }: { href: string; icon: typeof Settings; children: React.ReactNode }) {
  return (
    <Link role="menuitem" href={href} className="press flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink">
      <Icon className="size-4" /> {children}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const setPrefs = usePrefs((s) => s.set);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const name = (user?.user_metadata?.full_name as string) || "";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="press rounded-md" aria-label="Lumen home">
          <LumenWordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              data-tour={n.tour}
              aria-current={isActive(n.href) ? "page" : undefined}
              className={`press relative rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(n.href) ? "text-ink" : "text-ink-3 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {n.label}
              {isActive(n.href) ? <span aria-hidden className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-primary" /> : null}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          {accountsEnabled && !loading && !user ? (
            <Link href="/sign-in" className="press ml-1 hidden h-8 items-center rounded-lg border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink hover:bg-surface-2 sm:inline-flex">
              Sign in
            </Link>
          ) : null}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              data-tour="settings"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={user ? "Account menu" : "Menu and settings"}
              className="press ml-1 inline-flex rounded-full ring-offset-2 ring-offset-bg transition hover:ring-2 hover:ring-line-strong"
            >
              <Avatar user={user} size={34} />
            </button>
            {menuOpen ? (
              <div role="menu" className="animate-pop absolute right-0 top-11 w-64 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-pop">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar user={user} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{user ? name || "Your account" : "Guest"}</p>
                    <p className="truncate text-[12px] text-ink-3">{user ? user.email : "History stays in this browser"}</p>
                  </div>
                </div>
                <div className="my-1 h-px bg-line" />
                {user ? <MenuLink href="/account" icon={UserRound}>Account</MenuLink> : null}
                <MenuLink href="/settings" icon={Settings}>Settings</MenuLink>
                <MenuLink href="/history" icon={Clock3}>History</MenuLink>
                <MenuLink href="/help" icon={BookOpen}>Help Center</MenuLink>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setPrefs({ tourDone: false });
                    if (pathname !== "/") window.location.href = "/?tour=1";
                    else window.dispatchEvent(new Event("lumen:start-tour"));
                  }}
                  className="press flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
                >
                  <Sparkles className="size-4" /> Take the tour
                </button>
                <div className="my-1 h-px bg-line" />
                {user ? (
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => signOut()}
                    className="press flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
                  >
                    <LogOut className="size-4" /> Sign out
                  </button>
                ) : accountsEnabled ? (
                  <>
                    <MenuLink href="/sign-in" icon={LogIn}>Sign in</MenuLink>
                    <MenuLink href="/sign-up" icon={UserPlus}>Create an account</MenuLink>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="press inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav id="mobile-nav" aria-label="Main" className="animate-pop border-t border-line bg-bg px-4 pb-4 pt-2 md:hidden">
          {[...NAV, { href: "/settings", label: "Settings", tour: "" }].map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(n.href) ? "page" : undefined}
              className={`press block rounded-lg px-3 py-2.5 text-[15px] font-medium ${isActive(n.href) ? "bg-surface-2 text-ink" : "text-ink-2"}`}
            >
              {n.label}
            </Link>
          ))}
          {accountsEnabled && !user ? (
            <Link href="/sign-in" className="press mt-2 flex h-10 w-full items-center justify-center rounded-[10px] border border-line-strong bg-surface text-sm font-medium text-ink">
              Sign in
            </Link>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
