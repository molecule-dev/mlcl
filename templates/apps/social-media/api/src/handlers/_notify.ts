/**
 * Notification-preference gate, shared by the like / comment / follow fan-out.
 *
 * @module
 */

import { findById } from '@molecule/api-database'

const PREF_KEY: Record<string, string> = {
  like: 'notifLikes',
  comment: 'notifComments',
  follow: 'notifFollows',
}

/**
 * Whether the recipient wants a notification of the given type. Preferences live in
 * `users.oauthData.socialPreferences` (set by the Settings page). The fan-out used to create
 * notifications unconditionally, so a recipient who muted a type still received them. We notify
 * unless the matching toggle is explicitly `false`, so an unset preference keeps the prior
 * default-on behavior while an off toggle is now honored.
 */
export async function notificationEnabled(recipientId: string, type: string): Promise<boolean> {
  const key = PREF_KEY[type]
  if (!key) return true
  const user = await findById<{
    oauthData?: { socialPreferences?: Record<string, unknown> } | null
  }>('users', recipientId)
  const prefs = user?.oauthData?.socialPreferences ?? {}
  return prefs[key] !== false
}
