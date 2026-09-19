/**
 * Demo seed for newsletter (Dispatch).
 *
 * Two layers:
 *
 * 1. **Globals** (`seedGlobalDemoIfEmpty`) — the publication's demo audience
 *    and archive: a publication_settings row, ~24 subscribers spread across
 *    the last 60 days (mix of statuses/tiers/sources), four published issues
 *    with per-issue sends + stats (deterministic opens/clicks so the
 *    dashboard charts render real, stable numbers), plus one draft and one
 *    scheduled issue. Idempotent on the `subscribers` table.
 *
 * 2. **Per-user** (`seedDemoForUser`) — a few owned issues (published w/
 *    delivery, draft, scheduled) so a freshly signed-up creator sees content
 *    on the Dashboard/Issues surfaces immediately. Idempotent on author_id.
 *
 * The seeded `sends` rows ARE the simulated delivery — no real email is ever
 * sent by this template (see _deliver.ts for the emails-bond integration
 * point). Opens/clicks are stamped deterministically (index-based) so counts
 * are stable across installs and test runs.
 *
 * @module
 */

import { count, create, findMany, updateById } from '@molecule/api-database'

import { deliverSendsForSeed } from './_seed-helpers.js'
import { makeSubscriberToken } from './subscribers.js'

/** Placeholder owner for archive issues that belong to the publication
 *  itself rather than any signed-up creator account. */
const PLACEHOLDER_OWNER_ID = '00000000-0000-0000-0000-000000000000'

export const APP_NAME_FALLBACK = 'Dispatch'
export const DEFAULT_FROM_NAME = 'The Editor'

const DAY_MS = 24 * 60 * 60 * 1000

function iso(msAgo: number): string {
  return new Date(Date.now() - msAgo).toISOString()
}

interface SubscriberSeed {
  email: string
  /** Days ago the subscriber joined. */
  joinedDaysAgo: number
  status: 'subscribed' | 'unsubscribed' | 'pending'
  tier: 'free' | 'paid'
  source: string
}

const SUBSCRIBERS: SubscriberSeed[] = [
  {
    email: 'maya.reads@example.com',
    joinedDaysAgo: 58,
    status: 'subscribed',
    tier: 'paid',
    source: 'landing',
  },
  {
    email: 'jonas.k@example.com',
    joinedDaysAgo: 56,
    status: 'subscribed',
    tier: 'free',
    source: 'landing',
  },
  {
    email: 'priya.writes@example.com',
    joinedDaysAgo: 54,
    status: 'subscribed',
    tier: 'paid',
    source: 'imported',
  },
  {
    email: 'tom.d@example.com',
    joinedDaysAgo: 51,
    status: 'subscribed',
    tier: 'free',
    source: 'landing',
  },
  {
    email: 'elena.v@example.com',
    joinedDaysAgo: 49,
    status: 'unsubscribed',
    tier: 'free',
    source: 'landing',
  },
  {
    email: 'dev.null@example.com',
    joinedDaysAgo: 47,
    status: 'subscribed',
    tier: 'free',
    source: 'imported',
  },
  {
    email: 'sam.or@example.com',
    joinedDaysAgo: 45,
    status: 'subscribed',
    tier: 'paid',
    source: 'manual',
  },
  {
    email: 'nadia.f@example.com',
    joinedDaysAgo: 42,
    status: 'subscribed',
    tier: 'free',
    source: 'landing',
  },
  {
    email: 'cal.band@example.com',
    joinedDaysAgo: 40,
    status: 'pending',
    tier: 'free',
    source: 'landing',
  },
  {
    email: 'iris.m@example.com',
    joinedDaysAgo: 38,
    status: 'subscribed',
    tier: 'free',
    source: 'landing',
  },
  {
    email: 'theo.g@example.com',
    joinedDaysAgo: 35,
    status: 'subscribed',
    tier: 'paid',
    source: 'landing',
  },
  {
    email: 'wren.a@example.com',
    joinedDaysAgo: 33,
    status: 'subscribed',
    tier: 'free',
    source: 'imported',
  },
  {
    email: 'hugo.s@example.com',
    joinedDaysAgo: 30,
    status: 'unsubscribed',
    tier: 'free',
    source: 'landing',
  },
  {
    email: 'lucy.q@example.com',
    joinedDaysAgo: 28,
    status: 'subscribed',
    tier: 'free',
    source: 'landing',
  },
  {
    email: 'omar.d@example.com',
    joinedDaysAgo: 26,
    status: 'subscribed',
    tier: 'free',
    source: 'landing',
  },
  {
    email: 'fte@example.com',
    joinedDaysAgo: 24,
    status: 'pending',
    tier: 'free',
    source: 'imported',
  },
  {
    email: 'bela.k@example.com',
    joinedDaysAgo: 21,
    status: 'subscribed',
    tier: 'paid',
    source: 'manual',
  },
  {
    email: 'ren.j@example.com',
    joinedDaysAgo: 19,
    status: 'subscribed',
    tier: 'free',
    source: 'landing',
  },
  {
    email: 'ana.p@example.com',
    joinedDaysAgo: 16,
    status: 'subscribed',
    tier: 'free',
    source: 'landing',
  },
  {
    email: 'ken.t@example.com',
    joinedDaysAgo: 14,
    status: 'subscribed',
    tier: 'free',
    source: 'landing',
  },
  {
    email: 'sora.n@example.com',
    joinedDaysAgo: 11,
    status: 'subscribed',
    tier: 'free',
    source: 'landing',
  },
  {
    email: 'mira.l@example.com',
    joinedDaysAgo: 8,
    status: 'subscribed',
    tier: 'free',
    source: 'imported',
  },
  {
    email: 'dan.r@example.com',
    joinedDaysAgo: 5,
    status: 'subscribed',
    tier: 'free',
    source: 'landing',
  },
  {
    email: 'zoe.h@example.com',
    joinedDaysAgo: 2,
    status: 'subscribed',
    tier: 'free',
    source: 'landing',
  },
]

