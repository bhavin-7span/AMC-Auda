import { createClient } from '@/lib/supabase/server';

/**
 * Feature flags from the app_settings singleton.
 *
 * Optional/future modules (M-Challan now; CRM later) are gated behind these flags so
 * they can be enabled by configuration without a redeploy, and stay fully hidden when
 * off. `app_settings` is readable by any authenticated user; flipping a flag is an admin
 * operation done via the masters/config layer (not here).
 */
export interface FeatureFlags {
  challanEnabled: boolean;
  routeTrackingEnabled: boolean;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('app_settings')
      .select('challan_enabled, route_tracking_enabled')
      .eq('id', 1)
      .maybeSingle();
    return {
      challanEnabled: Boolean(data?.challan_enabled),
      routeTrackingEnabled: Boolean(data?.route_tracking_enabled),
    };
  } catch {
    // Fail closed: if we cannot read the flags, treat optional modules as disabled.
    return { challanEnabled: false, routeTrackingEnabled: false };
  }
}
