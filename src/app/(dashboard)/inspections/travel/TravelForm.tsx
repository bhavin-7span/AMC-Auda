'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectOptions, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AssignableStaff } from '@/lib/data/inspections';

/**
 * Travel-report query form: pick a staff member + date. Submits via the URL so the
 * server page fetches the route (admin_travel_report, gated on route_tracking_enabled).
 */
export function TravelForm({
  staff,
  current,
}: {
  staff: AssignableStaff[];
  current: { user?: string; date?: string };
}) {
  const router = useRouter();
  const staffItems = staff.map((s) => ({ value: s.user_id, label: `${s.full_name} (${s.employee_id})` }));

  function apply(formData: FormData) {
    const params = new URLSearchParams();
    const user = String(formData.get('user') ?? '');
    const date = String(formData.get('date') ?? '');
    if (user) params.set('user', user);
    if (date) params.set('date', date);
    router.push(`/inspections/travel${params.toString() ? `?${params}` : ''}`);
  }

  return (
    <Card data-testid="filter-bar">
      <CardContent>
        {/* Keyed on the applied filters: React resets the form after the action, so remount with the new defaults. */}
        <form key={JSON.stringify(current)} action={apply} className="flex flex-wrap items-end gap-3">
          <Field className="w-72">
            <FieldLabel htmlFor="user">Staff</FieldLabel>
            <Select name="user" items={staffItems} defaultValue={current.user ?? null}>
              <SelectTrigger id="user" className="h-9 w-full" data-testid="travel-user">
                <SelectValue placeholder="Select staff…" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectOptions items={staffItems} />
              </SelectContent>
            </Select>
          </Field>
          <Field className="w-44">
            <FieldLabel htmlFor="date">Date</FieldLabel>
            <Input id="date" name="date" type="date" className="h-9" defaultValue={current.date ?? ''} />
          </Field>
          <Button type="submit" size="lg" data-testid="travel-apply">
            View route
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="ml-auto"
            data-testid="filter-clear"
            onClick={() => router.push('/inspections/travel')}
          >
            Clear filters
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
