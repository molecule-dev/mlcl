/**
 * Catalog seeding for the podcast flagship.
 *
 * Public read endpoints (`/api/shows`, `/api/episodes`, `/api/chapters`)
 * are useless against an empty schema — Discover/Library/Search render
 * empty grids and the player has nothing to play. To make a fresh
 * scaffold actually demoable AND make per-user `play`, `subscribe`,
 * `save`, `queue` invariants assertable, we seed:
 *
 *   1. A small global catalog of curated shows + episodes + chapters at
 *      server boot. Idempotent on stable string IDs (e.g. `show-edge-cases`,
 *      `episode-edge-cases-1`, `chapter-edge-cases-1-1`).
 *   2. A per-user demo dataset on first authenticated request: subscribes
 *      to two shows, saves one episode, pushes one item onto the queue,
 *      writes a "welcome" notification. Idempotent on user_id presence.
 *
 * Audio URLs point at SoundHelix sample MP3s (stable, public-domain
 * test audio served over HTTPS). Tests assert the player's `<audio>`
 * src actually loads bytes — see e2e/episodes__id.spec.ts.
 *
 * @module
 */

import { count, create, findMany } from '@molecule/api-database'

interface ShowSeed {
  id: string
  title: string
  description: string
  category:
    'news' | 'tech' | 'business' | 'comedy' | 'culture' | 'science' | 'health' | 'true_crime'
  language: string
  publisher: string
}

interface EpisodeSeed {
  id: string
  show_id: string
  title: string
  description: string
  audio_url: string
  duration_seconds: number
  episode_number: number
  chapters: Array<{ id: string; title: string; start_seconds: number }>
  transcript: string
}

const SHOWS: ShowSeed[] = [
  {
    id: '00000000-0000-4000-a000-000000000001',
    title: 'Edge Cases',
    publisher: 'Cortex Media',
    category: 'tech',
    language: 'en',
    description:
      'Production engineers tell the war stories nobody else will. Distributed systems, time, and the bugs that ate a weekend.',
  },
  {
    id: '00000000-0000-4000-a000-000000000002',
    title: 'After the Print',
    publisher: 'Newsroom Lab',
    category: 'news',
    language: 'en',
    description:
      'Reporters debrief after the front page is set — what got cut, what surprised them, what comes next.',
  },
  {
    id: '00000000-0000-4000-a000-000000000003',
    title: 'Numbers Going Up',
    publisher: 'Wedge Capital',
    category: 'business',
    language: 'en',
    description:
      'Founder interviews with the unfiltered version. Pricing, payroll, the months that almost killed the company.',
  },
  {
    id: '00000000-0000-4000-a000-000000000004',
    title: 'Off the Cuff',
    publisher: 'Two Mics Studio',
    category: 'comedy',
    language: 'en',
    description:
      "Stand-ups in conversation. Tour stories, road food, and the bit they couldn't make work in front of a real audience.",
  },
  {
    id: '00000000-0000-4000-a000-000000000005',
    title: 'Found in Translation',
    publisher: 'Sea Salt Audio',
    category: 'culture',
    language: 'en',
    description:
      'A literary travel show. We read a book, fly to where it was set, and broadcast from a café there.',
  },
  {
    id: '00000000-0000-4000-a000-000000000006',
    title: 'Half Lives',
    publisher: 'Polyphase',
    category: 'science',
    language: 'en',
    description:
      'Working scientists explain what they actually did this week. No metaphors that fall apart in the second paragraph.',
  },
  {
    id: '00000000-0000-4000-a000-000000000007',
    title: 'The Long Walk',
    publisher: 'Quiet Hours Media',
    category: 'health',
    language: 'en',
    description:
      'Conversations at walking pace. Sleep, recovery, the boring habits that compound — interviewed honestly.',
  },
  {
    id: '00000000-0000-4000-a000-000000000008',
    title: 'Cold Files',
    publisher: 'Marginalia Audio',
    category: 'true_crime',
    language: 'en',
    description:
      'Unresolved cases reopened by reporters who actually knock on the door. Slow, patient, and never speculative.',
  },
]

const SAMPLE_AUDIO = (n: number): string =>
  `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`

/**
 * Stable seed UUIDs: 8-4-4-4-12 hex with the last 12 chars encoding
 * (showIdx, episodeIdx, chapterIdx). Valid v4 layout (3rd group starts
 * with `4`) so the database accepts them as proper UUIDs and same
 * (showIdx, ep, ch) triple always yields the same UUID — making the
 * seed safely idempotent across boots.
 */
