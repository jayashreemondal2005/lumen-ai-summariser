"use client";
import type { User } from "@supabase/supabase-js";
import { UserRound } from "lucide-react";
import { AVATAR_COLORS, usePrefs, type AvatarColor } from "@/lib/client/stores";

export function initialsOf(name: string) {
  return (
    name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "U"
  );
}

/** The avatar a person chose: account metadata first, then this browser's preference. */
export function useAvatar(user: User | null): { emoji: string | null; color: AvatarColor } {
  const local = usePrefs((s) => s.avatar);
  const metaEmoji = user?.user_metadata?.avatar_emoji as string | undefined;
  const metaColor = user?.user_metadata?.avatar_color as AvatarColor | undefined;
  if (user && metaEmoji) return { emoji: metaEmoji, color: metaColor ?? "cobalt" };
  if (local) return { emoji: local.emoji, color: local.color };
  return { emoji: null, color: "cobalt" };
}

export function Avatar({
  user,
  size = 36,
  emoji,
  color,
  className = "",
}: {
  user: User | null;
  size?: number;
  emoji?: string | null;
  color?: AvatarColor;
  className?: string;
}) {
  const chosen = useAvatar(user);
  const e = emoji !== undefined ? emoji : chosen.emoji;
  const c = AVATAR_COLORS.find((x) => x.id === (color ?? chosen.color)) ?? AVATAR_COLORS[0];
  const name = (user?.user_metadata?.full_name as string) || user?.email || "";
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ring-1 ring-black/5 ${className}`}
      style={{ width: size, height: size, background: c.bg, color: c.ring, fontSize: e ? size * 0.52 : size * 0.36 }}
    >
      {e ? <span style={{ lineHeight: 1 }}>{e}</span> : user ? initialsOf(name) : <UserRound style={{ width: size * 0.5, height: size * 0.5 }} />}
    </span>
  );
}
