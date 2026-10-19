'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  assignInspection,
  transitionInspection,
  addInspectionComment,
} from '@/lib/data/inspections';

export interface InspectionActionState {
  ok: boolean;
  error: string | null;
}

function cleanError(e: unknown): string {
  const m = e instanceof Error ? e.message : 'Operation failed.';
  if (/not authorized|can_manage|permission/i.test(m)) return 'Not authorized.';
  return m;
}

/** Apply a workflow transition. The transition_inspection RPC validates + authorizes. */
export async function transitionAction(
  _prev: InspectionActionState,
  formData: FormData,
): Promise<InspectionActionState> {
  const id = String(formData.get('id') ?? '');
  const action = String(formData.get('action') ?? '');
  const note = (formData.get('note') as string) || null;
  if (!id || !action) return { ok: false, error: 'Missing inspection or action.' };

  try {
    const supabase = await createClient();
    await transitionInspection(supabase, { id, action, note });
    revalidatePath(`/inspections/${id}`);
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: cleanError(e) };
  }
}

/** Assign / reassign an inspection. */
export async function assignAction(
  _prev: InspectionActionState,
  formData: FormData,
): Promise<InspectionActionState> {
  const id = String(formData.get('id') ?? '');
  const assignee = String(formData.get('assignee') ?? '');
  const note = (formData.get('note') as string) || null;
  if (!id || !assignee) return { ok: false, error: 'Select a staff member.' };

  try {
    const supabase = await createClient();
    await assignInspection(supabase, { id, assignee, note });
    revalidatePath(`/inspections/${id}`);
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: cleanError(e) };
  }
}

/** Add a comment to the inspection thread. */
export async function commentAction(
  _prev: InspectionActionState,
  formData: FormData,
): Promise<InspectionActionState> {
  const id = String(formData.get('id') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  if (!id || !body) return { ok: false, error: 'Enter a comment.' };

  try {
    const supabase = await createClient();
    await addInspectionComment(supabase, { inspectionId: id, body });
    revalidatePath(`/inspections/${id}`);
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: cleanError(e) };
  }
}
