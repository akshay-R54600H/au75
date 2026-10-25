import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock,
  GraduationCap,
  Info,
  Megaphone,
  Newspaper,
  PartyPopper,
  ShieldAlert,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const ANNOUNCEMENT_TYPES = ["announcement", "notice", "news", "disclaimer"] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

/** Shape served by the public /api/announcements endpoint. */
export interface PublicAnnouncement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  /** Chosen symbol, or null/absent to use the type's default icon. */
  icon?: AnnouncementIcon | null;
  expiresAt: string | null;
}

/** Label + carousel styling per type (matches the built-in notice cards). */
export const ANNOUNCEMENT_STYLES: Record<
  AnnouncementType,
  { label: string; border: string; bg: string; icon: LucideIcon; iconColor: string }
> = {
  announcement: { label: "Announcement", border: "border-marker/30", bg: "bg-marker-soft/35", icon: Megaphone, iconColor: "text-marker" },
  notice: { label: "Notice", border: "border-pen/30", bg: "bg-pen-soft/40", icon: Info, iconColor: "text-pen" },
  news: { label: "News", border: "border-success/30", bg: "bg-success-soft/40", icon: Newspaper, iconColor: "text-success" },
  disclaimer: { label: "Disclaimer", border: "border-warn/40", bg: "bg-warn-soft/40", icon: AlertTriangle, iconColor: "text-warn" },
};

/** Symbols the admin can pick for an announcement, in picker order. */
export const ANNOUNCEMENT_ICONS = {
  caution: { label: "Caution", icon: AlertTriangle },
  disclaimer: { label: "Disclaimer", icon: ShieldAlert },
  important: { label: "Important", icon: AlertOctagon },
  info: { label: "Info", icon: Info },
  announcement: { label: "Announcement", icon: Megaphone },
  news: { label: "News", icon: Newspaper },
  reminder: { label: "Reminder", icon: Bell },
  deadline: { label: "Deadline", icon: Clock },
  exam: { label: "Exam", icon: GraduationCap },
  event: { label: "Event", icon: CalendarDays },
  holiday: { label: "Holiday", icon: PartyPopper },
  maintenance: { label: "Maintenance", icon: Wrench },
  update: { label: "New / Update", icon: Sparkles },
  study: { label: "Study", icon: BookOpen },
  goodNews: { label: "Good news", icon: CheckCircle2 },
  help: { label: "Help", icon: CircleHelp },
} satisfies Record<string, { label: string; icon: LucideIcon }>;

export type AnnouncementIcon = keyof typeof ANNOUNCEMENT_ICONS;

export function isAnnouncementType(value: unknown): value is AnnouncementType {
  return (ANNOUNCEMENT_TYPES as readonly unknown[]).includes(value);
}

export function isAnnouncementIcon(value: unknown): value is AnnouncementIcon {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ANNOUNCEMENT_ICONS, value);
}

/** Icon to draw: the chosen symbol, else the type's default. */
export function announcementIconFor(type: AnnouncementType, icon?: string | null): LucideIcon {
  return isAnnouncementIcon(icon) ? ANNOUNCEMENT_ICONS[icon].icon : ANNOUNCEMENT_STYLES[type].icon;
}
