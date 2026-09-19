import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

interface IssueRow {
  id: string
  subject?: string | null
  status?: string | null
  publish_at?: string | null
}

interface SubscriberRow {
  id: string
  email?: string | null
}

interface SendRow {
  id: string
  issue_id: string
  subscriber_id: string
  opened_at?: string | null
  clicked_at?: string | null
}

/**
 * Issue delivery — the simulated "send" behind every publish.
 *
 * HONESTY NOTE (integration point): this template does NOT send real email.
 * "Delivering" an issue means writing one `sends` row per subscribed
 * subscriber — the per-subscriber delivery log the Subscribers/IssueDetail
 * surfaces and the open/click trackers read. To make a scaffolded project
 * send real mail, plug an emails bond in here (@molecule/api-emails with a
 * provider such as @molecule/api-emails-mailgun, already wired in
 * `bonds/emails-mailgun.ts` for the user-auth transactional mails):
 *
 *   import { send } from '@molecule/api-emails'
 *   await send({ to: subscriber.email, subject: issue.subject, ... })
 *
 * and keep the sends-row write as the delivery record either way. The demo
 * open/click mechanism (tokened public issue URLs) is likewise simulated —
 * see the track endpoints in issues.ts.
 */

/**
 * Write one `sends` row per currently-subscribed subscriber for the given
 * issue and refresh its `issue_stats` aggregates. Idempotent: subscribers
 * who already have a sends row for the issue are skipped, so re-publishing
 * (or a scheduled promotion racing a manual publish) never double-delivers.
 * Returns the number of NEW sends rows created.
 */
export async function deliverIssueToSubscribers(issueId: string): Promise<number> {
  const issue = await findById<IssueRow>('issues', issueId)
  if (!issue || issue.status !== 'published') {
    // Only published issues deliver. The caller (publish route, scheduled
    // promoter) sets status before delivering, so this is a guard, not a
    // expected branch.
    return 0
  }
  const sentAt = new Date().toISOString()

  const subscribers = (await findMany<SubscriberRow>('subscribers', {
    where: [{ field: 'status', operator: '=', value: 'subscribed' }],
    limit: 100_000,
  })) as SubscriberRow[]

  let createdSends = 0
  for (const subscriber of subscribers) {
    // UNIQUE (issue_id, subscriber_id) makes this idempotent; the pre-check
    // keeps the happy path from relying on constraint-violation handling.
    const existing = await findMany<{ id: string }>('sends', {
      where: [
        { field: 'issue_id', operator: '=', value: issueId },
        { field: 'subscriber_id', operator: '=', value: subscriber.id },
      ],
      limit: 1,
    })
    if (existing.length > 0) continue
    await create('sends', {
      issue_id: issueId,
      subscriber_id: subscriber.id,
      sent_at: sentAt,
      opened_at: null,
      clicked_at: null,
    })
    createdSends++
  }

  await refreshIssueStats(issueId)
  return createdSends
}

/**
 * Recompute an issue's `issue_stats` row from its sends rows (the source of
 * truth) — delivered = sends rows, opened/clicked = non-null opened_at /
 * clicked_at. Creates the row on first delivery.
 */
export async function refreshIssueStats(issueId: string): Promise<void> {
  const [delivered, opened, clicked] = await Promise.all([
    count('sends', [{ field: 'issue_id', operator: '=', value: issueId }]),
    count('sends', [
      { field: 'issue_id', operator: '=', value: issueId },
      { field: 'opened_at', operator: '!=', value: null },
    ]),
    count('sends', [
      { field: 'issue_id', operator: '=', value: issueId },
      { field: 'clicked_at', operator: '!=', value: null },
    ]),
  ])
  const existing = await findMany<{ id: string }>('issue_stats', {
    where: [{ field: 'issue_id', operator: '=', value: issueId }],
    limit: 1,
  })
  const now = new Date().toISOString()
  if (existing.length > 0) {
    await updateById('issue_stats', existing[0].id, {
      delivered,
      opened,
      clicked,
      updated_at: now,
    })
  } else {
    await create('issue_stats', {
      issue_id: issueId,
      delivered,
      opened,
      clicked,
      updated_at: now,
    })
  }
}

/**
 * Record an open for a (issue, subscriber) pair — the demo open-tracking
 * mechanism: the public issue page carries a subscriber token in its URL and
 * pings the track endpoint, which stamps `sends.opened_at` (first time only)
 * and refreshes the aggregate. Best-effort and silent: unknown tokens or
 * subscribers added after the issue went out are ignored, never an error.
 */
export async function recordOpen(issueId: string, subscriberId: string): Promise<void> {
  await recordSendEvent(issueId, subscriberId, 'open')
}

/**
 * Record a click the same way (stamps `sends.clicked_at`, first time only).
 * In this template the click a subscriber can actually make is the
 * unsubscribe link on the tokened public issue page — that click is recorded
 * as the issue's click before the status flips.
 */
export async function recordClick(issueId: string, subscriberId: string): Promise<void> {
  await recordSendEvent(issueId, subscriberId, 'click')
}

async function recordSendEvent(
  issueId: string,
  subscriberId: string,
  kind: 'open' | 'click',
): Promise<void> {
  try {
    const rows = (await findMany<SendRow>('sends', {
      where: [
        { field: 'issue_id', operator: '=', value: issueId },
        { field: 'subscriber_id', operator: '=', value: subscriberId },
      ],
      limit: 1,
    })) as SendRow[]
    const send = rows[0]
    if (!send) return
    const column = kind === 'open' ? 'opened_at' : 'clicked_at'
    const alreadySet = kind === 'open' ? Boolean(send.opened_at) : Boolean(send.clicked_at)
    if (alreadySet) {
      // Idempotent — a refresh of the public issue page must not inflate stats.
      return
    }
    await updateById('sends', send.id, { [column]: new Date().toISOString() })
    await refreshIssueStats(issueId)
  } catch (error) {
    logger.warn(`recordSendEvent (${kind}) failed; stats may lag`, { error })
  }
}

/**
 * Publish an issue now (or at its scheduled time) and deliver it. Sets
 * status/publish_at, then fans out sends. Used by both the manual publish
 * route and the lazy scheduled promoter so the two paths can never diverge.
 */
export async function publishIssue(
  issueId: string,
  publishAtIso: string,
): Promise<IssueRow | null> {
  const result = await updateById('issues', issueId, {
    status: 'published',
    publish_at: publishAtIso,
    updated_at: publishAtIso,
  })
  const issue = result.data as IssueRow | null
  await deliverIssueToSubscribers(issueId)
  return issue
}
