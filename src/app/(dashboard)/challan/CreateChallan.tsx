'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button, Field, Input, Select } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { saveChallanAction } from './actions';
import type { ChallanTypeOption } from '@/lib/data/challans';

export interface DeptOption {
  id: string;
  name: string;
}

/** Create a new challan (draft). Opens the detail page on success. */
export function CreateChallan({
  challanTypes,
  departments,
}: {
  challanTypes: ChallanTypeOption[];
  departments: DeptOption[];
}) {
  const { show } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await saveChallanAction({ ok: false, error: null }, formData);
      if (res.ok && res.id) {
        show('Challan created (draft)', 'success');
        router.push(`/challan/${res.id}`);
      } else {
        show(res.error ?? 'Could not create challan', 'error');
      }
    });
  }

  if (!open) {
    return (
      <Button data-testid="new-challan" onClick={() => setOpen(true)}>
        New challan
      </Button>
    );
  }

  return (
    <form action={submit} data-testid="challan-form" className="grid max-w-2xl gap-3 rounded-lg border border-black/10 p-4 sm:grid-cols-2 dark:border-white/15">
      <Field label="Violation" htmlFor="violation" required>
        <Input id="violation" name="violation" required data-testid="challan-violation" />
      </Field>
      <Field label="Rule / section" htmlFor="rule_section">
        <Input id="rule_section" name="rule_section" />
      </Field>
      <Field label="Challan type" htmlFor="challan_type_id">
        <Select id="challan_type_id" name="challan_type_id" defaultValue="">
          <option value="">—</option>
          {challanTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Department" htmlFor="department_id">
        <Select id="department_id" name="department_id" defaultValue="">
          <option value="">—</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Offender name" htmlFor="offender_name">
        <Input id="offender_name" name="offender_name" />
      </Field>
      <Field label="Offender contact" htmlFor="offender_contact">
        <Input id="offender_contact" name="offender_contact" />
      </Field>
      <Field label="Location" htmlFor="location_name">
        <Input id="location_name" name="location_name" />
      </Field>
      <Field label="Amount (₹)" htmlFor="amount">
        <Input id="amount" name="amount" type="number" step="0.01" />
      </Field>
      <Field label="Latitude" htmlFor="latitude">
        <Input id="latitude" name="latitude" type="number" step="any" />
      </Field>
      <Field label="Longitude" htmlFor="longitude">
        <Input id="longitude" name="longitude" type="number" step="any" />
      </Field>
      <Field label="Reason / remarks" htmlFor="reason">
        <Input id="reason" name="reason" />
      </Field>
      <div className="flex items-end gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending} data-testid="challan-save">
          {pending ? 'Creating…' : 'Create draft'}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
