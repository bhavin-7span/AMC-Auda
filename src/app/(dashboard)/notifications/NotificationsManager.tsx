'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectOptions, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { upsertTemplateAction, upsertRuleAction } from './actions';
import type { NotificationTemplate, EscalationRule } from '@/lib/data/notifications';

const toItems = (values: string[]) => values.map((v) => ({ value: v, label: v }));
const CHANNELS = toItems(['push', 'sms', 'email']);
const LOCALES = toItems(['en', 'gu', 'hi']);
const TRIGGERS = toItems(['inspection_overdue', 'attendance_exception', 'inspection_unassigned', 'custom']);
const ROLES = toItems(['field_officer', 'supervisor', 'dept_head', 'admin']);

/** shadcn Select posting `name` through its hidden input. */
function selectField(id: string, label: string, name: string, items: { value: string; label: string }[], defaultValue: string) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select name={name} items={items} defaultValue={defaultValue}>
        <SelectTrigger id={id} className="h-9 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectOptions items={items} />
        </SelectContent>
      </Select>
    </Field>
  );
}

/**
 * Notification templates + escalation rules config (Phase 10). Add/edit happen in dialogs;
 * writes go through the audited admin RPCs (upsertTemplateAction / upsertRuleAction).
 */
export function NotificationsManager({
  templates,
  rules,
}: {
  templates: NotificationTemplate[];
  rules: EscalationRule[];
}) {
  const [pending, startTransition] = useTransition();
  const [editTpl, setEditTpl] = useState<NotificationTemplate | 'new' | null>(null);
  const [editRule, setEditRule] = useState<EscalationRule | 'new' | null>(null);
  const [tplActive, setTplActive] = useState(true);
  const [ruleActive, setRuleActive] = useState(true);

  const tplCurrent = editTpl === 'new' ? null : editTpl;
  const ruleCurrent = editRule === 'new' ? null : editRule;

  function openTpl(t: NotificationTemplate | 'new') {
    setEditTpl(t);
    setTplActive(t === 'new' ? true : t.is_active);
  }

  function openRule(r: EscalationRule | 'new') {
    setEditRule(r);
    setRuleActive(r === 'new' ? true : r.is_active);
  }

  function saveTpl(formData: FormData) {
    if (tplCurrent) formData.set('id', tplCurrent.id);
    if (tplActive) formData.set('is_active', 'on');
    else formData.delete('is_active');
    startTransition(async () => {
      const res = await upsertTemplateAction({ ok: false, error: null }, formData);
      if (res.ok) {
        toast.success('Template saved');
        setEditTpl(null);
      } else toast.error(res.error ?? 'Save failed');
    });
  }

  function saveRule(formData: FormData) {
    if (ruleCurrent) formData.set('id', ruleCurrent.id);
    if (ruleActive) formData.set('is_active', 'on');
    else formData.delete('is_active');
    startTransition(async () => {
      const res = await upsertRuleAction({ ok: false, error: null }, formData);
      if (res.ok) {
        toast.success('Rule saved');
        setEditRule(null);
      } else toast.error(res.error ?? 'Save failed');
    });
  }

  // Each form is shared by its section's "Add" dialog (current = null) and the row "Edit" dialogs.
  const templateForm = (current: NotificationTemplate | null) => (
    <form action={saveTpl} data-testid="template-form" className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{current ? 'Edit template' : 'Add template'}</DialogTitle>
        <DialogDescription>Message sent when a notification fires.</DialogDescription>
      </DialogHeader>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="code">
            Code <span className="text-destructive">*</span>
          </FieldLabel>
          <Input id="code" name="code" required defaultValue={current?.code ?? ''} data-testid="tpl-code" />
        </Field>
        {selectField('channel', 'Channel', 'channel', CHANNELS, current?.channel ?? 'email')}
        {selectField('locale', 'Locale', 'locale', LOCALES, current?.locale ?? 'en')}
        <Field>
          <FieldLabel htmlFor="subject">Subject</FieldLabel>
          <Input id="subject" name="subject" defaultValue={current?.subject ?? ''} />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="body">
            Body <span className="text-destructive">*</span>
          </FieldLabel>
          <Textarea id="body" name="body" required rows={4} defaultValue={current?.body ?? ''} />
        </Field>
        <Label className="font-normal">
          <Checkbox checked={tplActive} onCheckedChange={setTplActive} /> Active
        </Label>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setEditTpl(null)} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending} data-testid="tpl-save">
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );

  const ruleForm = (current: EscalationRule | null) => (
    <form action={saveRule} data-testid="rule-form" className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{current ? 'Edit escalation rule' : 'Add escalation rule'}</DialogTitle>
        <DialogDescription>Who to notify when a trigger crosses its threshold.</DialogDescription>
      </DialogHeader>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="rcode">
            Code <span className="text-destructive">*</span>
          </FieldLabel>
          <Input id="rcode" name="code" required defaultValue={current?.code ?? ''} data-testid="rule-code" />
        </Field>
        <Field>
          <FieldLabel htmlFor="rname">
            Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input id="rname" name="name" required defaultValue={current?.name ?? ''} />
        </Field>
        {selectField('trigger', 'Trigger', 'trigger', TRIGGERS, current?.trigger ?? 'inspection_overdue')}
        <Field>
          <FieldLabel htmlFor="threshold_minutes">Threshold (min)</FieldLabel>
          <Input
            id="threshold_minutes"
            name="threshold_minutes"
            type="number"
            defaultValue={current?.threshold_minutes ?? ''}
          />
        </Field>
        {selectField('target_role', 'Notify role', 'target_role', ROLES, current?.target_role ?? 'supervisor')}
        {selectField('rchannel', 'Channel', 'channel', CHANNELS, current?.channel ?? 'email')}
        <Label className="font-normal">
          <Checkbox checked={ruleActive} onCheckedChange={setRuleActive} /> Active
        </Label>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setEditRule(null)} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending} data-testid="rule-save">
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );

  const tplDialogProps = (target: NotificationTemplate | 'new') => ({
    open: target === 'new' ? editTpl === 'new' : editTpl !== 'new' && editTpl?.id === target.id,
    onOpenChange: (open: boolean) => {
      if (pending) return;
      if (open) openTpl(target);
      else setEditTpl(null);
    },
  });

  const ruleDialogProps = (target: EscalationRule | 'new') => ({
    open: target === 'new' ? editRule === 'new' : editRule !== 'new' && editRule?.id === target.id,
    onOpenChange: (open: boolean) => {
      if (pending) return;
      if (open) openRule(target);
      else setEditRule(null);
    },
  });

  return (
    <div className="space-y-6">
      <Card data-testid="templates-section">
        <CardHeader>
          <CardTitle>Notification Templates</CardTitle>
          <CardAction>
            <Dialog {...tplDialogProps('new')}>
              <DialogTrigger render={<Button data-testid="add-template" />}>Add template</DialogTrigger>
              <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
                {templateForm(null)}
              </DialogContent>
            </Dialog>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          <Table data-testid="data-table">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Code</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Locale</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground" data-testid="data-table-empty">
                    No templates yet.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-4 font-medium">{r.code}</TableCell>
                    <TableCell>{r.channel}</TableCell>
                    <TableCell>{r.locale}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? 'success' : 'outline'}>{r.is_active ? 'Yes' : 'No'}</Badge>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Dialog {...tplDialogProps(r)}>
                        <DialogTrigger render={<Button variant="ghost" size="sm" data-testid={`edit-tpl-${r.id}`} />}>Edit</DialogTrigger>
                        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
                          {templateForm(r)}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card data-testid="rules-section">
        <CardHeader>
          <CardTitle>Escalation Rules</CardTitle>
          <CardAction>
            <Dialog {...ruleDialogProps('new')}>
              <DialogTrigger render={<Button data-testid="add-rule" />}>Add rule</DialogTrigger>
              <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
                {ruleForm(null)}
              </DialogContent>
            </Dialog>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          <Table data-testid="data-table">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Code</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Threshold (min)</TableHead>
                <TableHead>Notify</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground" data-testid="data-table-empty">
                    No escalation rules yet.
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-4 font-medium">{r.code}</TableCell>
                    <TableCell>{r.trigger}</TableCell>
                    <TableCell className="tabular-nums">{r.threshold_minutes ?? '—'}</TableCell>
                    <TableCell>{r.target_role}</TableCell>
                    <TableCell>{r.channel}</TableCell>
                    <TableCell className="pr-4 text-right">
                      <Dialog {...ruleDialogProps(r)}>
                        <DialogTrigger render={<Button variant="ghost" size="sm" data-testid={`edit-rule-${r.id}`} />}>Edit</DialogTrigger>
                        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
                          {ruleForm(r)}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