interface IssueSeed {
  subject: string
  preview_text: string
  body_md: string
  /** Days ago the issue went out (published seeds only). */
  publishedDaysAgo?: number
  status: 'published' | 'draft' | 'scheduled'
  /** Days in the future a scheduled issue is due (scheduled seeds only). */
  scheduledInDays?: number
}

const BODY_SECTION = (topic: string, next: string): string => `Hello readers,

This week: ${topic}. Five links, one idea, and a question worth your commute.

## The idea

${topic} keeps coming up in every conversation we had with operators this month. The pattern is simple enough to state in a sentence, and hard enough to execute that most teams skip it.

## Links we loved

- A long read on ${topic} that finally made it click for us.
- A shorter one, funnier, that makes the same point in half the words.
- A tool we tried for a week and kept.
- A tool we tried for a week and dropped (and why).
- ${next}

## One question

Reply to this issue — yes, really — and tell us what ${topic} looks like from where you sit. The best reply makes it into next week's issue.

Until next week,
The editor`

const ARCHIVE_ISSUES: IssueSeed[] = [
  {
    subject: 'Issue #12 — The compounding newsletter',
    preview_text: 'Why the boring cadence wins, five links, and one question.',
    body_md: BODY_SECTION('compounding cadence', 'A counterintuitive take on publishing less'),
    status: 'published',
    publishedDaysAgo: 7,
  },
  {
    subject: 'Issue #11 — What readers actually open',
    preview_text: 'Subject lines, preview text, and the 40% you control.',
    body_md: BODY_SECTION('open rates', 'Our internal subject-line A/B spreadsheet'),
    status: 'published',
    publishedDaysAgo: 14,
  },
  {
    subject: 'Issue #10 — Growing past the first thousand',
    preview_text: 'Referral loops, swaps, and the channel nobody owns.',
    body_md: BODY_SECTION('the first thousand subscribers', 'A swap email template that worked'),
    status: 'published',
    publishedDaysAgo: 21,
  },
  {
    subject: 'Issue #09 — The tools issue',
    preview_text: 'Our entire publishing stack, priced honestly.',
    body_md: BODY_SECTION('the publishing stack', 'The one line item we regret'),
    status: 'published',
    publishedDaysAgo: 28,
  },
  {
    subject: 'Issue #13 — The pricing letter (draft)',
    preview_text: 'Thinking out loud about a paid tier.',
    body_md: BODY_SECTION('paid tiers', 'What other operators charge and why'),
    status: 'draft',
  },
  {
    subject: 'Issue #13 — The pricing letter',
    preview_text: 'What goes behind the paywall, and what stays free.',
    body_md: BODY_SECTION('what goes behind the paywall', 'A reader poll on pricing'),
    status: 'scheduled',
    scheduledInDays: 2,
  },
]

const PER_USER_ISSUES: IssueSeed[] = [
  {
    subject: 'Welcome to your publication',
    preview_text: 'A tour of the dashboard, the archive, and your first draft.',
    body_md: BODY_SECTION('getting started', 'The three numbers worth watching weekly'),
    status: 'published',
    publishedDaysAgo: 2,
  },
  {
    subject: 'Your first draft',
    preview_text: 'Edit this subject, write the body, then hit Publish.',
    body_md: BODY_SECTION('your first issue', 'A checklist before you press send'),
    status: 'draft',
  },
  {
    subject: 'Your first scheduled issue',
    preview_text: 'Scheduling writes the send-time; a promoter delivers it.',
    body_md: BODY_SECTION('scheduling', 'Why we promote lazily on read'),
    status: 'scheduled',
    scheduledInDays: 3,
  },
]

let _globalSeeded = false

/**
 * Seed the publication's demo audience + archive if the subscribers table is
 * empty. Idempotent — returns early on subsequent calls.
 */
