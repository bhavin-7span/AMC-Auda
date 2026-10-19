'use client';

import { useTransition } from 'react';
import { Button, Field, Input, Select } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { updateRulesAction } from './actions';
import type { AttendanceRules } from '@/lib/data/attendance';

/**
 * Attendance rules config (singleton). Admin-only write via admin_update_attendance_rules
 * (audited). Timezone is fixed (Asia/Kolkata) and shown read-only.
 */
export function RulesForm({ rules }: { rules: AttendanceRules }) {
  const { show } = useToast();
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await updateRulesAction({ ok: false, error: null }, formData);
      if (res.ok) show('Attendance rules updated', 'success');
      else show(res.error ?? 'Update failed', 'error');
    });
  }

  return (
    <form
      action={submit}
      data-testid="rules-form"
      className="grid max-w-2xl gap-3 rounded-lg border border-black/10 p-4 sm:grid-cols-2 dark:border-white/15"
    >
      <Field label="Day start rule" htmlFor="day_start_rule">
        <Select id="day_start_rule" name="day_start_rule" defaultValue={rules.day_start_rule}>
          <option value="first_check_in">First check-in</option>
          <option value="not_before_shift_start">Not before shift start</option>
        </Select>
      </Field>
      <Field label="Day end rule" htmlFor="day_end_rule">
        <Select id="day_end_rule" name="day_end_rule" defaultValue={rules.day_end_rule}>
          <option value="last_check_out">Last check-out</option>
          <option value="not_after_shift_end">Not after shift end</option>
        </Select>
      </Field>
      <Field label="Half-day minutes" htmlFor="half_day_minutes">
        <Input id="half_day_minutes" name="half_day_minutes" type="number" defaultValue={rules.half_day_minutes} />
      </Field>
      <Field label="Shift window minutes" htmlFor="shift_window_minutes">
        <Input id="shift_window_minutes" name="shift_window_minutes" type="number" defaultValue={rules.shift_window_minutes} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="deduct_breaks" defaultChecked={rules.deduct_breaks} /> Deduct breaks
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="count_field_duty_as_work" defaultChecked={rules.count_field_duty_as_work} />
        Count field duty as work
      </label>
      <p className="text-xs text-zinc-500 sm:col-span-2">Timezone: {rules.timezone} (fixed)</p>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} data-testid="rules-save">
          {pending ? 'Saving…' : 'Save rules'}
        </Button>
      </div>
    </form>
  );
}
