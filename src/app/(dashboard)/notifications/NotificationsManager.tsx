'use client';

import { useState, useTransition } from 'react';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button, Field, Input, Select } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { upsertTemplateAction, upsertRuleAction } from './actions';
import type { NotificationTemplate, EscalationRule } from '@/lib/data/notifications';

const CHANNELS = ['push', 'sms', 'email'];
const LOCALES = ['en', 'gu', 'hi'];
const TRIGGERS = ['inspection_overdue', 'attendance_exception', 'inspection_unassigned', 'custom'];
const ROLES = ['field_officer', 'supervisor', 'dept_head', 'admin'];

/**
 * Notification templates + escalation rules config (Phase 10). Writes go through the
 * audited admin RPCs (upsertTemplateAction / upsertRuleAction). Presentation + inline
 * add/edit forms; backend enforces admin + writes audit_log.
 */
export function NotificationsManager({
  templates,
  rules,
}: {
  templates: NotificationTemplate[];
  rules: EscalationRule[];
}) {
  const { show } = useToast();
  const [pending, startTransition] = useTransition();
  const [editTpl, setEditTpl] = useState<NotificationTemplate | 'new' | null>(null);
  const [editRule, setEditRule] = useState<EscalationRule | 'new' | null>(null);

  function saveTpl(formData: FormData) {
    startTransition(async () => {
      const res = await upsertTemplateAction({ ok: false, error: null }, formData);
      if (res.ok) {
        show('Template saved', 'success');
        setEditTpl(null);
      } else show(res.error ?? 'Save failed', 'error');
    });
  }

  function saveRule(formData: FormData) {
    startTransition(async () => {
      const res = await upsertRuleAction({ ok: false, error: null }, formData);
      if (res.ok) {
        show('Rule saved', 'success');
        setEditRule(null);
      } else show(res.error ?? 'Save failed', 'error');
    });
  }

  const tplCurrent = editTpl === 'new' ? null : editTpl;
  const ruleCurrent = editRule === 'new' ? null : editRule;

  const tplCols: Column<NotificationTemplate>[] = [
    { key: 'code', header: 'Code', cell: (r) => r.code },
    { key: 'channel', header: 'Channel', cell: (r) => r.channel },
    { key: 'locale', header: 'Locale', cell: (r) => r.locale },
    { key: 'is_active', header: 'Active', cell: (r) => (r.is_active ? 'Yes' : 'No') },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (r) => (
        <Button variant="ghost" data-testid={`edit-tpl-${r.id}`} onClick={() => setEditTpl(r)}>
          Edit
        </Button>
      ),
    },
  ];

  const ruleCols: Column<EscalationRule>[] = [
    { key: 'code', header: 'Code', cell: (r) => r.code },
    { key: 'trigger', header: 'Trigger', cell: (r) => r.trigger },
    { key: 'threshold', header: 'Threshold (min)', cell: (r) => r.threshold_minutes ?? '—' },
    { key: 'target', header: 'Notify', cell: (r) => r.target_role },
    { key: 'channel', header: 'Channel', cell: (r) => r.channel },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (r) => (
        <Button variant="ghost" data-testid={`edit-rule-${r.id}`} onClick={() => setEditRule(r)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-3" data-testid="templates-section">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Notification Templates</h2>
          <Button data-testid="add-template" onClick={() => setEditTpl('new')}>
            Add template
          </Button>
        </div>

        {editTpl !== null && (
          <form action={saveTpl} data-testid="template-form" className="grid max-w-2xl gap-3 rounded-lg border border-black/10 p-4 sm:grid-cols-2 dark:border-white/15">
            {tplCurrent && <input type="hidden" name="id" value={tplCurrent.id} />}
            <Field label="Code" htmlFor="code" required>
              <Input id="code" name="code" required defaultValue={tplCurrent?.code ?? ''} data-testid="tpl-code" />
            </Field>
            <Field label="Channel" htmlFor="channel">
              <Select id="channel" name="channel" defaultValue={tplCurrent?.channel ?? 'email'}>
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Locale" htmlFor="locale">
              <Select id="locale" name="locale" defaultValue={tplCurrent?.locale ?? 'en'}>
                {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Subject" htmlFor="subject">
              <Input id="subject" name="subject" defaultValue={tplCurrent?.subject ?? ''} />
            </Field>
            <Field label="Body" htmlFor="body" required>
              <Input id="body" name="body" required defaultValue={tplCurrent?.body ?? ''} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_active" defaultChecked={tplCurrent ? tplCurrent.is_active : true} /> Active
            </label>
            <div className="flex items-end gap-2 sm:col-span-2">
              <Button type="submit" disabled={pending} data-testid="tpl-save">{pending ? 'Saving…' : 'Save'}</Button>
              <Button variant="secondary" onClick={() => setEditTpl(null)} disabled={pending}>Cancel</Button>
            </div>
          </form>
        )}

        <DataTable columns={tplCols} rows={templates} rowKey={(r) => r.id} page={0} pageSize={templates.length || 1} total={templates.length} onPageChange={() => {}} emptyMessage="No templates yet." />
      </section>

      <section className="space-y-3" data-testid="rules-section">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Escalation Rules</h2>
          <Button data-testid="add-rule" onClick={() => setEditRule('new')}>
            Add rule
          </Button>
        </div>

        {editRule !== null && (
          <form action={saveRule} data-testid="rule-form" className="grid max-w-2xl gap-3 rounded-lg border border-black/10 p-4 sm:grid-cols-2 dark:border-white/15">
            {ruleCurrent && <input type="hidden" name="id" value={ruleCurrent.id} />}
            <Field label="Code" htmlFor="rcode" required>
              <Input id="rcode" name="code" required defaultValue={ruleCurrent?.code ?? ''} data-testid="rule-code" />
            </Field>
            <Field label="Name" htmlFor="rname" required>
              <Input id="rname" name="name" required defaultValue={ruleCurrent?.name ?? ''} />
            </Field>
            <Field label="Trigger" htmlFor="trigger">
              <Select id="trigger" name="trigger" defaultValue={ruleCurrent?.trigger ?? 'inspection_overdue'}>
                {TRIGGERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Threshold (min)" htmlFor="threshold_minutes">
              <Input id="threshold_minutes" name="threshold_minutes" type="number" defaultValue={ruleCurrent?.threshold_minutes ?? ''} />
            </Field>
            <Field label="Notify role" htmlFor="target_role">
              <Select id="target_role" name="target_role" defaultValue={ruleCurrent?.target_role ?? 'supervisor'}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label="Channel" htmlFor="rchannel">
              <Select id="rchannel" name="channel" defaultValue={ruleCurrent?.channel ?? 'email'}>
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_active" defaultChecked={ruleCurrent ? ruleCurrent.is_active : true} /> Active
            </label>
            <div className="flex items-end gap-2 sm:col-span-2">
              <Button type="submit" disabled={pending} data-testid="rule-save">{pending ? 'Saving…' : 'Save'}</Button>
              <Button variant="secondary" onClick={() => setEditRule(null)} disabled={pending}>Cancel</Button>
            </div>
          </form>
        )}

        <DataTable columns={ruleCols} rows={rules} rowKey={(r) => r.id} page={0} pageSize={rules.length || 1} total={rules.length} onPageChange={() => {}} emptyMessage="No escalation rules yet." />
      </section>
    </div>
  );
}
