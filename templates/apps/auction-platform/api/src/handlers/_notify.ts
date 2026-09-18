/**
 * Notification-preference gate, shared by the bid + listing notification paths.
 *
 * @module
 */

import { findById } from '@molecule/api-database'

interface AppOauthData {
  ap?: {
    notifyPrefs?: Record<string, boolean>
  }
  [key: string]: unknown
}

/** Parse a user's oauthData, which the DB may hand back as a JSON string or an object. */
function readOauthData(raw: unknown): AppOauthData {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as AppOauthData
    } catch (_error) {
      // Malformed stored JSON is treated as "no OAuth data" rather than failing the notification.
      return {}
    }
  }
  if (typeof raw === 'object') return raw as AppOauthData
  return {}
}

/**
 * Whether the recipient wants a notification of the given type. Preferences live in
 * `users.oauthData.ap.notifyPrefs` (set by the Settings page), keyed by the notification type
 * (`outbid` / `won` / `sold` / …). The bid + listing fan-out used to notify unconditionally, so a
 * user who muted a type still got the in-app notification and (for outbid) the email. We notify
 * unless the matching toggle is explicitly `false`, so an unset preference keeps the prior
 * default-on behavior while an off toggle is now honored.
 */
export async function notificationEnabled(recipientId: string, type: string): Promise<boolean> {
  const user = await findById<{ oauthData?: unknown }>('users', recipientId)
  const prefs = readOauthData(user?.oauthData).ap?.notifyPrefs ?? {}
  return prefs[type] !== false
}