function episodeId(showIdx: number, episodeIdx: number): string {
  const s = (showIdx + 1).toString(16).padStart(2, '0')
  const e = episodeIdx.toString(16).padStart(2, '0')
  return `00000000-0000-4000-b001-${s}${e}00000000`
}

function chapterId(showIdx: number, episodeIdx: number, chapterIdx: number): string {
  const s = (showIdx + 1).toString(16).padStart(2, '0')
  const e = episodeIdx.toString(16).padStart(2, '0')
  const c = chapterIdx.toString(16).padStart(2, '0')
  return `00000000-0000-4000-c001-${s}${e}${c}000000`
}

function makeEpisodes(): EpisodeSeed[] {
  const episodes: EpisodeSeed[] = []
  let audioIdx = 1
  for (const [showIdx, show] of SHOWS.entries()) {
    for (let n = 1; n <= 4; n++) {
      const epId = episodeId(showIdx, n)
      // Different episode lengths feel real.
      const durations = [1860, 2410, 3220, 2780]
      const duration = durations[(showIdx + n) % durations.length] ?? 2400
      const audioUrl = SAMPLE_AUDIO(((audioIdx++ - 1) % 16) + 1)
      const titles = [
        [
          'When clock skew broke our payment processor',
          'The 502 that came from a third-party CDN',
          "CAP we didn't know we had",
          'Replaying production traffic safely',
        ],
        [
          "What the front page didn't say",
          'Behind the metro investigation',
          "Sources we couldn't name",
          "A reporter's last call",
        ],
        [
          'Pricing the second product',
          "Layoffs we didn't announce",
          'How we got to ARR-positive',
          'When the seed round fell through',
        ],
        [
          'The bit I cut three times',
          'Touring through the Midwest',
          'A weekend at the Comedy Cellar',
          'Material from real life',
        ],
        [
          'Reading Borges in Buenos Aires',
          'Tokyo, after Murakami',
          'The Lisbon of Pessoa',
          'New Orleans, between books',
        ],
        [
          'What CRISPR did this week',
          'Quantum noise, plain English',
          'The drug discovery pipeline',
          'Why the JWST blew us away',
        ],
        [
          'Sleep without the optimization talk',
          'Walking as recovery',
          'Strength after 40',
          'A doctor on stress',
        ],
        [
          'The man on the bridge',
          "The witness who wouldn't",
          'Cold case file: Astoria, OR',
          'Twelve years, one phone tip',
        ],
      ]
      const showTitleSet = titles[showIdx] ?? titles[0]!
      const title = showTitleSet[n - 1] ?? `Episode ${n}`
      episodes.push({
        id: epId,
        show_id: show.id,
        title,
        description: `${title} — ${show.title} explores this story end to end. Long-form interview, transcript, chapter markers.`,
        audio_url: audioUrl,
        duration_seconds: duration,
        episode_number: n,
        transcript:
          `[00:00] Welcome to ${show.title}. I'm your host. ` +
          `In this episode, ${title.toLowerCase()}. ` +
          `[02:30] Let's set the scene. ` +
          `[10:00] Here's where it gets interesting. ` +
          `[20:00] What happened next surprised everyone. ` +
          `[30:00] We'll come back to this in a future episode. ` +
          `[35:00] Thanks for listening — please subscribe to ${show.title}.`,
        chapters: [
          { id: chapterId(showIdx, n, 1), title: 'Cold open', start_seconds: 0 },
          { id: chapterId(showIdx, n, 2), title: 'Setup', start_seconds: 150 },
          { id: chapterId(showIdx, n, 3), title: 'Main story', start_seconds: 600 },
          {
            id: chapterId(showIdx, n, 4),
            title: 'Outro',
            start_seconds: Math.max(120, duration - 90),
          },
        ],
      })
    }
  }
  return episodes
}

const EPISODES: EpisodeSeed[] = makeEpisodes()

let cachedSeedPromise: Promise<void> | null = null

/**
 * Seed the global catalog (shows → episodes → chapters) if it hasn't
 * been seeded already. Idempotent. Safe to call multiple times — only
 * the first call does work; subsequent calls reuse the cached promise.
 */
export async function seedCatalogOnce(): Promise<void> {
  if (cachedSeedPromise) return cachedSeedPromise
  cachedSeedPromise = doSeedCatalog().catch((error) => {
    cachedSeedPromise = null
    throw error
  })
  return cachedSeedPromise
}

