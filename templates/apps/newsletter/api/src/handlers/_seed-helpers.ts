import { create } from '@molecule/api-database'

const HOUR_MS = 60 * 60 * 1000

/**
 * Seed-time delivery: write one sends row per subscriber id with
 * deterministic open/click stamps (index-based, so counts are identical on
 * every install and never flake a test) plus the matching issue_stats row.
 *
 * Live delivery (publish fan-out) lives in _deliver.ts — this variant exists
 * because the seed backdates sends around a past publish time instead of now,
 * and stamps opens/clicks that already happened, which the live path never
 * does.
 */
export async function deliverSendsForSeed(
  issueId: string,
  subscriberIds: string[],
  publishedAtMs: number,
): Promise<void> {
  let opened = 0
  let clicked = 0
  for (let idx = 0; idx < subscriberIds.length; idx++) {
    const subscriberId = subscriberIds[idx]
    // ~60% open; a deterministic subset of openers (~1 in 7) also clicks.
    const isOpened = idx % 5 < 3
    const isClicked = isOpened && idx % 7 === 3
    if (isOpened) opened++
    if (isClicked) clicked++
    await create('sends', {
      issue_id: issueId,
      subscriber_id: subscriberId,
      sent_at: new Date(publishedAtMs).toISOString(),
      opened_at: isOpened
        ? new Date(publishedAtMs + ((idx % 48) + 1) * HOUR_MS).toISOString()
        : null,
      clicked_at: isClicked
        ? new Date(publishedAtMs + ((idx % 48) + 2) * HOUR_MS).toISOString()
        : null,
    })
  }
  await create('issue_stats', {
    issue_id: issueId,
    delivered: subscriberIds.length,
    opened,
    clicked,
    updated_at: new Date(publishedAtMs).toISOString(),
  })
}
