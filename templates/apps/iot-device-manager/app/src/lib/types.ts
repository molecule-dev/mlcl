/**
 * Shared frontend types for the IoT device manager dashboard.
 *
 * Real data flows through useHttpClient → /api/reports/fleet etc.
 * No fixture/sample data — empty states render an explicit "no data"
 * affordance, not pretend rows.
 */

export interface FleetStats {
  devices_total: number
  devices_online: number
  devices_warning: number
  devices_critical: number
  devices_offline: number
  active_alerts: number
  messages_per_min: number
  firmware_pending: number
  uptime_pct?: number
  as_of?: string
}
