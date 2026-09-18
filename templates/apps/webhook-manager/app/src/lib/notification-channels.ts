import { APP_NAME } from '../branding.js'

export interface ChannelOption {
  id: string
  defaultLabel: string
  description: string
  icon: string
  defaultEnabled: boolean
}

export const CHANNEL_DEFS: ChannelOption[] = [
  {
    id: 'email',
    defaultLabel: 'Email digest',
    description: 'Daily delivery summary + critical alerts to operations@your-org.',
    icon: 'mail',
    defaultEnabled: true,
  },
  {
    id: 'slack',
    defaultLabel: `Slack · #${APP_NAME.toLowerCase()}-alerts`,
    description: 'Real-time critical & warning notifications.',
    icon: 'forum',
    defaultEnabled: true,
  },
  {
    id: 'webhook',
    defaultLabel: 'Outbound webhook',
    description: 'POSTs notifications to your configured forwarding URL.',
    icon: 'cloud_sync',
    defaultEnabled: false,
  },
  {
    id: 'pagerduty',
    defaultLabel: 'PagerDuty',
    description: 'Pages on-call rotation when an endpoint auto-pauses.',
    icon: 'crisis_alert',
    defaultEnabled: true,
  },
]

/**
 * Coerce a JSONB value (which the API may hand back as either a parsed object
 * or a raw JSON string) into a plain object, falling back to `{}`.
 */
export const parseObj = <T>(raw: unknown): T => {
  if (!raw) return {} as T
  if (typeof raw === 'object' && raw !== null) return raw as T
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw)
      return (typeof v === 'object' && v !== null ? v : {}) as T
    } catch (_error) {
      // invalid JSON — return empty object as fallback
      return {} as T
    }
  }
  return {} as T
}

/**
 * Merge the user's saved per-channel notification toggles over the channel
 * defaults. `save()` writes the toggles into `preferences.notification_channels`,
 * so they MUST be read back from that same key. An earlier version read a
 * separate top-level `notification_prefs` column that nothing ever wrote — so
 * every saved toggle silently reverted to its default on reload. An explicitly
 * stored `false` is preserved (only a genuinely absent channel falls to its
 * default).
 */
export function resolveChannelPrefs(preferences: unknown): Record<string, boolean> {
  const prefs = parseObj<Record<string, unknown>>(preferences)
  const stored = parseObj<Record<string, boolean>>(prefs.notification_channels)
  const merged: Record<string, boolean> = {}
  for (const c of CHANNEL_DEFS) {
    merged[c.id] = stored[c.id] ?? c.defaultEnabled
  }
  return merged
}
