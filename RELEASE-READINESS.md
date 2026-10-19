# AUDA FieldTrack Admin Panel — Release Readiness (Phase 12)

Status of the hardening pass. Items are marked **Done** (implemented + verified here),
**Ops** (requires a Supabase dashboard / infrastructure action), or **External**
(requires AUDA / a third party). i18n (12.1) was explicitly deprioritized by AUDA.

## 12.2 Security pass

**Done — verified in this repo / against the live backend:**

- **Authorization is enforced server-side on every admin operation.** All 17
  `admin_*` RPCs were verified to (a) call `inspection_role()` and (b) raise `42501`
  (permission denied) for non-admins. The Supabase advisor flags them as
  "callable by authenticated" — that is the expected RPC-gateway pattern; each function
  enforces its own role check internally. Authorization never relies on the UI.
- **IDOR / scope:** list/detail/report RPCs filter by role + department/ownership via the
  existing `inspection_can_view` / `inspection_can_manage` helpers and the role gate.
- **No secrets in the client bundle.** `SUPABASE_SERVICE_ROLE_KEY` is read only in
  server-only modules (`src/lib/supabase/admin.ts`, `src/lib/export/generate.ts` both
  carry `import 'server-only'`). The create-user UI receives a boolean
  (`adminApiConfigured`), never the key. No `NEXT_PUBLIC_*` secret misnaming.
- **CSRF / auth transport:** auth is Supabase Auth over HTTPS with `@supabase/ssr`
  cookie handling; sign-out invalidates server-side; logout is POST-only. Route
  protection in `proxy.ts` redirects unauthenticated users and bounces authed users off
  `/login`.
- **Input validation:** admin RPCs validate enums/types (role, master type, report name,
  format) and reject unknown values; export route whitelists report + format; CSV/JSON
  payloads are parsed defensively.
- **Audit trail:** append-only `audit_log` (SELECT-only policy; writes only via
  SECURITY DEFINER `write_audit_log`). Confirmed no UPDATE/DELETE policy exists.

**Ops — Supabase dashboard settings (not code):**

- **Enable leaked-password protection** (advisor WARN) — Auth → Passwords → HaveIBeenPwned.
- **Configure password policy, account lockout, idle/absolute session timeout, and MFA**
  for privileged accounts (Auth settings). Code paths assume these; the toggles are
  dashboard config.

**Mobile-team-owned (do NOT change from the admin panel):**

- `tracking_tokens` has RLS enabled with no policy → effectively deny-all for
  `authenticated` (safe); the mobile app accesses it only via its SECURITY DEFINER RPCs.
  Leave to the mobile team.
- Two `anon`-executable RPCs (`ingest_location_points`, `is_employee_id_available`) are
  the mobile team's. Review ownership before go-live, but not an admin-panel change.

## 12.3 Accessibility

**Done:**

- Automated axe-core (WCAG 2.0/2.1 A & AA) checks in `e2e/a11y.spec.ts` on
  guest-reachable surfaces (login, UI-kit showcase); authenticated dashboard check is
  skip-gated on a seeded account.
- Fixed real **color-contrast** failures caught by axe: `Widget` hint, sidebar section
  labels, and inactive-status text moved from `text-zinc-400` → `text-zinc-500` on light
  backgrounds (now ≥ 4.5:1). Suite passes with zero serious/critical violations.
- Components use semantic roles, labels (`Field`/`label`), `aria-sort` on sortable
  columns, `aria-live` toast region, keyboard-operable controls.

**External:** Full WCAG conformance still requires manual assistive-technology testing
(screen readers, keyboard-only, zoom) and expert review — automated checks cover the
mechanical subset only.

## 12.4 Performance

**Done:**

- Admin lists/reports are **server-side paged/filtered/sorted** (no client-side
  over-fetch); exports page through a 5000-row guardrail.
- Verified the heavily-queried tables (`inspections`, `attendance_punches`, `audit_log`)
  already carry covering indexes for the filter/sort columns.
- Added covering indexes for two FKs flagged by the perf advisor
  (`challan_types.department_id`, `escalation_rules.template_code`) — migration `m4_15`.
- "Unused index" advisor notices are expected on this low-traffic dev DB; they become
  used under production load. "Multiple permissive policies" on the three config tables
  is a negligible micro-cost on tiny tables; left as-is to avoid behavior changes.

**External:** Load/volume testing against production-sized data to confirm the RFP SLA
(>99% quarterly availability, response targets) belongs to the performance test phase.

## 12.5 VAPT (External)

Pre-go-live VAPT by a CERT-In empanelled agency is an AUDA/third-party activity. All
Critical/High findings must be remediated and re-tested before production go-live. The
codebase supports this: audited admin surface, server-enforced authz, no client secrets,
append-only audit. Coordinate scheduling with AUDA.

## 12.6 Production hosting (External / decision)

The RFP requires **dedicated, isolated, India-based** hosting with a dedicated firewall,
DR, and backups. The dev backend is managed Supabase in `ap-south-1` (Mumbai). Confirm
whether managed Supabase meets the §11 dedication/isolation clauses, or whether
self-hosted Supabase on AUDA-approved dedicated infra is required. This is a
procurement/architecture decision, not a code change. (Tracked in design §17 Q11.)

## Standing test unblock

~23 authenticated E2E tests across Phases 2–12 are written and skip-gated on
`E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (plus `SUPABASE_SERVICE_ROLE_KEY` for account
lifecycle, `E2E_CHALLAN_ENABLED=1` for the challan-enabled case). Provide a seeded admin
account to turn them green in one pass.
