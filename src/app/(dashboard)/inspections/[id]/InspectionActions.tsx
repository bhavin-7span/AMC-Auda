'use client';

import { useTransition } from 'react';
import { Button, Select } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { transitionAction, assignAction, commentAction } from './actions';
import type { ManagerAction, AssignableStaff } from '@/lib/data/inspections';

/**
 * Manager controls for an inspection: workflow transitions (DB-driven), assignment, and
 * commenting. Disabled entirely when the viewer can't manage this inspection. The real
 * authorization is enforced by the RPCs; `canManage` just shapes the UI.
 */
export function InspectionActions({
  id,
  canManage,
  actions,
  staff,
}: {
  id: string;
  canManage: boolean;
  actions: ManagerAction[];
  staff: AssignableStaff[];
}) {
  const { show } = useToast();
  const [pending, startTransition] = useTransition();

  function runTransition(action: string) {
    const fd = new FormData();
    fd.set('id', id);
    fd.set('action', action);
    startTransition(async () => {
      const res = await transitionAction({ ok: false, error: null }, fd);
      if (res.ok) show(`Action "${action}" applied`, 'success');
      else show(res.error ?? 'Action failed', 'error');
    });
  }

  function submitAssign(formData: FormData) {
    formData.set('id', id);
    startTransition(async () => {
      const res = await assignAction({ ok: false, error: null }, formData);
      if (res.ok) show('Inspection assigned', 'success');
      else show(res.error ?? 'Assignment failed', 'error');
    });
  }

  function submitComment(formData: FormData) {
    formData.set('id', id);
    startTransition(async () => {
      const res = await commentAction({ ok: false, error: null }, formData);
      if (res.ok) show('Comment added', 'success');
      else show(res.error ?? 'Could not add comment', 'error');
    });
  }

  if (!canManage) {
    return (
      <p className="text-sm text-zinc-500" data-testid="no-manage">
        You have view-only access to this inspection.
      </p>
    );
  }

  return (
    <div className="space-y-5" data-testid="inspection-actions">
      <div>
        <h3 className="mb-2 text-sm font-medium">Workflow</h3>
        {actions.length === 0 ? (
          <p className="text-sm text-zinc-500">No actions available from this status.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <Button
                key={a.action}
                data-testid={`action-${a.action}`}
                disabled={pending}
                onClick={() => runTransition(a.action)}
              >
                {a.action} → {a.to_name}
              </Button>
            ))}
          </div>
        )}
      </div>

      <form action={submitAssign} className="space-y-2" data-testid="assign-form">
        <h3 className="text-sm font-medium">Assign to</h3>
        <div className="flex gap-2">
          <Select name="assignee" aria-label="Assignee" data-testid="assign-select">
            <option value="">Select staff…</option>
            {staff.map((s) => (
              <option key={s.user_id} value={s.user_id}>
                {s.full_name} ({s.employee_id})
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={pending} data-testid="assign-submit">
            Assign
          </Button>
        </div>
      </form>

      <form action={submitComment} className="space-y-2" data-testid="comment-form">
        <h3 className="text-sm font-medium">Add comment</h3>
        <textarea
          name="body"
          data-testid="comment-body"
          rows={3}
          className="w-full rounded-md border border-black/15 bg-transparent p-2 text-sm outline-none focus:border-zinc-500 dark:border-white/20"
          placeholder="Message to field staff…"
        />
        <Button type="submit" disabled={pending} data-testid="comment-submit">
          Post comment
        </Button>
      </form>
    </div>
  );
}
