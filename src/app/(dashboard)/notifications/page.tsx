import { createClient } from '@/lib/supabase/server';
import {
  listNotificationTemplates,
  listEscalationRules,
  type NotificationTemplate,
  type EscalationRule,
} from '@/lib/data/notifications';
import { NotificationsManager } from './NotificationsManager';

/**
 * Notifications & escalation configuration (Phase 10). Manage notification templates and
 * escalation rules. Writes are audited admin RPCs. Actual delivery is gateway-dependent
 * (AUDA-approved SMS/email/push) and runs server-side (pg_cron/pg_net) once configured.
 */
export default async function NotificationsPage() {
  const supabase = await createClient();

  let error: string | null = null;
  let templates: NotificationTemplate[] = [];
  let rules: EscalationRule[] = [];

  try {
    [templates, rules] = await Promise.all([
      listNotificationTemplates(supabase),
      listEscalationRules(supabase),
    ]);
  } catch (e) {
    error =
      e instanceof Error && /not authorized/i.test(e.message)
        ? 'You do not have permission to manage notifications.'
        : 'Could not load notification configuration.';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Configure notification templates and escalation rules.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/60 dark:text-red-100">
          {error}
        </p>
      ) : (
        <>
          <p className="rounded-md border border-sky-500/40 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
            Delivery requires an AUDA-approved SMS/email/push gateway. Templates and rules
            are configured here; sending is enabled server-side once a gateway is provisioned.
          </p>
          <NotificationsManager templates={templates} rules={rules} />
        </>
      )}
    </div>
  );
}
