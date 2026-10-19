# Shared Database Change Log — Admin Panel (for Mobile Team review)

This is the complete, reviewable list of everything the Admin Panel added to the shared
`Auda RFP` Supabase project (`ephubkikqxmqxrzfkpxc`). **Every change is additive and
non-breaking** — no existing table, column, RPC signature, or policy used by the mobile
app was altered, renamed, dropped, or re-typed. Share this with the mobile team for the
Phase-1.6 RBAC sign-off and the coordination checklist in `tasks.md`.

## New migrations (all prefixed `m4_`, after the mobile team's `m2_`/`m3_`)

| Migration | What it adds (additive only) |
| --- | --- |
| `m4_01_audit_log` | `audit_log` table (append-only) + `write_audit_log()` |
| `m4_02_attendance_corrections` | `attendance_corrections` table + `admin_correct_attendance()` |
| `m4_03_notifications_escalations` | `notification_templates`, `escalation_rules` tables |
| `m4_04_challan_stub` | `challan_types` table + `app_settings.challan_enabled` (default false) |
| `m4_05_admin_rpcs_lists_and_audit` | `admin_list_inspections`, `admin_audit_search` |
| `m4_05_admin_rpcs_user_role` | `admin_set_role`, `admin_upsert_employee_profile` |
| `m4_06_admin_list_users` | `admin_list_users` |
| `m4_07_admin_bulk_upload_users` | `admin_bulk_upload_users` |
| `m4_08_admin_upsert_master` | `admin_upsert_master` |
| `m4_09_admin_set_master_active` | `admin_set_master_active` |
| `m4_10_inspection_manager_actions` | `inspection_manager_actions` |
| `m4_11_admin_attendance` | `admin_list_attendance`, `admin_update_attendance_rules` |
| `m4_12_admin_dashboard_widgets` | `admin_dashboard_widgets` |
| `m4_13_admin_report` | `admin_report`, `admin_log_export` |
| `m4_14_admin_notifications_health` | `admin_upsert_notification_template`, `admin_upsert_escalation_rule`, `admin_system_health` |
| `m4_15_fk_covering_indexes` | indexes on `challan_types.department_id`, `escalation_rules.template_code` |
| `m4_16_admin_bulk_upload_master` | `admin_bulk_upload_master` |
| `m4_17_admin_travel_report` | `admin_travel_report` |

## New column on an existing table

- `app_settings.challan_enabled boolean NOT NULL DEFAULT false` — additive, defaulted, so
  existing mobile reads/writes of `app_settings` are unaffected.

## Existing objects used but NOT modified

Reads/calls only, via existing RLS + RPCs: `inspection_role()`, `inspection_can_view/
manage/manage_staff()`, `get_inspections`, `get_inspection_detail`, `save_inspection`,
`assign_inspection`, `transition_inspection`, `add_inspection_comment`,
`get_assignable_staff`, `get_team_locations`, `get_inspection_masters`,
`departments`, `inspection_types`, `inspection_statuses`, `inspection_transitions`,
`staff_roles`, `employee_profiles`, `attendance_punches`, `attendance_rules`, `shifts`,
`work_locations`, `location_points`, `app_settings`.

## RBAC decision to confirm (Phase 1.6)

The Admin Panel kept the existing **4-role enum** in `staff_roles`
(`field_officer / supervisor / dept_head / admin`) — **Option A**. No change to the
mobile app's role model. All admin RPCs check `inspection_role()` and reject non-admins.
**Please confirm this is acceptable**, or flag if configurable roles are required (that
would be a coordinated schema change).

## Coordination checklist (for the two teams)

- [ ] Agree a branching/migration process so both clients' migrations stay linear.
- [ ] Confirm none of the new `m4_*` RPCs/tables collide with planned mobile work.
- [ ] Confirm the RBAC decision (Option A) above.
- [ ] Mobile team pulls the regenerated types after these migrations.

## Security notes carried over (mobile-team-owned, not changed by Admin Panel)

- `tracking_tokens` has RLS enabled with no policy (deny-all for `authenticated`; accessed
  via the mobile SECURITY DEFINER RPCs). Confirm intended before go-live.
- `ingest_location_points` and `is_employee_id_available` are `anon`-executable
  SECURITY DEFINER functions (mobile). Confirm intended before go-live.
