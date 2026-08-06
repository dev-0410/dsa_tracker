"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  ArrowRightStartOnRectangleIcon,
  ChevronUpDownIcon,
  Cog6ToothIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/components/ui";
import type { AppShellUser } from "./types";

interface UserMenuProps {
  user: AppShellUser;
  align?: "left" | "right";
  compact?: boolean;
  className?: string;
}

function getInitials(user: AppShellUser): string {
  if (user.initials?.trim()) return user.initials.trim().slice(0, 2).toUpperCase();

  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");

  return (initials || user.email?.charAt(0) || "I").toUpperCase();
}

export function UserMenu({ user, align = "left", compact = false, className }: UserMenuProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({ callbackUrl: "/" });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <details className={cn("group relative", className)}>
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center rounded-xl border border-transparent text-left transition-colors hover:border-line hover:bg-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action [&::-webkit-details-marker]:hidden",
          compact ? "justify-center px-1.5" : "w-full gap-3 px-2.5 py-2",
        )}
        aria-label={`Open account menu for ${user.name}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink font-mono text-xs font-semibold text-highlight dark:bg-highlight dark:text-[#16201A]">
          {getInitials(user)}
        </span>
        {!compact ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-ink">{user.name}</span>
              {user.email ? <span className="mt-0.5 block truncate text-xs text-muted">{user.email}</span> : null}
            </span>
            <ChevronUpDownIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
          </>
        ) : null}
      </summary>

      <div
        className={cn(
          "absolute z-50 mt-2 w-64 rounded-xl border border-line bg-surface p-2 shadow-lift",
          align === "right" ? "right-0" : "left-0",
          !compact && "bottom-[calc(100%+0.5rem)] mt-0",
        )}
      >
        {compact ? (
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="truncate text-sm font-bold text-ink">{user.name}</p>
            {user.email ? <p className="mt-1 truncate text-xs text-muted">{user.email}</p> : null}
          </div>
        ) : null}
        <nav aria-label="Account navigation" className={cn("space-y-1", compact && "pt-2")}>
          <Link
            href="/app/profile"
            className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted hover:bg-subtle hover:text-ink"
          >
            <UserCircleIcon aria-hidden="true" className="h-5 w-5" />
            Profile
          </Link>
          <Link
            href="/app/settings"
            className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted hover:bg-subtle hover:text-ink"
          >
            <Cog6ToothIcon aria-hidden="true" className="h-5 w-5" />
            Settings
          </Link>
        </nav>
        <div className="mt-2 border-t border-line pt-2">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-danger hover:bg-danger/10 disabled:cursor-wait disabled:opacity-60"
          >
            <ArrowRightStartOnRectangleIcon aria-hidden="true" className="h-5 w-5" />
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </details>
  );
}
