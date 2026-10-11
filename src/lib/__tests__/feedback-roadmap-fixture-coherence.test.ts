/**
 * The `feedback-roadmap` template ships TWO kinds of fixture that must agree
 * with each other:
 *
 * - `api/fixtures/seed/*.json` — the rows the seed loader writes into the
 *   database at boot (`_seed.ts`), referencing one another by 1-based INDEX
 *   (`votes[].post` → `posts[post - 1]`).
 * - `api/fixtures/reports.json` — the RESPONSE bodies the mock API server
 *   serves for the read-only endpoints (`admin/stats`, `boards/by-slug/:slug`,
 *   …), i.e. what the API would compute FROM those seeded rows
 *   (`api/src/handlers/admin.ts`, `boards.ts`).
 *
 * The demo therefore shows a dashboard card and a chart sourced from two files
 * that describe the same data. When they disagree the preview contradicts
 * itself — the audit that added this test found the vote chart summing to 74
 * under a "Total votes: 58" stat, impossible for a per-week breakdown of the
 * same 58 votes.
 *
 * The expectations below model the HANDLERS, not the fixtures: `admin/stats`
 * reads `feedback_posts` with `merged_into_id is_null` (a merged duplicate is
 * hidden everywhere else in the app) and builds `top_open` from
 * `status === 'open'` sorted by `vote_count`. Asserting the fixtures against
 * `seedPosts` directly — every seeded row, merged ones included, whatever
 * their status — is how the dashboard ended up claiming 17 posts and "9 open"
 * against a seed that holds 16 live posts and 8 open ones, with three of its
 * five "Top Open Requests" rows already planned, in progress or shipped.
 *
 * Cross-fixture REFERENCES are checked separately, against the seed loader's
 * own rules (`_seed.ts`) rather than the handlers': a vote/comment `post` index
 * or a post `board` slug the loader cannot resolve throws at boot, an
 * out-of-range `author`/`voter` user index seeds a row owned by nobody, and an
 * unresolvable `merged_into` writes a blank moved-note — none of which the
 * counts here can see, because they resolve a row's post through the same
 * lookup the loader does.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const FIXTURES = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'templates',
  'apps',
  'feedback-roadmap',
  'api',
  'fixtures',
)

const read = <T>(...rel: string[]): T =>
  JSON.parse(readFileSync(join(FIXTURES, ...rel), 'utf-8')) as T

interface PostFixture {
  id: string
  board: string
  /** 1-based index into `seed/users.json` — `_seed.ts` writes `users[author - 1]`. */
  author: number
  title: string
  status: string
  /** Age in days — `_seed.ts` writes `created_at = daysAgo(days_ago)`. */
  days_ago: number
  /** Age in days of the ship — `_seed.ts` writes `shipped_at = daysAgo(…)`. */
  shipped_days_ago?: number
  /** Set on a post a seeded admin merge folded into another one. */
  merged_into?: string
}
interface VoteFixture {
  /** 1-based index into `seed/posts.json` — `_seed.ts` writes `postIds[post - 1]`. */
  post: number
  /** 1-based index into `seed/users.json` — `_seed.ts` writes `users[voter - 1]`. */
  voter: number
  /** Age in days — `_seed.ts` writes `created_at = daysAgo(days_ago)`. */
  days_ago: number
}
interface CommentFixture {
  /** 1-based index into `seed/posts.json` — `_seed.ts` writes `postIds[post - 1]`. */
  post: number
  /** 1-based index into `seed/users.json` — `_seed.ts` writes `users[author - 1]`. */
  author: number
}
interface BoardFixture {
  slug: string
}
interface UserFixture {
  user_id: string
}
interface ReportBody {
  total_posts: number
  total_votes: number
  counts_by_status: Record<string, number>
  votes_over_time: Array<{ label: string; count: number }>
  top_open: Array<{ id: string; title: string; vote_count: number; comment_count: number }>
  recent_shipped: Array<{ id: string; vote_count: number }>
}

