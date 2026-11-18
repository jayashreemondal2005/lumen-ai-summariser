"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, UserRound, X } from "lucide-react";
import { LumenWordmark } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "./providers";
import { accountsEnabled } from "@/lib/client/supabase-browser";
import { buttonClass } from "./ui";

const NAV = [
  { href: "/", label: "Summarise" },
  { href: "/history", label: "History" },
  { href: "/help", label: "Help" },
];

function initials(name: string) {
  return (
    name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "U"
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
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

  const name = (user?.user_metadata?.full_name as string) || user?.email || "";
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md supports-[backdrop-filter]:bg-bg/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="rounded-md" aria-label="Lumen home">
          <LumenWordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(n.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(n.href) ? "text-ink" : "text-ink-3 hover:text-ink"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          {accountsEnabled && !loading && !user ? (
            <Link href="/sign-in" className={buttonClass("secondary", "sm", "ml-1 hidden sm:inline-flex")}>
              Sign in
            </Link>
          ) : null}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
                className="ml-1 inline-flex size-9 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary-ink ring-1 ring-line transition hover:ring-line-strong"
              >
                {initials(name)}
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="animate-rise absolute right-0 top-11 w-60 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-pop"
                >
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-medium text-ink">{(user.user_metadata?.full_name as string) || "Your account"}</p>
                    <p className="truncate text-[13px] text-ink-3">{user.email}</p>
                  </div>
                  <div className="my-1 h-px bg-line" />
                  <Link role="menuitem" href="/account" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink">
                    <UserRound className="size-4" /> Account
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
                  >
                    <LogOut className="size-4" /> Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 md:hidden"
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
        <nav id="mobile-nav" aria-label="Main" className="border-t border-line bg-bg px-4 pb-4 pt-2 md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(n.href) ? "page" : undefined}
              className={`block rounded-lg px-3 py-2.5 text-[15px] font-medium ${isActive(n.href) ? "bg-surface-2 text-ink" : "text-ink-2"}`}
            >
              {n.label}
            </Link>
          ))}
          {accountsEnabled && !user ? (
            <Link href="/sign-in" className={buttonClass("secondary", "md", "mt-2 w-full")}>
              Sign in
            </Link>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
