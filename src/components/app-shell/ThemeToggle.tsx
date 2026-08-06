"use client";

import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/components/ui";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} theme`}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[10px] border border-line bg-surface px-3 text-sm font-semibold text-muted transition-colors hover:border-ink/30 hover:bg-subtle hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action",
        className,
      )}
    >
      {isDark ? <SunIcon aria-hidden="true" className="h-5 w-5" /> : <MoonIcon aria-hidden="true" className="h-5 w-5" />}
      {showLabel ? <span>{isDark ? "Light theme" : "Dark theme"}</span> : null}
    </button>
  );
}
