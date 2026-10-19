import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

/**
 * Typed data-access for notifications, escalation rules and system health (Phase 10).
 *
 * Config reads use the authenticated-read RLS; writes go through audited admin RPCs
 * (admin_upsert_notification_template / admin_upsert_escalation_rule). Health is a
 * read-only admin RPC.
 */

export interface NotificationTemplate {
  id: string;
  code: string;
  channel: 'push' | 'sms' | 'email';
  locale: 'en' | 'gu' | 'hi';
  subject: string | null;
  body: string;
  sort_order: number;
  is_active: boolean;
}

export async function listNotificationTemplates(supabase: Client): Promise<NotificationTemplate[]> {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('id, code, channel, locale, subject, body, sort_order, is_active')
    .order('sort_order')
    .order('code');
  if (error) throw error;
  return (data ?? []) as NotificationTemplate[];
}

export async function upsertNotificationTemplate(supabase: Client, payload: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('admin_upsert_notification_template', {
    p_payload: payload as never,
  });
  if (error) throw error;
  return data;
}

export interface EscalationRule {
  id: string;
  code: string;
  name: string;
  trigger: string;
  threshold_minutes: number | null;
  target_role: string;
  channel: 'push' | 'sms' | 'email';
  template_code: string | null;
  sort_order: number;
  is_active: boolean;
}

export async function listEscalationRules(supabase: Client): Promise<EscalationRule[]> {
  const { data, error } = await supabase
    .from('escalation_rules')
    .select('id, code, name, trigger, threshold_minutes, target_role, channel, template_code, sort_order, is_active')
    .order('sort_order')
    .order('code');
  if (error) throw error;
  return (data ?? []) as EscalationRule[];
}

export async function upsertEscalationRule(supabase: Client, payload: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('admin_upsert_escalation_rule', {
    p_payload: payload as never,
  });
  if (error) throw error;
  return data;
}

export interface SystemHealth {
  checked_at: string;
  counts: Record<string, number>;
  sync: Record<string, number | string | null>;
  flags: Record<string, boolean | null>;
}

export async function getSystemHealth(supabase: Client): Promise<SystemHealth> {
  const { data, error } = await supabase.rpc('admin_system_health');
  if (error) throw error;
  return data as unknown as SystemHealth;
}
