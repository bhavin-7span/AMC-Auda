'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatMinutes, type AttendanceRules } from '@/lib/data/attendance';
import { updateRulesAction } from './actions';

const DAY_START = [
  { value: 'first_check_in', label: 'First check-in' },
  { value: 'not_before_shift_start', label: 'Not before shift start' },
];
const DAY_END = [
  { value: 'last_check_out', label: 'Last check-out' },
  { value: 'not_after_shift_end', label: 'Not after shift end' },
];

const labelOf = (items: { value: string; label: string }[], value: string) =>
  items.find((i) => i.value === value)?.label ?? value;

/**
 * Attendance rules config (singleton): current values in a card, edited in a dialog.
 * Admin-only write via admin_update_attendance_rules (audited). Timezone is fixed
 * (Asia/Kolkata) and shown read-only.
 */
export function RulesForm({ rules }: { rules: AttendanceRules }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deductBreaks, setDeductBreaks] = useState(rules.deduct_breaks);
  const [fieldDuty, setFieldDuty] = useState(rules.count_field_duty_as_work);

  function submit(formData: FormData) {
    // updateRulesAction reads checkboxes as "on"; the shadcn Checkbox is controlled here.
    if (deductBreaks) formData.set('deduct_breaks', 'on');
    else formData.delete('deduct_breaks');
    if (fieldDuty) formData.set('count_field_duty_as_work', 'on');
    else formData.delete('count_field_duty_as_work');
    startTransition(async () => {
      const res = await updateRulesAction({ ok: false, error: null }, formData);
      if (res.ok) {
        toast.success('Attendance rules updated');
        setOpen(false);
      } else {
        toast.error(res.error ?? 'Update failed');
      }
    });
  }

  const summary = [
    { label: 'Day start', value: labelOf(DAY_START, rules.day_start_rule) },
    { label: 'Day end', value: labelOf(DAY_END, rules.day_end_rule) },
    { label: 'Half day under', value: formatMinutes(rules.half_day_minutes) },
    { label: 'Shift window', value: formatMinutes(rules.shift_window_minutes) },
    { label: 'Breaks', value: rules.deduct_breaks ? 'Deducted' : 'Counted as work' },
    { label: 'Field duty', value: rules.count_field_duty_as_work ? 'Counted as work' : 'Not counted' },
    { label: 'Timezone', value: `${rules.timezone} (fixed)` },
  ];

  return (
    <Card data-testid="rules-section">
      <CardHeader>
        <CardTitle>Attendance rules</CardTitle>
        <CardDescription>How punches turn into worked time and day status.</CardDescription>
        <CardAction>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              if (pending) return;
              setOpen(next);
              // Reopening starts from the saved values.
              setDeductBreaks(rules.deduct_breaks);
              setFieldDuty(rules.count_field_duty_as_work);
            }}
          >
            <DialogTrigger render={<Button variant="outline" data-testid="rules-edit" />}>Edit rules</DialogTrigger>
            <DialogContent
              className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl"
            >
              <form action={submit} data-testid="rules-form" className="grid gap-4">
                <DialogHeader>
                  <DialogTitle>Edit attendance rules</DialogTitle>
                  <DialogDescription>Changes apply to new calculations and are audited.</DialogDescription>
                </DialogHeader>
                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="day_start_rule">Day start rule</FieldLabel>
                    <Select name="day_start_rule" items={DAY_START} defaultValue={rules.day_start_rule}>
                      <SelectTrigger id="day_start_rule" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {DAY_START.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="day_end_rule">Day end rule</FieldLabel>
                    <Select name="day_end_rule" items={DAY_END} defaultValue={rules.day_end_rule}>
                      <SelectTrigger id="day_end_rule" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {DAY_END.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="half_day_minutes">Half-day minutes</FieldLabel>
                    <Input id="half_day_minutes" name="half_day_minutes" type="number" defaultValue={rules.half_day_minutes} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="shift_window_minutes">Shift window minutes</FieldLabel>
                    <Input
                      id="shift_window_minutes"
                      name="shift_window_minutes"
                      type="number"
                      defaultValue={rules.shift_window_minutes}
                    />
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox id="deduct_breaks" checked={deductBreaks} onCheckedChange={setDeductBreaks} />
                    <FieldLabel htmlFor="deduct_breaks" className="font-normal">
                      Deduct breaks
                    </FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox id="count_field_duty_as_work" checked={fieldDuty} onCheckedChange={setFieldDuty} />
                    <FieldLabel htmlFor="count_field_duty_as_work" className="font-normal">
                      Count field duty as work
                    </FieldLabel>
                  </Field>
                </FieldGroup>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pending} data-testid="rules-save">
                    {pending ? 'Saving…' : 'Save rules'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          {summary.map((s) => (
            <div key={s.label}>
              <dt className="text-muted-foreground">{s.label}</dt>
              <dd className="font-medium">{s.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
