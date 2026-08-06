export type AppNavigationIcon =
  | "today"
  | "queue"
  | "plan"
  | "progress"
  | "activity"
  | "settings";

export interface AppNavigationItem {
  href: string;
  label: string;
  icon: AppNavigationIcon;
  exact?: boolean;
  mobile?: boolean;
  badge?: string | number;
}

export interface AppShellUser {
  name: string;
  email?: string | null;
  initials?: string;
}
