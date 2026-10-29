import {
  Activity,
  BarChart3,
  Bell,
  CalendarCheck,
  ClipboardList,
  Database,
  FileWarning,
  LayoutDashboard,
  ScrollText,
  Users,
  type LucideIcon,
} from 'lucide-react';

/** Icon per nav item key, shared by the sidebar and the page header eyebrow. */
export const NAV_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  inspections: ClipboardList,
  attendance: CalendarCheck,
  challan: FileWarning,
  reports: BarChart3,
  audit: ScrollText,
  masters: Database,
  users: Users,
  notifications: Bell,
  system: Activity,
};
