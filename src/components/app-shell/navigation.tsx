import type { ComponentType, SVGProps } from "react";
import {
  AdjustmentsHorizontalIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  ClockIcon,
  HomeIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import type { AppNavigationIcon, AppNavigationItem } from "./types";

type NavigationIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const defaultNavigation: AppNavigationItem[] = [
  { href: "/app", label: "Today", icon: "today", exact: true, mobile: true },
  { href: "/app/recommendations", label: "Queue", icon: "queue", mobile: true },
  { href: "/app/plan", label: "Plan", icon: "plan", mobile: true },
  { href: "/app/progress", label: "Progress", icon: "progress", mobile: true },
  { href: "/app/activity", label: "Activity", icon: "activity", mobile: false },
  { href: "/app/settings", label: "Settings", icon: "settings", mobile: false },
];

const iconMap: Record<AppNavigationIcon, NavigationIconComponent> = {
  today: HomeIcon,
  queue: QueueListIcon,
  plan: CalendarDaysIcon,
  progress: ChartBarSquareIcon,
  activity: ClockIcon,
  settings: AdjustmentsHorizontalIcon,
};

export function NavigationIcon({ name, className }: { name: AppNavigationIcon; className?: string }) {
  const Icon = iconMap[name];
  return <Icon aria-hidden="true" className={className} />;
}

export function isRouteActive(pathname: string, item: AppNavigationItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
