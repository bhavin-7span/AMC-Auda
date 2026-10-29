'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  addInspectionComment,
  assignInspection,
  createInspection,
  getAssignableStaff,
  getInspectionDetail,
  getManagerActions,
  signEvidenceUrls,
  transitionInspection,
  type AssignableStaff,
  type InspectionDetailShape,
  type ManagerAction,
} from '@/lib/data/inspections';

export interface CreateInspectionInput {
  typeId: string;
  departmentId: string;
  priority: string;
  siteAddress: string;
  latitude: number | null;
  longitude: number | null;
  instructions: string;
  assignee: string;
  /** YYYY-MM-DD (IST). */
  date: string;
  /** HH:MM (IST), optional. */
  time: string;
}

export type CreateInspectionResult =
  | { ok: true; id: string; refNo: string | null; warning: string | null }
  | { ok: false; error: string };

const PRIORITIES = new Set(['low', 'medium', 'high']);

function cleanError(e: unknown): string {
  const m = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : '';
  if (/not authorized|can_manage|permission/i.test(m)) return 'You are not allowed to create inspections.';
  return m || 'Could not create the inspection.';
}

/**
 * Create an inspection, assign it to the chosen officer and post the instructions as the
 * first comment. save_inspection, assign_inspection and add_inspection_comment each
 * validate and authorize the caller. Assignment or comment failures after the record
 * exists are reported as a warning rather than losing the new inspection.
 */
export async function createInspectionAction(input: CreateInspectionInput): Promise<CreateInspectionResult> {
  const siteAddress = input.siteAddress.trim();
  if (!input.typeId || !input.departmentId) return { ok: false, error: 'Choose an inspection type and zone.' };
  if (!PRIORITIES.has(input.priority)) return { ok: false, error: 'Choose a priority.' };
  if (!siteAddress) return { ok: false, error: 'Enter the site address.' };
  if (input.latitude == null || input.longitude == null) return { ok: false, error: 'Pick the site location on the map.' };
  if (!input.assignee) return { ok: false, error: 'Choose a field officer.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: 'Choose a scheduled date.' };
  const time = /^\d{2}:\d{2}$/.test(input.time) ? input.time : '10:00';
  const scheduledAt = new Date(`${input.date}T${time}:00+05:30`);
  if (Number.isNaN(scheduledAt.getTime())) return { ok: false, error: 'Invalid scheduled date or time.' };

  const supabase = await createClient();
  let created: { id: string; ref_no: string | null };
  try {
    created = await createInspection(supabase, {
      title: siteAddress,
      departmentId: input.departmentId,
      typeId: input.typeId,
      priority: input.priority,
      locationName: siteAddress,
      latitude: input.latitude,
      longitude: input.longitude,
      scheduledAt: scheduledAt.toISOString(),
    });
  } catch (e) {
    return { ok: false, error: cleanError(e) };
  }

  const warnings: string[] = [];
  try {
    await assignInspection(supabase, { id: created.id, assignee: input.assignee });
  } catch (e) {
    warnings.push(`Created, but assignment failed: ${cleanError(e)}`);
  }
  const instructions = input.instructions.trim();
  if (instructions) {
    try {
      await addInspectionComment(supabase, { inspectionId: created.id, body: `Instructions: ${instructions}` });
    } catch (e) {
      warnings.push(`Instructions were not saved: ${cleanError(e)}`);
    }
  }

  revalidatePath('/inspections');
  return { ok: true, id: created.id, refNo: created.ref_no, warning: warnings.join(' ') || null };
}

export type InspectionDrawerData =
  | {
      ok: true;
      detail: InspectionDetailShape;
      signedUrls: Record<string, string>;
      actions: ManagerAction[];
      staff: AssignableStaff[];
    }
  | { ok: false; error: string };

/**
 * Everything the inspection detail drawer needs, in one round trip: the detail
 * (get_inspection_detail enforces view access), short-lived evidence URLs and, for
 * managers, the workflow actions and assignable staff.
 */
export async function loadInspectionDrawer(id: string): Promise<InspectionDrawerData> {
  const supabase = await createClient();
  try {
    const detail = await getInspectionDetail(supabase, id);
    const [signedUrls, actions, staff] = await Promise.all([
      signEvidenceUrls(supabase, detail.evidence.map((e) => e.storage_path)),
      detail.can_manage ? getManagerActions(supabase, detail.inspection.status) : Promise.resolve([]),
      detail.can_manage ? getAssignableStaff(supabase).catch(() => []) : Promise.resolve([]),
    ]);
    return { ok: true, detail, signedUrls, actions, staff };
  } catch (e) {
    const m = workflowError(e);
    return { ok: false, error: /not found|IN404/i.test(m) ? 'Inspection not found.' : m };
  }
}

export interface InspectionActionState {
  ok: boolean;
  error: string | null;
}

function workflowError(e: unknown): string {
  const m = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : 'Operation failed.';
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
    revalidatePath('/inspections');
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: workflowError(e) };
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
    revalidatePath('/inspections');
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: workflowError(e) };
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
    revalidatePath('/inspections');
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: workflowError(e) };
  }
}