const seedUsers = read<UserFixture[]>('seed', 'users.json')
const seedBoards = read<BoardFixture[]>('seed', 'boards.json')
const seedPosts = read<PostFixture[]>('seed', 'posts.json')
const seedVotes = read<VoteFixture[]>('seed', 'votes.json')
const seedComments = read<CommentFixture[]>('seed', 'comments.json')
const reports = read<Record<string, ReportBody & { post_count?: number }>>('reports.json')

/**
 * The rows whose `key` is not a 1-based index into `count` rows — the shape
 * `_seed.ts` reads EVERY cross-fixture reference in (`postIds[v.post - 1]`,
 * `users[v.voter - 1]`).
 *
 * A reference the loader cannot resolve is not a cosmetic problem: an
 * out-of-range `post` index THROWS at boot ("seed: vote references unknown post
 * index N", so the template never seeds), and an out-of-range user index seeds
 * the row with `author_id: undefined` — a row owned by nobody. Both are exactly
 * what the counts below must not be able to ignore.
 *
 * @param rows - The fixture rows to check.
 * @param key - The 1-based-index field to check.
 * @param count - How many rows the index may address.
 * @returns The offending rows, in fixture order.
 */
function outOfRange(
  rows: Array<Record<string, unknown>>,
  key: string,
  count: number,
): Array<Record<string, unknown>> {
  return rows.filter((row) => {
    const index = row[key]
    return !(typeof index === 'number' && Number.isInteger(index) && index >= 1 && index <= count)
  })
}

/**
 * Votes/comments per SEED POST ID — the 1-based index is how the fixtures reference posts.
 *
 * A row whose index resolves to no post THROWS instead of being dropped: the
 * dropped shape answered "this row references nothing", which is the one input
 * every assertion in this file is blind to (`total_votes` counts
 * `seedVotes.length` regardless, and both sides of every per-post comparison
 * come back through this same helper). `_seed.ts` throws on the same row.
 */
