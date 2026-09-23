/**
 * Demo seed for voting-polling.
 *
 * Per-user (`seedDemoForUser`) — a starter ballot, a couple of voters,
 * and a few notifications so a freshly signed-up user lands on
 * /dashboard, /voters and /notifications with content. Idempotent on
 * user_id (returns early if any poll already exists for the user).
 *
 * @module
 */

import { count, create, query } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

interface SeedResult {
  pollsCreated: number
  votesCreated: number
  votersCreated: number
  notificationsCreated: number
  questionsCreated: number
}

export async function seedDemoForUser(userId: string): Promise<SeedResult> {
  if (!userId) {
    return {
      pollsCreated: 0,
      votesCreated: 0,
      votersCreated: 0,
      notificationsCreated: 0,
      questionsCreated: 0,
    }
  }

  const result: SeedResult = {
    pollsCreated: 0,
    votesCreated: 0,
    votersCreated: 0,
    notificationsCreated: 0,
    questionsCreated: 0,
  }

  // Idempotent: skip if any poll already exists for this user.
  const existingPolls = await count('polls', [{ field: 'user_id', operator: '=', value: userId }])
  if (existingPolls === 0) {
    const charterPoll = await create<Record<string, unknown>>('polls', {
      user_id: userId,
      title: 'Adopt the revised 2026 charter?',
      description: 'A revised governance charter has been proposed by the Bylaws Committee.',
      type: 'single-choice',
      status: 'active',
      // jsonb columns must receive a stringified JSON value
      options: JSON.stringify(['Approve revised charter', 'Send back for amendments', 'Abstain']),
      start_date: new Date(Date.now() - 60 * 60 * 1000),
      end_date: new Date(Date.now() + 6 * 60 * 60 * 1000),
      allow_anonymous: false,
      max_votes_per_user: 1,
      quorum_threshold: 60,
      created_at: new Date(Date.now() - 90 * 60 * 1000),
      updated_at: new Date(Date.now() - 90 * 60 * 1000),
    })
    if (charterPoll.data) result.pollsCreated++

    const draftPoll = await create<Record<string, unknown>>('polls', {
      user_id: userId,
      title: 'Pulse: snack preferences for Friday standup',
      description: 'Lightweight pulse for the Friday standup.',
      type: 'multiple-choice',
      status: 'draft',
      options: JSON.stringify([
        'Coffee + croissants',
        'Bagels + cream cheese',
        'Donuts',
        'Fresh fruit',
      ]),
      allow_anonymous: true,
      max_votes_per_user: 4,
      quorum_threshold: null,
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000),
    })
    if (draftPoll.data) result.pollsCreated++

    const closedPoll = await create<Record<string, unknown>>('polls', {
      user_id: userId,
      title: 'Bylaws § 4.2 amendment — quorum threshold',
      description: 'Closed amendment vote on the quorum threshold.',
      type: 'single-choice',
      status: 'closed',
      options: JSON.stringify(['Adopt 60% threshold', 'Keep current 50% threshold']),
      start_date: new Date(Date.now() - 36 * 60 * 60 * 1000),
      end_date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      allow_anonymous: false,
      max_votes_per_user: 1,
      quorum_threshold: 60,
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    })
    if (closedPoll.data) result.pollsCreated++

    // Add a couple of demo votes to the active poll so /live + /analytics
    // immediately show non-empty tallies.
    const charterId = (charterPoll.data as Record<string, unknown> | null)?.id
    if (charterId) {
      for (let i = 0; i < 3; i++) {
        await create('votes', {
          poll_id: charterId,
          user_id: null,
          voter_id: `seed-voter-${i + 1}`,
          option_index: i === 2 ? 1 : 0,
          selected_options: null,
          ranked_choices: null,
          open_text: null,
          source: 'web',
          created_at: new Date(Date.now() - (60 - i * 15) * 60 * 1000),
        })
        result.votesCreated++
      }
    }

    // Demo audience question for the active poll's Q&A surface.
    if (charterId) {
      const q = await create<Record<string, unknown>>('audience_questions', {
        poll_id: charterId,
        user_id: null,
        asker_initial: 'A',
        body: 'How does the revised charter handle delegated proxies?',
        status: 'pending',
        asked_at: new Date(Date.now() - 30 * 60 * 1000),
        created_at: new Date(Date.now() - 30 * 60 * 1000),
      })
      if (q.data) result.questionsCreated++
    }
  }

  // Voters: only seed if none exist yet.
  const existingVoters = await count('voters', [{ field: 'user_id', operator: '=', value: userId }])
  if (existingVoters === 0) {
    const voters = [
      {
        name: 'A. Reyes',
        email: 'reyes@example.org',
        organization: 'Hartford Council',
        role: 'Chair',
      },
      {
        name: 'M. Okafor',
        email: 'okafor@example.org',
        organization: 'Finance Cmte',
        role: 'Treasurer',
      },
      {
        name: 'L. Hartwell',
        email: 'hartwell@example.org',
        organization: 'Bylaws Cmte',
        role: 'Member',
      },
      { name: 'S. Park', email: 'park@example.org', organization: 'Engineering', role: 'Member' },
    ]
    for (const v of voters) {
      await create('voters', {
        user_id: userId,
        name: v.name,
        email: v.email,
        organization: v.organization,
        role: v.role,
        created_at: new Date(),
      })
      result.votersCreated++
    }
  }

  // Notifications: only seed if none exist yet.
  const existingNotifs = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existingNotifs === 0) {
    const notifications = [
      {
        type: 'welcome',
        title: 'Welcome to Voting & Polling',
        body: 'Open a new ballot, add voters to the eligibility roll, or browse the active polls below.',
        href: '/dashboard',
      },
      {
        type: 'tip',
        title: 'Tip: live results sync to every device',
        body: 'Open a poll, hit Publish, then share the /vote/<id> link — votes land in /polls/<id>/live in real time.',
        href: '/polls/new',
      },
      {
        type: 'system',
        title: 'Audience Q&A is now live',
        body: 'A new audience question has come in on the active charter ballot. Promote, mark answered or hide.',
        href: '/dashboard',
      },
    ]
    for (const n of notifications) {
      await create('notifications', {
        user_id: userId,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
        read: false,
        created_at: new Date(),
      })
      result.notificationsCreated++
    }
  }

  // Workspace: ensure the user has a workspace row + self-membership so
  // the Team page renders something on first load.
  try {
    const ws = await query<{ id: string }>(
      `SELECT id FROM public.workspaces WHERE user_id = $1 LIMIT 1`,
      [userId],
    )
    if (ws.rows.length === 0) {
      await query(
        `INSERT INTO public.workspaces (id, user_id, name, slug, created_at)
         VALUES (gen_random_uuid(), $1, 'My organization', null, now())`,
        [userId],
      )
    }
  } catch (err) {
    logger.warn(err)
  }

  return result
}

/**
 * Convenience wrapper used by feature handlers (notifications, polls)
 * on first GET so a fresh signup lands on populated pages.
 *
 * Several handlers call this on their first GET, and a freshly signed-in
 * browser fires several of those GETs CONCURRENTLY (dashboard: /api/polls +
 * notifications; a test harness adds its own /api/polls read on top). The
 * count-then-create idempotency check inside seedDemoForUser is not atomic,
 * so two concurrent first calls both see zero polls and BOTH seed — the
 * dashboard briefly shows 6 starter ballots and card-count assertions race.
 * Memoize the in-flight seed per user so concurrent callers share one run;
 * after it settles the entry is cleared and the count checks keep later
 * (post-race) calls cheap.
 */
const inflightSeeds = new Map<string, Promise<void>>()

export async function seedDemoOnSignup(userId: string): Promise<void> {
  const inflight = inflightSeeds.get(userId)
  if (inflight) return inflight
  const seed = (async () => {
    try {
      await seedDemoForUser(userId)
    } catch (err) {
      logger.warn(err)
    } finally {
      inflightSeeds.delete(userId)
    }
  })()
  inflightSeeds.set(userId, seed)
  return seed
}
