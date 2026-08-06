"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand";
import { cn, SkipLink } from "@/components/ui";
import { defaultNavigation, isRouteActive, NavigationIcon } from "./navigation";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import type { AppNavigationItem, AppShellUser } from "./types";

interface AppShellProps {
  user: AppShellUser;
  children: ReactNode;
  navigation?: AppNavigationItem[];
  environmentLabel?: string;
}

export function AppShell({ user, children, navigation = defaultNavigation, environmentLabel }: AppShellProps) {
  const pathname = usePathname();
  const mobileNavigation = navigation.filter((item) => item.mobile !== false).slice(0, 4);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SkipLink />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-[72px] items-center border-b border-line px-5">
          <BrandLogo href="/app" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-3">
          {environmentLabel ? (
            <div className="mx-2 mb-4 mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-line bg-subtle px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
              {environmentLabel}
            </div>
          ) : null}

          <nav aria-label="Workspace navigation" className="space-y-1">
            {navigation.map((item) => {
              const isActive = isRouteActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-ink text-canvas dark:bg-highlight dark:text-[#16201A]"
                      : "text-muted hover:bg-subtle hover:text-ink",
                  )}
                >
                  <NavigationIcon name={item.icon} className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge !== undefined ? (
                    <span
                      className={cn(
                        "min-w-5 rounded-full px-1.5 py-0.5 text-center font-mono text-[10px] font-bold",
                        isActive ? "bg-white/15 text-current dark:bg-[#16201A]/10" : "bg-subtle text-muted",
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-2 border-t border-line pt-3">
            <ThemeToggle showLabel className="w-full justify-start border-transparent bg-transparent px-3" />
            <UserMenu user={user} />
          </div>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
        <BrandLogo href="/app" compact />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <UserMenu user={user} compact align="right" />
        </div>
      </header>

      <main id="main-content" className="min-h-screen min-w-0 pb-24 pt-16 lg:ml-64 lg:pb-0 lg:pt-0">
        {children}
      </main>

      <nav
        aria-label="Mobile workspace navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid min-h-[72px] grid-cols-4 border-t border-line bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {mobileNavigation.map((item) => {
          const isActive = isRouteActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold transition-colors",
                isActive ? "text-ink" : "text-muted hover:bg-subtle hover:text-ink",
              )}
            >
              {isActive ? <span aria-hidden="true" className="absolute top-0 h-1 w-7 rounded-b-full bg-highlight shadow-[0_0_0_1px_rgba(22,32,26,0.12)]" /> : null}
              <NavigationIcon name={item.icon} className="h-5 w-5" />
              <span className="max-w-full truncate">{item.label}</span>
              {item.badge !== undefined ? (
                <span className="absolute right-2 top-2 min-w-4 rounded-full bg-danger px-1 font-mono text-[9px] font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
