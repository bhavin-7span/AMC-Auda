/**
 * Navigation model for the Admin Panel shell.
 *
 * Nav visibility is driven by the caller's role from `staff_roles` via the
 * `inspection_role()` RPC (see .kiro/steering/backend.md). This is COSMETIC only —
 * the real authorization gate is RLS + SECURITY DEFINER RPCs on the backend. Hiding a
 * nav item never substitutes for a server-side check.
 *
 * Roles (current backend enum): field_officer | supervisor | dept_head | admin.
 */

export type Role = 'field_officer' | 'supervisor' | 'dept_head' | 'admin';

export const ROLES: readonly Role[] = ['field_officer', 'supervisor', 'dept_head', 'admin'];

export function isRole(value: string | null | undefined): value is Role {
  return value != null && (ROLES as readonly string[]).includes(value);
}

export interface NavItem {
  /** Stable key, also used as a test id. */
  key: string;
  /** Display label. (i18n is Task 0.4 — plain strings for now.) */
  label: string;
  /** Route path. */
  href: string;
  /** Roles allowed to SEE this item. Omit = visible to all authenticated roles. */
  roles?: readonly Role[];
  /** Optional feature flag that must be enabled for this item to appear. */
  requiresFlag?: 'challanEnabled' | 'routeTrackingEnabled';
}

/** Feature-flag state used to gate optional-module nav items. */
export interface NavFlags {
  challanEnabled?: boolean;
  routeTrackingEnabled?: boolean;
}

export interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
}

/**
 * Full navigation tree. Routes are placeholders until their phases are built; the
 * shell renders them now so the structure is testable and reflects the spec modules.
 */
export const NAV_SECTIONS: readonly NavSection[] = [
  {
    key: 'overview',
    label: 'Overview',
    items: [{ key: 'dashboard', label: 'Dashboard', href: '/dashboard' }],
  },
  {
    key: 'field-ops',
    label: 'Field Operations',
    items: [
      { key: 'inspections', label: 'Inspections', href: '/inspections' },
      { key: 'attendance', label: 'Attendance', href: '/attendance' },
      {
        key: 'challan',
        label: 'M-Challan',
        href: '/challan',
        // Mirrors challans RLS: admin + dept_head write, so both need the entry point.
        roles: ['admin', 'dept_head'],
        requiresFlag: 'challanEnabled',
      },
    ],
  },
  {
    key: 'reporting',
    label: 'Reporting',
    items: [
      { key: 'reports', label: 'MIS Reports', href: '/reports' },
      {
        key: 'audit',
        label: 'Audit Trail',
        href: '/audit',
        roles: ['dept_head', 'admin'],
      },
    ],
  },
  {
    key: 'administration',
    label: 'Administration',
    items: [
      { key: 'masters', label: 'Master Data', href: '/masters', roles: ['admin'] },
      { key: 'users', label: 'Users & Roles', href: '/users', roles: ['admin'] },
      {
        key: 'notifications',
        label: 'Notifications',
        href: '/notifications',
        roles: ['admin'],
      },
      {
        key: 'system',
        label: 'System Health',
        href: '/system',
        roles: ['admin'],
      },
    ],
  },
];

/** Returns true if a nav item is visible to the given role + flags. */
export function canSeeNavItem(item: NavItem, role: Role | null, flags: NavFlags = {}): boolean {
  // Feature-flag gate: hide optional-module items when their flag is off.
  if (item.requiresFlag && !flags[item.requiresFlag]) return false;
  if (!item.roles) return role != null; // visible to any authenticated role
  return role != null && item.roles.includes(role);
}

/** Filters the nav tree to the sections/items visible for a role + flags, dropping empties. */
export function navForRole(role: Role | null, flags: NavFlags = {}): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canSeeNavItem(item, role, flags)),
  })).filter((section) => section.items.length > 0);
}

export interface PageTitle {
  title: string;
  description: string;
}

/**
 * Header title + subtitle per route, longest prefix first so sub-routes (travel) win over
 * their parent. Detail pages (/attendance/<userId>) fall back to their section's title.
 */
const PAGE_TITLES: readonly (PageTitle & { prefix: string })[] = [
  { prefix: '/inspections/travel', title: 'Travel & Activity', description: 'Route and distance travelled by field staff for a day.' },
  { prefix: '/dashboard', title: 'Field operations dashboard', description: 'Monitor inspections, field teams, attendance and system performance.' },
  { prefix: '/inspections', title: 'Inspections', description: 'Create, assign, review and audit field inspection records.' },
  { prefix: '/attendance', title: 'Attendance', description: 'Monitor punches, flag exceptions and apply corrections.' },
  { prefix: '/challan', title: 'M-Challan', description: 'Create, issue and track challans. Generate a challan PDF with a unique reference number.' },
  { prefix: '/reports', title: 'MIS Reports', description: 'Filter, preview and export inspection & attendance data.' },
  { prefix: '/audit', title: 'Audit Trail', description: 'Append-only record of administrative and data actions across the system.' },
  { prefix: '/masters', title: 'Master Data', description: 'Manage departments, geo-fences and other reference data.' },
  { prefix: '/users', title: 'Users & Roles', description: 'Manage user roles and department assignments.' },
  { prefix: '/notifications', title: 'Notifications', description: 'Configure notification templates and escalation rules.' },
  { prefix: '/system', title: 'System Health', description: 'Integration, synchronization and operational status.' },
];

export function pageTitleFor(pathname: string): PageTitle | null {
  return (
    PAGE_TITLES.find((p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`)) ?? null
  );
}
