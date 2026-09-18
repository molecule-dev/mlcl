/**
 * MonitoringDefault bond setup
 *
 * Wires @molecule/api-monitoring-default to @molecule/api-monitoring
 */

import { setProvider } from '@molecule/api-monitoring'
import { provider } from '@molecule/api-monitoring-default'

export function setupMonitoringDefault(): void {
  setProvider(provider)
}
