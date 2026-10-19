import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getFeatureFlags } from '@/lib/config/feature-flags';
import { listChallanTypes } from '@/lib/data/masters';
import { MasterManager, type MasterRecord, type FieldSpec } from '../masters/MasterManager';

const CHALLAN_TYPE_FIELDS: FieldSpec[] = [
  { key: 'code', label: 'Code', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'rule_section', label: 'Rule / section' },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
];

/**
 * M-Challan stub (Phase 11, optional/future). This screen is GATED behind the
 * app_settings.challan_enabled flag: when the flag is off it returns 404, so no challan
 * surface is reachable for any role. When enabled, it exposes challan-type master
 * management as the seam; the full challan workflow (creation/PDF/notification) is NOT
 * implemented and would be an AUDA change request.
 */
export default async function ChallanPage() {
  const flags = await getFeatureFlags();
  if (!flags.challanEnabled) notFound();

  const supabase = await createClient();
  let challanTypes: MasterRecord[] = [];
  try {
    challanTypes = (await listChallanTypes(supabase)) as unknown as MasterRecord[];
  } catch {
    // Fall through to an empty manager; the upsert RPC still enforces admin.
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">M-Challan</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Optional module (enabled). Manage challan types. The full challan workflow is a
          future scope item.
        </p>
      </div>

      <MasterManager
        masterType="challan_type"
        title="Challan Types"
        fields={CHALLAN_TYPE_FIELDS}
        rows={challanTypes}
      />
    </div>
  );
}
