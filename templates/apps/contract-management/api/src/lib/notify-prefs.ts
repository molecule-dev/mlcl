/**
 * Notification-preference gating.
 *
 * A user's Settings → Notifications toggles are stored in
 * `users.oauthData.notificationPreferences` (`contractSent`, `contractSigned`,
 * `contractExpiring`, `weeklyDigest`). The notification-creation paths (send /
 * sign) previously created rows unconditionally, so turning a toggle off had no
 * effect. These helpers let those paths honor the owner's saved preference.
 *
 * Preferences are OPT-OUT: a missing user, missing prefs blob, or missing key
 * all mean "notify" — only an explicit `false` suppresses the notification.
 *
 * @module
 */
import { findById } from '@molecule/api-database'

/** The notification-preference keys stored in oauthData.notificationPreferences. */
export type NotificationPrefKey =
  'contractSent' | 'contractSigned' | 'contractExpiring' | 'weeklyDigest'

/**
 * Pure opt-out check against a user's `oauthData`. Returns `false` only when the
 * key is explicitly set to `false`; a missing prefs blob or missing key → `true`.
 */
export function notificationAllowed(oauthData: unknown, key: NotificationPrefKey): boolean {
  const prefs = (
    oauthData as { notificationPreferences?: Record<string, unknown> } | null | undefined
  )?.notificationPreferences
  return prefs?.[key] !== false
}

/**
 * Load the owner and apply {@link notificationAllowed}. A missing owner id or a
 * user row that can't be loaded defaults to `true` (notify) so a lookup failure
 * never silently drops notifications.
 */
export async function ownerWantsNotification(
  ownerId: string | null | undefined,
  key: NotificationPrefKey,
): Promise<boolean> {
  if (!ownerId) return true
  const user = await findById<{ oauthData?: unknown }>('users', String(ownerId))
  return notificationAllowed(user?.oauthData, key)
}
