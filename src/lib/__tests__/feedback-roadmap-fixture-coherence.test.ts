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
  status: string
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
  top_open: Array<{ id: string; vote_count: number; comment_count: number }>
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

describe('feedback-roadmap fixtures — the seed rows and the served reports agree', () => {
  it('the vote chart cannot total more votes than the report card says exist', () => {
    const stats = reports['admin/stats']!
    const charted = stats.votes_over_time.reduce((sum, bucket) => sum + bucket.count, 0)
    // A per-week breakdown of the same votes: every bucket is a disjoint slice
    // of those rows, so the sum can never exceed the total (admin.ts buckets
    // `votes` into 8 weekly windows).
    expect(charted).toBeLessThanOrEqual(stats.total_votes)
    expect(charted).toBe(stats.total_votes)
  })

  it('total_posts and counts_by_status describe the seeded posts', () => {
    const stats = reports['admin/stats']!
    expect(stats.total_posts).toBe(seedPosts.length)
    const perStatus: Record<string, number> = {}
    for (const post of seedPosts) perStatus[post.status] = (perStatus[post.status] ?? 0) + 1
    expect(stats.counts_by_status).toEqual(perStatus)
  })

  it('each board report counts the seeded posts on that board', () => {
    for (const [key, body] of Object.entries(reports)) {
      if (!key.startsWith('boards/by-slug/')) continue
      const slug = key.slice('boards/by-slug/'.length)
      const expected = seedPosts.filter((p) => p.board === slug).length
      // The seeded posts must reference a board the report set covers.
      expect(expected, `no seeded post on board ${slug}`).toBeGreaterThan(0)
      expect(body.post_count, `post_count for board ${slug}`).toBe(expected)
    }
  })

  it('the top-open and recently-shipped rows carry the real vote/comment counts', () => {
    const stats = reports['admin/stats']!
    for (const row of stats.top_open) {
      expect(votesByPost.get(row.id) ?? 0, `votes for ${row.id}`).toBe(row.vote_count)
      expect(commentsByPost.get(row.id) ?? 0, `comments for ${row.id}`).toBe(row.comment_count)
    }
    for (const row of stats.recent_shipped) {
      expect(votesByPost.get(row.id) ?? 0, `votes for ${row.id}`).toBe(row.vote_count)
    }
  })
})
