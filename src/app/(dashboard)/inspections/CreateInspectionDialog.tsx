'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useCallback, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { BellRing, ChevronRight, MapPin, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAssignableStaff } from '@/lib/data/inspections';
import { MapContainer } from '@/components/ui/MapContainer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { createInspectionAction } from './actions';

interface Option {
  value: string;
  label: string;
}

const PRIORITIES: Option[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const STEPS = ['Inspection details', 'Assignment'] as const;

interface Draft {
  typeId: string;
  departmentId: string;
  priority: string;
  siteAddress: string;
  latitude: number | null;
  longitude: number | null;
  instructions: string;
  assignee: string;
  date: string;
  time: string;
}

const EMPTY: Draft = {
  typeId: '',
  departmentId: '',
  priority: 'medium',
  siteAddress: '',
  latitude: null,
  longitude: null,
  instructions: '',
  assignee: '',
  date: '',
  time: '',
};

/** Single-select bound to draft state, rendered with shadcn Select. */
function OptionSelect({
  id,
  value,
  options,
  placeholder,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  options: Option[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select items={options} value={value || null} onValueChange={(v) => onChange(v ?? '')} disabled={disabled}>
      <SelectTrigger id={id} className="w-full" data-testid={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Two-step "Create inspection" dialog: inspection details (type, zone, priority, site and
 * instructions), then assignment (officer and schedule). Masters load when the dialog
 * opens; on success the new inspection opens.
 */
export function CreateInspectionDialog({ triggerLabel = 'New inspection' }: { triggerLabel?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [types, setTypes] = useState<Option[]>([]);
  const [zones, setZones] = useState<Option[]>([]);
  const [officers, setOfficers] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startSaving] = useTransition();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setError(null);
    setDraft((d) => ({ ...d, [key]: value }));
  };

  // Stable references: the map only redraws when the marked site actually moves.
  const sitePoints = useMemo(
    () =>
      draft.latitude != null && draft.longitude != null
        ? [{ id: 'site', lat: draft.latitude, lon: draft.longitude, label: 'Site' }]
        : [],
    [draft.latitude, draft.longitude],
  );
  const pickSite = useCallback((lat: number, lon: number) => {
    setError(null);
    setDraft((d) => ({ ...d, latitude: lat, longitude: lon }));
  }, []);

  function loadMasters() {
    setLoading(true);
    const supabase = createClient();
    void Promise.all([supabase.rpc('get_inspection_masters'), getAssignableStaff(supabase).catch(() => [])]).then(
      ([masters, staff]) => {
        const m = (masters.data ?? {}) as {
          types?: { id: string; name: string; is_active?: boolean }[];
          departments?: { id: string; name: string; is_active?: boolean }[];
        };
        startTransition(() => {
          setTypes((m.types ?? []).filter((t) => t.is_active !== false).map((t) => ({ value: t.id, label: t.name })));
          setZones(
            (m.departments ?? []).filter((d) => d.is_active !== false).map((d) => ({ value: d.id, label: d.name })),
          );
          setOfficers(
            staff.map((s) => ({ value: s.user_id, label: s.employee_id ? `${s.full_name} (${s.employee_id})` : s.full_name })),
          );
          setLoading(false);
        });
      },
    );
  }

  function onOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (next) {
      setStep(0);
      setDraft(EMPTY);
      setError(null);
      loadMasters();
    }
  }

  function next() {
    if (!draft.typeId || !draft.departmentId || !draft.priority) return setError('Choose an inspection type, zone and priority.');
    if (!draft.siteAddress.trim()) return setError('Enter the site address.');
    if (draft.latitude == null) return setError('Click the map to mark the site location.');
    setError(null);
    setStep(1);
  }

  function submit() {
    if (!draft.assignee) return setError('Choose a field officer.');
    if (!draft.date) return setError('Choose a scheduled date.');
    setError(null);
    startSaving(async () => {
      const res = await createInspectionAction(draft);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const officer = officers.find((o) => o.value === draft.assignee)?.label;
      toast.success(`Inspection ${res.refNo ?? ''} created${officer ? ` and assigned to ${officer}` : ''}`.replace('  ', ' '));
      if (res.warning) toast.warning(res.warning);
      setOpen(false);
      router.push(`/inspections?inspection=${res.id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button size="lg" data-testid="create-inspection" />}>
        <Plus /> {triggerLabel}
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-xl"
        data-testid="create-inspection-dialog"
      >
        <DialogHeader className="px-6 pt-5 pb-4">
          <p className="text-[0.6875rem] font-bold tracking-widest text-info uppercase">
            Step {step + 1} of {STEPS.length}
          </p>
          <DialogTitle className="text-xl font-normal text-primary">Create inspection</DialogTitle>
          <DialogDescription className="sr-only">
            Enter the inspection details, then assign it to a field officer.
          </DialogDescription>
        </DialogHeader>
        <Separator />

        <ol className="flex items-center justify-center gap-3 px-6 py-4 text-xs">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden className="h-px w-16 bg-border sm:w-24" />}
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                    i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {i + 1}
                </span>
                <span className={i <= step ? 'font-semibold text-primary' : 'text-muted-foreground'}>{label}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="px-6 pb-6">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <Spinner />
            </div>
          ) : step === 0 ? (
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="ci-type">Inspection type *</FieldLabel>
                <OptionSelect
                  id="ci-type"
                  value={draft.typeId}
                  options={types}
                  placeholder="Select inspection type"
                  onChange={(v) => set('typeId', v)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="ci-zone">Zone *</FieldLabel>
                  <OptionSelect
                    id="ci-zone"
                    value={draft.departmentId}
                    options={zones}
                    placeholder="Select zone"
                    onChange={(v) => set('departmentId', v)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ci-priority">Priority *</FieldLabel>
                  <OptionSelect
                    id="ci-priority"
                    value={draft.priority}
                    options={PRIORITIES}
                    placeholder="Select priority"
                    onChange={(v) => set('priority', v)}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="ci-address">Site address *</FieldLabel>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="ci-address"
                    data-testid="ci-address"
                    className="pl-9"
                    placeholder="Enter site address"
                    value={draft.siteAddress}
                    onChange={(e) => set('siteAddress', e.target.value)}
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel>Site location *</FieldLabel>
                <MapContainer
                  label="Site location picker"
                  height={190}
                  points={sitePoints}
                  onPick={pickSite}
                />
                <FieldDescription data-testid="ci-coords">
                  {draft.latitude != null && draft.longitude != null
                    ? `Marked at ${draft.latitude.toFixed(5)}, ${draft.longitude.toFixed(5)}. Click again to move it.`
                    : 'Click the map to mark the site.'}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="ci-instructions">Instructions</FieldLabel>
                <Textarea
                  id="ci-instructions"
                  rows={3}
                  placeholder="Add field instructions and scope…"
                  value={draft.instructions}
                  onChange={(e) => set('instructions', e.target.value)}
                />
                <FieldDescription>Posted as the first comment for the officer.</FieldDescription>
              </Field>
            </FieldGroup>
          ) : (
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="ci-officer">Assign to officer *</FieldLabel>
                <OptionSelect
                  id="ci-officer"
                  value={draft.assignee}
                  options={officers}
                  placeholder="Select field officer"
                  onChange={(v) => set('assignee', v)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="ci-date">Scheduled date *</FieldLabel>
                  <Input
                    id="ci-date"
                    data-testid="ci-date"
                    type="date"
                    value={draft.date}
                    onChange={(e) => set('date', e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ci-time">Due time</FieldLabel>
                  <Input
                    id="ci-time"
                    type="time"
                    value={draft.time}
                    onChange={(e) => set('time', e.target.value)}
                  />
                  <FieldDescription>Defaults to 10:00 IST.</FieldDescription>
                </Field>
              </div>
              <Alert className="border-0 bg-info-soft text-info">
                <BellRing />
                <AlertTitle>Assignment notification</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  The selected officer receives the inspection on the mobile app.
                </AlertDescription>
              </Alert>
            </FieldGroup>
          )}

          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive" data-testid="ci-error">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="m-0 rounded-none bg-transparent px-6 py-4">
          {step === 0 ? (
            <>
              <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button size="lg" onClick={next} disabled={loading} data-testid="ci-continue">
                Continue <ChevronRight />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="lg" onClick={() => setStep(0)} disabled={pending}>
                Back
              </Button>
              <Button size="lg" onClick={submit} disabled={pending} data-testid="ci-submit">
                {pending ? 'Creating…' : 'Create inspection'} <ChevronRight />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
