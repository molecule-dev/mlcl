/**
 * Demo seed for email-client.
 *
 * Per-user starter content (idempotent on user_id):
 *   - 3 default labels: Work, Personal, Receipts
 *   - 5 inbox emails from common senders so the inbox renders with
 *     content on a fresh signup. Includes a starred + thread-root email
 *     so /starred and /thread/:id have something to show too.
 *
 * Called best-effort on the first GET /emails (and /labels, /folders,
 * /counts) so a freshly signed-up user always lands on a populated
 * mailbox without coupling seeding to the signup handler.
 *
 * @module
 */

import { count, create, findById } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

interface SeedEmail {
  from: string
  subject: string
  body: string
  folder: string
  is_read: boolean
  is_starred: boolean
  thread_id?: string | null
  attachments?: Array<{ name: string; size_label: string; url: string }>
  ageMs: number
}

const SEED_LABELS = [
  { name: 'Work', color: '#2563eb' },
  { name: 'Personal', color: '#10b981' },
  { name: 'Receipts', color: '#f59e0b' },
]

const SEED_EMAILS: SeedEmail[] = [
  {
    from: 'sarah.jenkins@example.com',
    subject: 'Q3 Roadmap Review — needs your sign-off by Thursday',
    body: "Hi there,\n\nI've finalised the Q3 roadmap deck and the metrics are in. Could you take a pass on slides 4-7 and let me know if anything looks off before the board read-out on Thursday?\n\nWe also need to align on the design system migration timeline — happy to grab 15 minutes whenever works.\n\nThanks,\nSarah",
    folder: 'inbox',
    is_read: false,
    is_starred: true,
    attachments: [
      { name: 'Q3_Roadmap_v2.pdf', size_label: '2.4 MB', url: '/files/Q3_Roadmap_v2.pdf' },
    ],
    ageMs: 1000 * 60 * 22,
  },
  {
    from: 'alex.rivera@example.com',
    subject: 'Design system updates: new shared components JSON',
    body: "Hey,\n\nThe new shared components JSON for the TopNavBar and SideNav patterns is ready for review. I've pinned the migration notes inside the doc so you can see exactly what to swap.\n\n— Alex",
    folder: 'inbox',
    is_read: false,
    is_starred: false,
    ageMs: 1000 * 60 * 60 * 26,
  },
  {
    from: 'noreply@github.com',
    subject: '[meridian-ui] Pull Request #42 merged',
    body: 'Pull request #42 was merged into main by @ariya.\n\nfeat: add bento grid layout to dashboard\n\nView the merged commit on GitHub.',
    folder: 'inbox',
    is_read: true,
    is_starred: false,
    ageMs: 1000 * 60 * 60 * 24 * 4,
  },
  {
    from: 'jamie.park@example.com',
    subject: 'Lunch next week?',
    body: "Hey! Wondering if you have time to grab lunch next week — Thursday or Friday work for me. I'll come to your side of town.\n\nJamie",
    folder: 'inbox',
    is_read: true,
    is_starred: false,
    ageMs: 1000 * 60 * 60 * 24 * 6,
  },
  {
    from: 'receipts@stripe.com',
    subject: 'Receipt for invoice 8842',
    body: 'Your payment of $24.00 USD was successfully processed.\n\nThis is your receipt for invoice 8842. No action is required.',
    folder: 'inbox',
    is_read: true,
    is_starred: false,
    ageMs: 1000 * 60 * 60 * 24 * 30,
  },
]

const SEED_DRAFT: SeedEmail = {
  from: '',
  subject: 'Re: Q4 Planning Review',
  body: "Hi Maya,\n\nThanks for the detailed breakdown of the Q4 initiatives. I've reviewed the numbers and have a few thoughts on the resource allocation for the Meridian project.",
  folder: 'drafts',
  is_read: true,
  is_starred: false,
  ageMs: 1000 * 60 * 60 * 2,
}

const SEED_SENT: SeedEmail = {
  from: '',
  subject: 'Welcome to Courier',
  body: "Hi,\n\nThis is a copy of the welcome message we sent ourselves so the Sent folder isn't empty out of the gate. Feel free to delete.",
  folder: 'sent',
  is_read: true,
  is_starred: false,
  ageMs: 1000 * 60 * 60 * 24 * 14,
}

/**
 * Seed starter labels + inbox + drafts + sent for a user. Idempotent: a
 * second call is a no-op once the user already has any rows in either
 * table. Returns counts so callers can log what they did.
 */
