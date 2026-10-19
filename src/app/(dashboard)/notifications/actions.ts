'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { upsertNotificationTemplate, upsertEscalationRule } from '@/lib/data/notifications';

export interface ConfigActionState {
  ok: boolean;
  error: string | null;
}

function cleanError(e: unknown): string {
  const m = e instanceof Error ? e.message : 'Operation failed.';
  return /not authorized/i.test(m) ? 'Not authorized.' : m;
}

function payloadFrom(formData: FormData, keys: string[]): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  const id = String(formData.get('id') ?? '').trim();
  if (id) p.id = id;
  for (const k of keys) {
    const v = formData.get(k);
    if (v !== null) p[k] = typeof v === 'string' ? v : String(v);
  }
  p.is_active = formData.get('is_active') === 'on' || formData.get('is_active') === 'true';
  return p;
}

/** Upsert a notification template (admin only, audited). */
export async function upsertTemplateAction(
  _prev: ConfigActionState,
  formData: FormData,
): Promise<ConfigActionState> {
  const payload = payloadFrom(formData, ['code', 'channel', 'locale', 'subject', 'body', 'sort_order']);
  try {
    const supabase = await createClient();
    await upsertNotificationTemplate(supabase, payload);
    revalidatePath('/notifications');
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: cleanError(e) };
  }
}

/** Upsert an escalation rule (admin only, audited). */
export async function upsertRuleAction(
  _prev: ConfigActionState,
  formData: FormData,
): Promise<ConfigActionState> {
  const payload = payloadFrom(formData, [
    'code',
    'name',
    'trigger',
    'threshold_minutes',
    'target_role',
    'channel',
    'template_code',
    'sort_order',
  ]);
  try {
    const supabase = await createClient();
    await upsertEscalationRule(supabase, payload);
    revalidatePath('/notifications');
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: cleanError(e) };
  }
}