async function doSeedCatalog(): Promise<void> {
  // Cheap idempotency: if any catalog show already exists, assume seeded.
  const existing = await count('shows', [{ field: 'id', operator: '=', value: SHOWS[0]!.id }])
  if (existing > 0) return

  const now = new Date()
  for (const show of SHOWS) {
    await create('shows', {
      id: show.id,
      title: show.title,
      description: show.description,
      category: show.category,
      language: show.language,
      author_id: null,
      user_id: null,
      cover_image_url: null,
      episode_count: 4,
      subscriber_count: 0,
      is_explicit: false,
      created_at: now,
      updated_at: now,
    })
  }
  // Episodes are inserted in published order so the most recent appears
  // first in `?recent=true` queries; we walk SHOWS in reverse and within
  // each show insert ep 4 → ep 1 so that ep 1 is the freshest entry.
  for (const ep of EPISODES) {
    const publishedAt = new Date(now.getTime() - (10 - ep.episode_number) * 24 * 60 * 60 * 1000)
    await create('episodes', {
      id: ep.id,
      show_id: ep.show_id,
      user_id: null,
      title: ep.title,
      description: ep.description,
      episode_number: ep.episode_number,
      season_number: 1,
      audio_url: ep.audio_url,
      duration_seconds: ep.duration_seconds,
      status: 'published',
      transcript: ep.transcript,
      show_notes: null,
      summary: null,
      play_count: 0,
      published_at: publishedAt,
      created_at: now,
      updated_at: now,
    })
    for (const c of ep.chapters) {
      await create('chapters', {
        id: c.id,
        episode_id: ep.id,
        user_id: null,
        title: c.title,
        start_seconds: c.start_seconds,
        created_at: now,
      })
    }
  }
}

/**
 * Per-user demo seed. Invoked on first authenticated request so a fresh
 * signup lands on a populated Library + a useful Notifications inbox.
 * Idempotent on (user_id) presence in subscriptions / saved_episodes /
 * queue_items / notifications.
 */
export async function seedDemoForUser(userId: string): Promise<void> {
  if (!userId) return
  await seedCatalogOnce()

  const subs = await count('subscriptions', [{ field: 'user_id', operator: '=', value: userId }])
  if (subs > 0) return

  const now = new Date()
  // Subscribe to first two shows so Library has content immediately.
  await create('subscriptions', {
    user_id: userId,
    show_id: SHOWS[0]!.id,
    created_at: now,
  })
  await create('subscriptions', {
    user_id: userId,
    show_id: SHOWS[5]!.id,
    created_at: now,
  })

  // Save one episode (Library → Saved tab).
  await create('saved_episodes', {
    user_id: userId,
    episode_id: EPISODES[0]!.id,
    saved_at: now,
  })

  // Push one episode onto the queue (Queue page).
  const existingQueue = await findMany<Record<string, unknown>>('queue_items', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })
  if (existingQueue.length === 0) {
    await create('queue_items', {
      user_id: userId,
      episode_id: EPISODES[1]!.id,
      position: 0,
      added_at: now,
    })
  }

  // Welcome + new-episode notification (Notifications page).
  const existingNotif = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existingNotif === 0) {
    await create('notifications', {
      user_id: userId,
      kind: 'welcome',
      payload: {
        message:
          'Welcome to Wavelength — we subscribed you to a few shows so Discover has something to play.',
      },
      read_at: null,
      created_at: now,
    })
    await create('notifications', {
      user_id: userId,
      kind: 'new_episode',
      payload: {
        show_id: SHOWS[0]!.id,
        episode_id: EPISODES[0]!.id,
        title: EPISODES[0]!.title,
      },
      read_at: null,
      created_at: now,
    })
  }
}

/**
 * Per-user seed promise cache so concurrent authed requests for the
 * same user de-dupe to a single seed run. Each subsequent caller waits
 * on the same promise — critical because the very next request after
 * signup is usually the listener UI loading /library, which expects the
 * subscription rows the seed inserts. Without the await, the GET races
 * the seed and renders an empty page.
 *
 * The cache is process-local — a server restart re-checks the DB once
 * per user, which is acceptable.
 */
const seedPromises = new Map<string, Promise<void>>()

export async function seedDemoForUserOnce(userId: string): Promise<void> {
  if (!userId) return
  let p = seedPromises.get(userId)
  if (!p) {
    p = seedDemoForUser(userId).catch((error) => {
      seedPromises.delete(userId)
      throw error
    })
    seedPromises.set(userId, p)
  }
  return p
}
