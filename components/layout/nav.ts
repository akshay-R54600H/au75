import { LayoutDashboard, CalendarDays, Settings, CalendarCheck } from "lucide-react";

export const NAV_LINKS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/skips", label: "Skips", icon: CalendarCheck },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
