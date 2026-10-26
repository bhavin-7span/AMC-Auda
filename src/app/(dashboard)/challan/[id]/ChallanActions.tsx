'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { transitionChallanAction } from '../actions';
import type { ChallanStatus } from '@/lib/data/challans';

/**
 * Challan workflow buttons. Available actions depend on current status:
 * draft → issue/cancel; issued → pay/cancel; terminal (paid/cancelled) → none.
 */
export function ChallanActions({ id, status }: { id: string; status: ChallanStatus }) {
  const { show } = useToast();
  const [pending, startTransition] = useTransition();

  const actions: { action: 'issue' | 'pay' | 'cancel'; label: string }[] = [];
  if (status === 'draft') actions.push({ action: 'issue', label: 'Issue' }, { action: 'cancel', label: 'Cancel' });
  else if (status === 'issued') actions.push({ action: 'pay', label: 'Mark paid' }, { action: 'cancel', label: 'Cancel' });

  function run(action: 'issue' | 'pay' | 'cancel') {
    const fd = new FormData();
    fd.set('id', id);
    fd.set('action', action);
    startTransition(async () => {
      const res = await transitionChallanAction({ ok: false, error: null }, fd);
      if (res.ok) show(`Challan ${action === 'pay' ? 'marked paid' : action + 'd'}`, 'success');
      else show(res.error ?? 'Action failed', 'error');
    });
  }

  if (actions.length === 0) {
    return <p className="text-sm text-zinc-500" data-testid="challan-terminal">No further actions ({status}).</p>;
  }

  return (
    <div className="flex flex-wrap gap-2" data-testid="challan-actions">
      {actions.map((a) => (
        <Button
          key={a.action}
          data-testid={`challan-action-${a.action}`}
          variant={a.action === 'cancel' ? 'danger' : 'primary'}
          disabled={pending}
          onClick={() => run(a.action)}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