export async function seedDemoForUser(
  userId: string,
  userEmail?: string | null,
): Promise<{ labelsCreated: number; emailsCreated: number }> {
  if (!userId) return { labelsCreated: 0, emailsCreated: 0 }

  const existingEmails = await count('emails', [{ field: 'user_id', operator: '=', value: userId }])
  const existingLabels = await count('email_labels', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existingEmails > 0 && existingLabels > 0) {
    return { labelsCreated: 0, emailsCreated: 0 }
  }

  let resolvedEmail = userEmail
  if (!resolvedEmail) {
    try {
      const user = await findById<Record<string, unknown>>('users', userId)
      resolvedEmail = (user?.email as string | undefined) ?? null
    } catch (_error) {
      // user lookup failed — seed without a sender email
      resolvedEmail = null
    }
  }

  let labelsCreated = 0
  if (existingLabels === 0) {
    for (const label of SEED_LABELS) {
      try {
        await create('email_labels', {
          user_id: userId,
          name: label.name,
          color: label.color,
          created_at: new Date().toISOString(),
        })
        labelsCreated++
      } catch (err) {
        logger.warn(err)
      }
    }
  }

  let emailsCreated = 0
  if (existingEmails === 0) {
    const me = resolvedEmail || 'me@example.com'
    const now = Date.now()

    for (const seed of SEED_EMAILS) {
      try {
        await create('emails', {
          user_id: userId,
          from: seed.from,
          to: JSON.stringify([me]),
          cc: JSON.stringify([]),
          bcc: JSON.stringify([]),
          subject: seed.subject,
          body: seed.body,
          folder: seed.folder,
          is_read: seed.is_read,
          is_starred: seed.is_starred,
          attachments: JSON.stringify(seed.attachments ?? []),
          sent_at: new Date(now - seed.ageMs).toISOString(),
          read_at: seed.is_read ? new Date(now - seed.ageMs + 60_000).toISOString() : null,
          created_at: new Date(now - seed.ageMs).toISOString(),
        })
        emailsCreated++
      } catch (err) {
        logger.warn(err)
      }
    }

    try {
      await create('emails', {
        user_id: userId,
        from: me,
        to: JSON.stringify(['maya@example.com']),
        cc: JSON.stringify([]),
        bcc: JSON.stringify([]),
        subject: SEED_DRAFT.subject,
        body: SEED_DRAFT.body,
        folder: SEED_DRAFT.folder,
        is_read: SEED_DRAFT.is_read,
        is_starred: SEED_DRAFT.is_starred,
        attachments: JSON.stringify([]),
        created_at: new Date(now - SEED_DRAFT.ageMs).toISOString(),
      })
      emailsCreated++
    } catch (err) {
      logger.warn(err)
    }

    try {
      await create('emails', {
        user_id: userId,
        from: me,
        to: JSON.stringify([me]),
        cc: JSON.stringify([]),
        bcc: JSON.stringify([]),
        subject: SEED_SENT.subject,
        body: SEED_SENT.body,
        folder: SEED_SENT.folder,
        is_read: SEED_SENT.is_read,
        is_starred: SEED_SENT.is_starred,
        attachments: JSON.stringify([]),
        sent_at: new Date(now - SEED_SENT.ageMs).toISOString(),
        created_at: new Date(now - SEED_SENT.ageMs).toISOString(),
      })
      emailsCreated++
    } catch (err) {
      logger.warn(err)
    }
  }

  return { labelsCreated, emailsCreated }
}

/**
 * Best-effort wrapper called on the first GET that touches the mailbox.
 *
 * Uses an in-flight promise map so concurrent calls for the same user
 * (e.g. /api/labels + /api/emails + /api/emails/counts firing in parallel
 * from the sidebar + Inbox page on first paint) collapse to a single
 * seed pass instead of racing and inserting duplicate rows.
 *
 * Errors are swallowed so a failed seed doesn't break the read.
 */
const inFlight = new Map<string, Promise<void>>()

export async function ensureSeedForUser(userId: string, userEmail?: string | null): Promise<void> {
  if (!userId) return
  const pending = inFlight.get(userId)
  if (pending) {
    return pending
  }
  const promise = (async () => {
    try {
      await seedDemoForUser(userId, userEmail)
    } catch (err) {
      logger.warn(err)
    }
  })()
  inFlight.set(userId, promise)
  try {
    await promise
  } finally {
    inFlight.delete(userId)
  }
}
