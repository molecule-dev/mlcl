/**
 * New-episode subscriber notifications.
 *
 * The publish flow notifies every subscriber of a show when a new episode goes
 * live. Each listener can disable this from Settings ("New episodes from
 * subscribed shows" → `notifyNewEpisode`), persisted in `user_preferences`. The
 * publish loop used to notify every subscriber unconditionally, so the stored
 * opt-out did nothing. These helpers gate the notification on that preference.
 *
 * @module
 */

import { create, findMany } from '@molecule/api-database'

/**
 * Whether a subscriber should receive a new-episode notification given their
 * stored preferences blob. Defaults to `true` (notify) — a subscriber is only
 * skipped when they explicitly set `notifyNewEpisode: false`.
 */
export function shouldNotifyNewEpisode(
  preferences: Record<string, unknown> | null | undefined,
): boolean {
  return preferences?.notifyNewEpisode !== false
}

/**
 * Create a `new_episode` notification for each subscriber of a show, skipping
 * subscribers who disabled new-episode notifications.
 */
export async function notifyNewEpisodeSubscribers(input: {
  showId: string
  episodeId: string
  title: unknown
}): Promise<void> {
  const subs = await findMany<Record<string, unknown>>('subscriptions', {
    where: [{ field: 'show_id', operator: '=', value: input.showId }],
  })
  for (const sub of subs) {
    const prefRows = await findMany<{ preferences: Record<string, unknown> }>('user_preferences', {
      where: [{ field: 'user_id', operator: '=', value: String(sub.user_id) }],
    })
    if (!shouldNotifyNewEpisode(prefRows[0]?.preferences)) continue
    await create('notifications', {
      user_id: sub.user_id,
      kind: 'new_episode',
      payload: {
        show_id: input.showId,
        episode_id: input.episodeId,
        title: input.title,
      },
      read_at: null,
      created_at: new Date(),
    })
  }
}
