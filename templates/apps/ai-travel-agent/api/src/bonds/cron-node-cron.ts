/**
 * CronNodeCron bond setup
 *
 * Wires @molecule/api-cron-node-cron to @molecule/api-cron. The delay watcher
 * (`lib/delay-watch.ts`) registers its schedule with it at startup.
 */

import { setProvider } from '@molecule/api-cron'
import { provider } from '@molecule/api-cron-node-cron'

export function setupCronNodeCron(): void {
  setProvider(provider)
}
