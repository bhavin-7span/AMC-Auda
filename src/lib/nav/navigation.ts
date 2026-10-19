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
        roles: ['admin'],
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
