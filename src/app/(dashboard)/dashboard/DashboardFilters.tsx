'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectOptions, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface DeptOption {
  id: string;
  name: string;
}

/**
 * Dashboard filter bar: department + date range. Submits via the URL so the server
 * page re-queries admin_dashboard_widgets with the new scope. Clearing resets to /dashboard.
 *
 * React resets a form after its action runs, which would snap the fields back to the
 * previous defaults. Keying the form on the applied filters remounts it with the new
 * values, so the chosen department and dates stay selected.
 */
export function DashboardFilters({
  departments,
  current,
}: {
  departments: DeptOption[];
  current: { department?: string; from?: string; to?: string };
}) {
  const router = useRouter();
  const deptItems = [
    { value: '', label: 'All departments' },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ];

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
    <Card className="bg-card">
      <CardContent>
        <form
          key={`${current.department ?? ''}|${current.from ?? ''}|${current.to ?? ''}`}
          action={apply}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="department">Department</Label>
            <Select name="department" items={deptItems} defaultValue={current.department ?? ''}>
              <SelectTrigger id="department" className="h-8 min-w-44" data-testid="dashboard-department">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectOptions items={deptItems} />
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              name="from"
              type="date"
              defaultValue={current.from ?? ''}
              className="w-40"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="to">To</Label>
            <Input id="to" name="to" type="date" defaultValue={current.to ?? ''} className="w-40" />
          </div>
          <Button type="submit" data-testid="dashboard-apply">
            Apply
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="ml-auto"
            onClick={() => router.push('/dashboard')}
          >
            Clear filters
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
