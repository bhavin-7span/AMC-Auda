import { createClient } from '@/lib/supabase/server';
import { adminListUsers } from '@/lib/data/admin';
import { isAdminApiConfigured } from '@/lib/supabase/admin';
import { UsersTable, type DepartmentOption } from './UsersTable';
import { AddUserForm } from './AddUserForm';
import { BulkUploadPanel } from './BulkUploadPanel';

const PAGE_SIZE = 20;

/**
 * Users & roles administration (Phase 3). Lists users via admin_list_users and allows
 * inline role/department edits via admin_set_role. Admin-gated server-side (the RPCs
 * reject non-admins); the (dashboard) layout + proxy also require authentication.
 */
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(0, Number.parseInt(sp.page ?? '0', 10) || 0);
  const search = sp.q?.trim() || null;

  const supabase = await createClient();

  let errorMessage: string | null = null;
  let rows: Awaited<ReturnType<typeof adminListUsers>>['rows'] = [];
  let total = 0;
  let departments: DepartmentOption[] = [];

  try {
    const [usersResult, deptResult] = await Promise.all([
      adminListUsers(supabase, { page, pageSize: PAGE_SIZE, search }),
      supabase.from('departments').select('id, name').eq('is_active', true).order('sort_order'),
    ]);
    rows = usersResult.rows;
    total = usersResult.total;
    departments = (deptResult.data ?? []) as DepartmentOption[];
  } catch (e) {
    errorMessage =
      e instanceof Error && /not authorized/i.test(e.message)
        ? 'You do not have permission to manage users.'
        : 'Could not load users.';
  }

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <AddUserForm adminApiConfigured={isAdminApiConfigured()} />
            <BulkUploadPanel />
          </div>
          <UsersTable
            rows={rows}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            departments={departments}
          />
        </>
      )}
    </div>
  );
}
