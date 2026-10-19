'use client';

import { useRouter } from 'next/navigation';
import { FilterBar } from '@/components/ui/FilterBar';
import { Button, Field, Input, Select } from '@/components/ui/Form';

export interface DeptOption {
  id: string;
  name: string;
}

/**
 * Dashboard filter bar: department + date range. Submits via the URL so the server
 * page re-queries admin_dashboard_widgets with the new scope. Clearing resets to /dashboard.
 */
export function DashboardFilters({
  departments,
  current,
}: {
  departments: DeptOption[];
  current: { department?: string; from?: string; to?: string };
}) {
  const router = useRouter();

  function apply(formData: FormData) {
    const params = new URLSearchParams();
    const dept = String(formData.get('department') ?? '');
    const from = String(formData.get('from') ?? '');
    const to = String(formData.get('to') ?? '');
    if (dept) params.set('department', dept);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    router.push(`/dashboard${params.toString() ? `?${params}` : ''}`);
  }

  return (
    <form action={apply}>
      <FilterBar onClear={() => router.push('/dashboard')}>
        <Field label="Department" htmlFor="department">
          <Select id="department" name="department" defaultValue={current.department ?? ''}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="From" htmlFor="from">
          <Input id="from" name="from" type="date" defaultValue={current.from ?? ''} />
        </Field>
        <Field label="To" htmlFor="to">
          <Input id="to" name="to" type="date" defaultValue={current.to ?? ''} />
        </Field>
        <Button type="submit" data-testid="dashboard-apply">
          Apply
        </Button>
      </FilterBar>
    </form>
  );
}
