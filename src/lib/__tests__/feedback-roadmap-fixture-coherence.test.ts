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
  post: number
}
interface CommentFixture {
  post: number
}
interface ReportBody {
  total_posts: number
  total_votes: number
  counts_by_status: Record<string, number>
  votes_over_time: Array<{ label: string; count: number }>
  top_open: Array<{ id: string; title: string; vote_count: number; comment_count: number }>
  recent_shipped: Array<{ id: string; vote_count: number }>
}

const seedPosts = read<PostFixture[]>('seed', 'posts.json')
const seedVotes = read<VoteFixture[]>('seed', 'votes.json')
const seedComments = read<CommentFixture[]>('seed', 'comments.json')
const reports = read<Record<string, ReportBody & { post_count?: number }>>('reports.json')

/** Votes/comments per SEED POST ID — the 1-based index is how the fixtures reference posts. */
function countsByPostId(rows: Array<{ post: number }>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const id = seedPosts[row.post - 1]?.id
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
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