function countsByPostId(rows: Array<{ post: number }>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const id = seedPosts[row.post - 1]?.id
    if (!id) throw new Error(`fixture references unknown post index ${row.post}`)
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

const votesByPost = countsByPostId(seedVotes)
const commentsByPost = countsByPostId(seedComments)
const voteCount = (post: PostFixture): number => votesByPost.get(post.id) ?? 0
const commentCount = (post: PostFixture): number => commentsByPost.get(post.id) ?? 0

/**
 * The rows `admin/stats` actually reads: `feedback_posts` with
 * `merged_into_id is_null`, ordered `created_at desc` (i.e. `days_ago` asc).
 * A merged duplicate is excluded from every count on the dashboard.
 */
const livePosts = seedPosts
  .filter((post) => !post.merged_into)
  .slice()
  .sort((a, b) => a.days_ago - b.days_ago)

/**
 * `admin.ts`'s `top_open`: the live posts still `open`, by `vote_count` desc,
 * first five. `Array.prototype.sort` is stable, so posts with equal votes keep
 * the newest-first order of the read above.
 */
const expectedTopOpen = livePosts
  .filter((post) => post.status === 'open')
  .slice()
  .sort((a, b) => voteCount(b) - voteCount(a))
  .slice(0, 5)

/**
 * `admin.ts`'s `recent_shipped`: status `shipped`, `shipped_at` desc, five. (No
 * merged filter here — the handler's own query has none.)
 */
const expectedRecentShipped = seedPosts
  .filter((post) => post.status === 'shipped')
  .slice()
  .sort((a, b) => (a.shipped_days_ago ?? 0) - (b.shipped_days_ago ?? 0))
  .slice(0, 5)

describe('feedback-roadmap fixtures — the seed rows and the served reports agree', () => {
  it('the vote chart totals exactly the votes the report card says exist', () => {
    const stats = reports['admin/stats']!
    const charted = stats.votes_over_time.reduce((sum, bucket) => sum + bucket.count, 0)
    // A per-week breakdown of the same votes: every bucket is a disjoint slice
    // of those rows, so the sum must be EXACTLY the total (`<=` alone was
    // subsumed — an equality check is strictly stronger, so the weaker line
    // could never be the failing one).
    expect(charted).toBe(stats.total_votes)
    // …and that total is the seeded votes themselves, not just an internally
    // consistent number.
    expect(stats.total_votes).toBe(seedVotes.length)
  })

  it('votes_over_time is the seed’s votes bucketed the way admin.ts buckets them', () => {
    // Summing to the total (above) leaves the CHART SHAPE unchecked: a
    // reports.json whose W1..W8 distribution drifted from the seed's
    // `days_ago` spread passed while showing a chart that contradicts the
    // seeded data — the exact self-contradiction class this file exists for.
    // admin.ts buckets each vote's `created_at` (= now − days_ago days) into
    // eight weekly buckets ending with the current week: bucket i holds votes
    // aged [(7−i)·7, (8−i)·7) days.
    const stats = reports['admin/stats']!
    const expected = Array.from({ length: 8 }, (_unused, i) => {
      const minAge = (7 - i) * 7
      const maxAge = (8 - i) * 7
      return seedVotes.filter((v) => v.days_ago >= minAge && v.days_ago < maxAge).length
    })
    expect(stats.votes_over_time.map((bucket) => bucket.count)).toEqual(expected)
  })

  it('total_posts and counts_by_status describe the seeded posts the dashboard reads', () => {
    const stats = reports['admin/stats']!
    // The handler counts only the posts the app still shows (merged duplicates
    // are hidden), so the fixture must not count the merged one either.
    expect(stats.total_posts).toBe(livePosts.length)
    const perStatus: Record<string, number> = {}
    for (const post of livePosts) perStatus[post.status] = (perStatus[post.status] ?? 0) + 1
    expect(stats.counts_by_status).toEqual(perStatus)
  })

  it('each board report counts the seeded posts on that board', () => {
    for (const [key, body] of Object.entries(reports)) {
      if (!key.startsWith('boards/by-slug/')) continue
      const slug = key.slice('boards/by-slug/'.length)
      // `boards.ts`'s `withPostCount` counts every `feedback_posts` row on the
      // board — it applies no merged filter — so all seeded posts count here.
      const expected = seedPosts.filter((p) => p.board === slug).length
      // The seeded posts must reference a board the report set covers.
      expect(expected, `no seeded post on board ${slug}`).toBeGreaterThan(0)
      expect(body.post_count, `post_count for board ${slug}`).toBe(expected)
    }
  })

  it('every board a seeded post references has a report — the demo never renders a dead board', () => {
    // The loop over `reports` above walks report → seed; this is the other
    // direction: a seeded post whose board has no `boards/by-slug/` report
    // renders a board page the mock API cannot answer, and no report-side
    // check ever noticed.
    const slugs = new Set(
      Object.keys(reports)
        .filter((key) => key.startsWith('boards/by-slug/'))
        .map((key) => key.slice('boards/by-slug/'.length)),
    )
    for (const post of seedPosts) {
      expect(
        slugs.has(post.board),
        `seeded post ${post.id} references board "${post.board}", which the report set does not cover`,
      ).toBe(true)
    }
  })

  it('top_open is the seeded OPEN posts by vote weight — not the whole fleet', () => {
    const stats = reports['admin/stats']!
    const rows = stats.top_open
    // Every row must be a live, still-open request: the card is labelled "Top
    // Open Requests", and a planned / in-progress / shipped post in it reads as
    // demand that is already triaged.
    for (const row of rows) {
      const post = seedPosts.find((p) => p.id === row.id)
      expect(post, `top_open row ${row.id} is not a seeded post`).toBeDefined()
      expect(post?.merged_into, `top_open row ${row.id} is a merged duplicate`).toBeUndefined()
      expect(post?.status, `top_open row ${row.id} is not open`).toBe('open')
    }
    expect(rows.map((row) => row.id)).toEqual(expectedTopOpen.map((post) => post.id))
    expect(rows.map((row) => row.title)).toEqual(expectedTopOpen.map((post) => post.title))
    expect(rows.map((row) => row.vote_count)).toEqual(expectedTopOpen.map(voteCount))
    expect(rows.map((row) => row.comment_count)).toEqual(expectedTopOpen.map(commentCount))
  })

  it('recent_shipped lists the seeded ships, newest first, with the real vote counts', () => {
    const stats = reports['admin/stats']!
    expect(stats.recent_shipped.map((row) => row.id)).toEqual(
      expectedRecentShipped.map((post) => post.id),
    )
    for (const row of stats.recent_shipped) {
      expect(votesByPost.get(row.id) ?? 0, `votes for ${row.id}`).toBe(row.vote_count)
    }
  })
})

describe('feedback-roadmap fixtures — every cross-fixture reference resolves', () => {
  it('every vote and comment points at a seeded post index the seed loader can resolve', () => {
    // `_seed.ts` reads `postIds[row.post - 1]` and THROWS when it resolves to
    // nothing ("seed: vote references unknown post index N") — the template then
    // never seeds at boot. The per-post counts used to DROP such a row, so a
    // dangling index passed every assertion in this file.
    expect(outOfRange(seedVotes, 'post', seedPosts.length)).toEqual([])
    expect(outOfRange(seedComments, 'post', seedPosts.length)).toEqual([])
  })

  it('every author and voter points at a seeded user index', () => {
    // `_seed.ts` reads `users[row.author - 1]?.user_id` — optional-chained, so an
    // out-of-range index does NOT throw: it seeds the row with
    // `author_id: undefined`, a row owned by nobody that the demo then renders.
    expect(outOfRange(seedPosts, 'author', seedUsers.length)).toEqual([])
    expect(outOfRange(seedVotes, 'voter', seedUsers.length)).toEqual([])
    expect(outOfRange(seedComments, 'author', seedUsers.length)).toEqual([])
  })

  it('every post names a board the boards fixture declares — the loader throws otherwise', () => {
    // `_seed.ts`: `if (!boardId) throw new Error('seed: unknown board slug …')`.
    // This is the SEED fixture set, not the report keys the sibling test walks.
    const slugs = new Set(seedBoards.map((board) => board.slug))
    expect(seedBoards.length).toBeGreaterThan(0)
    for (const post of seedPosts) {
      expect(
        slugs.has(post.board),
        `seeded post ${post.id} references board "${post.board}", which seed/boards.json does not declare`,
      ).toBe(true)
    }
  })

  it('every merged_into names a post that exists — the loader writes a blank moved-note otherwise', () => {
    // `_seed.ts` resolves the note as `posts.find((t) => t.id === p.merged_into)?.title ?? ''`
    // and the merge path stamps `Merged into "<title>"`: an unresolvable target
    // ships a merged duplicate whose note names nothing, and no assertion here
    // would have seen it (the row is filtered out of every dashboard count).
    const ids = new Set(seedPosts.map((post) => post.id))
    const merged = seedPosts.filter((post) => post.merged_into !== undefined)
    expect(merged.length, 'the seed must carry the merged-duplicate case').toBeGreaterThan(0)
    for (const post of merged) {
      expect(
        ids.has(post.merged_into as string),
        `seeded post ${post.id} merges into "${post.merged_into}", which is not a seeded post`,
      ).toBe(true)
    }
  })

  it('the reference check can fail — a dangling index is reported, never dropped', () => {
    // Non-vacuousness for the three tests above: the same helper must flag a
    // row whose index addresses nothing, and the count must refuse it rather
    // than answering "no votes on that post".
    const dangling = { post: seedPosts.length + 1 }
    expect(outOfRange([dangling], 'post', seedPosts.length)).toEqual([dangling])
    expect(outOfRange([{ post: 0 }], 'post', seedPosts.length)).toEqual([{ post: 0 }])
    expect(outOfRange([{ post: 1 }], 'post', seedPosts.length)).toEqual([])
    expect(() => countsByPostId([dangling])).toThrow(/unknown post index/)
  })
})
