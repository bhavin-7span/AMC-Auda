'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { saveChallanAction } from './actions';
import type { ChallanTypeOption } from '@/lib/data/challans';

export interface DeptOption {
  id: string;
  name: string;
}

const TEXT_FIELDS: { name: string; label: string; type?: string; step?: string }[] = [
  { name: 'offender_name', label: 'Offender name' },
  { name: 'offender_contact', label: 'Offender contact' },
  { name: 'location_name', label: 'Location' },
  { name: 'amount', label: 'Amount (₹)', type: 'number', step: '0.01' },
  { name: 'latitude', label: 'Latitude', type: 'number', step: 'any' },
  { name: 'longitude', label: 'Longitude', type: 'number', step: 'any' },
];

/** "New challan" button opening a create-draft dialog. Opens the detail page on success. */
export function CreateChallan({
  challanTypes,
  departments,
}: {
  challanTypes: ChallanTypeOption[];
  departments: DeptOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [ruleSection, setRuleSection] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const typeItems = [{ value: '', label: '—' }, ...challanTypes.map((t) => ({ value: t.id, label: t.name }))];
  const deptItems = [{ value: '', label: '—' }, ...departments.map((d) => ({ value: d.id, label: d.name }))];

  // Picking a challan type pre-fills its configured rule/section and department.
  function selectType(typeId: string) {
    const type = challanTypes.find((t) => t.id === typeId);
    if (!type) return;
    if (type.rule_section) setRuleSection(type.rule_section);
    if (type.department_id) setDepartmentId(type.department_id);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await saveChallanAction({ ok: false, error: null }, formData);
      if (res.ok && res.id) {
        toast.success('Challan created (draft)');
        setOpen(false);
        router.push(`/challan?challan=${res.id}`, { scroll: false });
      } else {
        toast.error(res.error ?? 'Could not create challan');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" data-testid="new-challan" />}>
        <Plus /> New challan
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <form action={submit} data-testid="challan-form" className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New challan</DialogTitle>
            <DialogDescription>Creates a draft. Issue it from the challan page.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="violation">
                Violation <span className="text-destructive">*</span>
              </FieldLabel>
              <Input id="violation" name="violation" required className="h-9" data-testid="challan-violation" />
            </Field>
            <Field>
              <FieldLabel htmlFor="rule_section">Rule / section</FieldLabel>
              <Input
                id="rule_section"
                name="rule_section"
                className="h-9"
                value={ruleSection}
                onChange={(e) => setRuleSection(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="challan_type_id">Challan type</FieldLabel>
              <Select
                name="challan_type_id"
                items={typeItems}
                defaultValue=""
                onValueChange={(v) => selectType(v == null ? '' : String(v))}
              >
                <SelectTrigger id="challan_type_id" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {typeItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="department_id">Department</FieldLabel>
              <Select
                name="department_id"
                items={deptItems}
                value={departmentId}
                onValueChange={(v) => setDepartmentId(v == null ? '' : String(v))}
              >
                <SelectTrigger id="department_id" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {deptItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {TEXT_FIELDS.map((f) => (
              <Field key={f.name}>
                <FieldLabel htmlFor={f.name}>{f.label}</FieldLabel>
                <Input id={f.name} name={f.name} type={f.type} step={f.step} className="h-9" />
              </Field>
            ))}
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="reason">Reason / remarks</FieldLabel>
              <Input id="reason" name="reason" className="h-9" />
            </Field>
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} data-testid="challan-save">
              {pending ? 'Creating…' : 'Create draft'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