export async function seedGlobalDemoIfEmpty(): Promise<{
  subscribersCreated: number
  issuesCreated: number
}> {
  if (_globalSeeded) return { subscribersCreated: 0, issuesCreated: 0 }
  const existing = await count('subscribers', [])
  if (existing > 0) {
    _globalSeeded = true
    return { subscribersCreated: 0, issuesCreated: 0 }
  }

  // Publication identity.
  const now = new Date().toISOString()
  await create('publication_settings', {
    publication_name: process.env.APP_NAME || APP_NAME_FALLBACK,
    from_name: DEFAULT_FROM_NAME,
    created_at: now,
    updated_at: now,
  })

  // Subscribers — token is derived from the generated id, so write the row
  // first, then stamp the token.
  const subscriberIds: Array<{ id: string; createdAtMs: number; status: string }> = []
  for (const s of SUBSCRIBERS) {
    const createdAt = iso(s.joinedDaysAgo * DAY_MS)
    const result = await create('subscribers', {
      email: s.email,
      status: s.status,
      tier: s.tier,
      source: s.source,
      token: 'pending',
      subscribed_at: s.status === 'subscribed' ? createdAt : null,
      created_at: createdAt,
      updated_at: createdAt,
    })
    const row = result.data as { id?: string } | null
    if (row?.id) {
      await updateById('subscribers', row.id, { token: makeSubscriberToken(row.id) })
      subscriberIds.push({
        id: row.id,
        createdAtMs: Date.now() - s.joinedDaysAgo * DAY_MS,
        status: s.status,
      })
    }
  }

  // Issues + their simulated delivery (sends + stats).
  let issuesCreated = 0
  for (const issue of ARCHIVE_ISSUES) {
    const created = await createIssueRow(issue, PLACEHOLDER_OWNER_ID)
    if (created?.id && issue.status === 'published' && issue.publishedDaysAgo != null) {
      const publishedAtMs = Date.now() - issue.publishedDaysAgo * DAY_MS
      await deliverSendsForSeed(
        created.id,
        subscriberIds
          .filter((s) => s.status === 'subscribed' && s.createdAtMs <= publishedAtMs)
          .map((s) => s.id),
        publishedAtMs,
      )
    }
    issuesCreated++
  }

  _globalSeeded = true
  return { subscribersCreated: subscriberIds.length, issuesCreated }
}

const seededAuthors = new Set<string>()

/**
 * Per-user demo: three owned issues (published w/ delivery, draft,
 * scheduled) so a freshly signed-up creator sees real surfaces immediately.
 * Idempotent per author.
 */
export async function seedDemoForUser(userId: string): Promise<{ issuesCreated: number }> {
  if (!userId) return { issuesCreated: 0 }
  if (seededAuthors.has(userId)) return { issuesCreated: 0 }
  seededAuthors.add(userId)

  try {
    const existing = await findMany<{ id: string }>('issues', {
      where: [{ field: 'author_id', operator: '=', value: userId }],
      limit: 1,
    })
    if (existing.length > 0) return { issuesCreated: 0 }

    // Every subscriber currently on the list "received" the seeded published
    // issue (the per-user seed publishes in the past relative to itself).
    const subscribers = (await findMany<{ id: string }>('subscribers', {
      where: [{ field: 'status', operator: '=', value: 'subscribed' }],
      limit: 100_000,
    })) as { id: string }[]

    let issuesCreated = 0
    for (const issue of PER_USER_ISSUES) {
      const created = await createIssueRow(issue, userId)
      if (created?.id && issue.status === 'published' && issue.publishedDaysAgo != null) {
        const publishedAtMs = Date.now() - issue.publishedDaysAgo * DAY_MS
        await deliverSendsForSeed(
          created.id,
          subscribers.map((s) => s.id),
          publishedAtMs,
        )
      }
      issuesCreated++
    }
    return { issuesCreated }
  } catch (err) {
    // Seeding is best-effort; never block the request.
    console.error('[newsletter seed] seedDemoForUser failed:', err)
    return { issuesCreated: 0 }
  }
}

async function createIssueRow(issue: IssueSeed, authorId: string): Promise<{ id?: string } | null> {
  const now = new Date().toISOString()
  const publishAt = issue.publishedDaysAgo != null ? iso(issue.publishedDaysAgo * DAY_MS) : null
  const scheduledAt =
    issue.status === 'scheduled' && issue.scheduledInDays != null
      ? new Date(Date.now() + issue.scheduledInDays * DAY_MS).toISOString()
      : null
  const result = await create('issues', {
    subject: issue.subject,
    preview_text: issue.preview_text,
    body_md: issue.body_md,
    status: issue.status,
    publish_at: publishAt,
    scheduled_at: scheduledAt,
    author_id: authorId,
    created_at: publishAt ?? now,
    updated_at: publishAt ?? now,
  })
  return result.data as { id?: string } | null
}
