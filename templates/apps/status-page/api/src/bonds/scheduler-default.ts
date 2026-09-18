/**
 * SchedulerDefault bond setup
 *
 * Wires @molecule/api-scheduler-default to @molecule/api-scheduler
 */

import { setProvider } from '@molecule/api-scheduler'
import { provider } from '@molecule/api-scheduler-default'

export function setupSchedulerDefault(): void {
  setProvider(provider)
}
