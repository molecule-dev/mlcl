/**
 * Server-side analytics bond — no-op provider for reference deployments.
 */

import type { AnalyticsProvider } from '@molecule/api-analytics'
import { setProvider } from '@molecule/api-analytics'

const noopAnalyticsProvider: AnalyticsProvider = {
  identify: async () => {},
  track: async () => {},
  page: async () => {},
}

export function setupAnalyticsNoop(): void {
  setProvider(noopAnalyticsProvider)
}
