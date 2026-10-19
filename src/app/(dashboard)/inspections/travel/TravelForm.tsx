'use client';

import { useRouter } from 'next/navigation';
import { FilterBar } from '@/components/ui/FilterBar';
import { Button, Field, Input, Select } from '@/components/ui/Form';
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

  function apply(formData: FormData) {
    const params = new URLSearchParams();
    const user = String(formData.get('user') ?? '');
    const date = String(formData.get('date') ?? '');
    if (user) params.set('user', user);
    if (date) params.set('date', date);
    router.push(`/inspections/travel${params.toString() ? `?${params}` : ''}`);
  }

  return (
    <form action={apply}>
      <FilterBar onClear={() => router.push('/inspections/travel')}>
        <Field label="Staff" htmlFor="user">
          <Select id="user" name="user" defaultValue={current.user ?? ''} data-testid="travel-user">
            <option value="">Select staff…</option>
            {staff.map((s) => (
              <option key={s.user_id} value={s.user_id}>
                {s.full_name} ({s.employee_id})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" htmlFor="date">
          <Input id="date" name="date" type="date" defaultValue={current.date ?? ''} />
        </Field>
        <Button type="submit" data-testid="travel-apply">
          View route
        </Button>
      </FilterBar>
    </form>
  );
}
