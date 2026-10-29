import { createClient } from '@/lib/supabase/server';
import {
  listDepartments,
  listWorkLocations,
  listInspectionTypes,
  listShifts,
  listChallanTypes,
} from '@/lib/data/masters';
import { MapContainer } from '@/components/ui/MapContainer';
import { getFeatureFlags } from '@/lib/config/feature-flags';
import { MasterManager, type MasterRecord, type FieldSpec } from './MasterManager';

const DEPARTMENT_FIELDS: FieldSpec[] = [
  { key: 'code', label: 'Code', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
];

const GEOFENCE_FIELDS: FieldSpec[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'latitude', label: 'Latitude', type: 'number', step: 'any', required: true },
  { key: 'longitude', label: 'Longitude', type: 'number', step: 'any', required: true },
  { key: 'radius_m', label: 'Radius (m)', type: 'number', required: true },
];

const INSPECTION_TYPE_FIELDS: FieldSpec[] = [
  { key: 'code', label: 'Code', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'min_evidence', label: 'Min evidence', type: 'number' },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
];

const SHIFT_FIELDS: FieldSpec[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'start_time', label: 'Start (HH:MM)', required: true },
  { key: 'end_time', label: 'End (HH:MM)', required: true },
  { key: 'min_work_minutes', label: 'Min work (min)', type: 'number' },
];

const CHALLAN_TYPE_FIELDS: FieldSpec[] = [
  { key: 'code', label: 'Code', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'rule_section', label: 'Rule / section' },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
];

/**
 * Master-data management (Phase 4). Covers Departments (4.1) and Geo-fences on
 * work_locations (4.2) as representative masters; inspection types / shifts / challan
 * types reuse the same MasterManager + admin RPCs. Admin-gated server-side; soft-delete
 * via is_active (RFP 4.3). The (dashboard) layout + proxy require authentication.
 */
export default async function MastersPage() {
  const supabase = await createClient();

  let error: string | null = null;
  let departments: MasterRecord[] = [];
  let geofences: MasterRecord[] = [];
  let inspectionTypes: MasterRecord[] = [];
  let shifts: MasterRecord[] = [];
  let challanTypes: MasterRecord[] = [];
  let challanEnabled = false;

  try {
    const [depts, locs, types, shiftRows, flags] = await Promise.all([
      listDepartments(supabase),
      listWorkLocations(supabase),
      listInspectionTypes(supabase),
      listShifts(supabase),
      getFeatureFlags(),
    ]);
    departments = depts as unknown as MasterRecord[];
    geofences = locs as unknown as MasterRecord[];
    inspectionTypes = types as unknown as MasterRecord[];
    shifts = shiftRows as unknown as MasterRecord[];
    challanEnabled = flags.challanEnabled;
    if (challanEnabled) {
      challanTypes = (await listChallanTypes(supabase)) as unknown as MasterRecord[];
    }
  } catch (e) {
    error =
      e instanceof Error && /not authorized|permission/i.test(e.message)
        ? 'You do not have permission to manage master data.'
        : 'Could not load master data.';
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <>
          <MasterManager
            masterType="department"
            title="Departments"
            fields={DEPARTMENT_FIELDS}
            rows={departments}
          />

          <MasterManager
            masterType="inspection_type"
            title="Inspection Types"
            fields={INSPECTION_TYPE_FIELDS}
            rows={inspectionTypes}
          />

          <MasterManager
            masterType="shift"
            title="Shifts"
            fields={SHIFT_FIELDS}
            rows={shifts}
          />

          <div className="space-y-3">
            <MasterManager
              masterType="work_location"
              title="Geo-fences"
              fields={GEOFENCE_FIELDS}
              rows={geofences}
            />
            <MapContainer
              label="Geo-fence locations"
              height={280}
              points={geofences
                .filter((g) => g.is_active)
                .map((g) => ({
                  id: g.id,
                  lat: Number(g.latitude),
                  lon: Number(g.longitude),
                  label: `${String(g.name)} (${String(g.radius_m)} m)`,
                }))}
            />
          </div>

          {challanEnabled && (
            <MasterManager
              masterType="challan_type"
              title="Challan Types"
              fields={CHALLAN_TYPE_FIELDS}
              rows={challanTypes}
            />
          )}
        </>
      )}
    </div>
  );
}
