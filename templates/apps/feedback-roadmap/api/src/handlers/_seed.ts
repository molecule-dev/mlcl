/**
 * Demo seed for feedback-roadmap (SignalLoop — a fictional product-team
 * feedback portal for the equally fictional "Loopwork" product).
 *
 * Idempotent: guarded by a row-count check on feedback_boards, so server
 * restarts never double-seed. Loads api/fixtures/{users,boards,posts,votes,
 * comments}.json:
 *
 * - 6 demo accounts (2 product-team admins + 4 customers),
 * - 4 boards,
 * - 17 posts covering every workflow status (open / planned / in_progress /
 *   shipped / declined / merged-into-another),
 * - votes + a comment thread per active post.
 *
 * Fixture rows carry day OFFSETS (`days_ago` / `shipped_days_ago`) converted
 * to timestamps AT SEED TIME, so the demo set always reads as recent no
 * matter when the template is first booted.
 *
 * Called once at server boot from bonds/index.ts (setupBonds), wrapped in
 * try/catch — a seed failure must never block the API from serving.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'

import { count, create, findById, updateById } from '@molecule/api-database'

/** Resolves api/fixtures/*.json from BOTH src/ (tsx watch) and dist/. */
const fixture = (name: string): URL => new URL(`../../fixtures/${name}.json`, import.meta.url)

interface UserFixture {
  user_id: string
  email: string
  name: string
  username: string
  role: string
  bio?: string
}

interface BoardFixture {
  id: string
  slug: string
  name: string
  description: string
  color: string
  icon: string
  sort_order: number
}

interface PostFixture {
  id: string
  board: string
  author: number
  title: string
  body: string
  status: string
  roadmap_label?: string
  admin_response?: string
  merged_into?: string
  days_ago: number
  shipped_days_ago?: number
}

interface VoteFixture {
  post: number
  voter: number
  days_ago: number
}

interface CommentFixture {
  post: number
  author: number
  body: string
  days_ago: number
}

export interface SeedResult {
  usersCreated: number
  boardsCreated: number
  postsCreated: number
  votesCreated: number
  commentsCreated: number
}

const ZERO: SeedResult = {
  usersCreated: 0,
  boardsCreated: 0,
  postsCreated: 0,
  votesCreated: 0,
  commentsCreated: 0,
}

async function loadJson<T>(url: URL): Promise<T> {
  return JSON.parse(await readFile(url, 'utf8')) as T
}

const daysAgo = (d: number): string => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString()

/** Moved-note the admin merge path stamps on the duplicate post. */
export const MOVED_NOTE_PREFIX = 'Merged into'

async function ensureUser(u: UserFixture): Promise<boolean> {
  const existing = await findById<Record<string, unknown>>('users', u.user_id)
  if (existing) return false
  await create('users', {
    id: u.user_id,
    email: u.email,
    name: u.name,
    username: u.username,
    twoFactorEnabled: false,
    role: u.role,
    bio: u.bio ?? null,
    avatar_url: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  return true
}

export async function seedGlobalFeedbackWorkspaceIfEmpty(): Promise<SeedResult> {
  const existingBoards = await count('feedback_boards')
  if (existingBoards > 0) return ZERO

  const [users, boards, posts, votes, comments] = await Promise.all([
    loadJson<UserFixture[]>(fixture('users')),
    loadJson<BoardFixture[]>(fixture('boards')),
    loadJson<PostFixture[]>(fixture('posts')),
    loadJson<VoteFixture[]>(fixture('votes')),
    loadJson<CommentFixture[]>(fixture('comments')),
  ])

  const result: SeedResult = { ...ZERO }

  for (const u of users) {
    if (await ensureUser(u)) result.usersCreated += 1
  }

  for (const b of boards) {
    await create('feedback_boards', {
      id: b.id,
      slug: b.slug,
      name: b.name,
      description: b.description,
      color: b.color,
      icon: b.icon,
      sort_order: b.sort_order,
      created_at: daysAgo(90),
      updated_at: daysAgo(90),
    })
    result.boardsCreated += 1
  }

  const boardBySlug = new Map(boards.map((b) => [b.slug, b.id]))
  const postIds: string[] = []

  for (const p of posts) {
    const boardId = boardBySlug.get(p.board)
    if (!boardId) throw new Error(`seed: unknown board slug "${p.board}" on post ${p.id}`)
    const createdAt = daysAgo(p.days_ago)
    await create('feedback_posts', {
      id: p.id,
      slug: p.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80),
      title: p.title,
      body: p.body,
      board_id: boardId,
      author_id: users[p.author - 1]?.user_id,
      status: p.status,
      admin_response:
        p.merged_into && !p.admin_response
          ? // Same note shape the live admin merge endpoint writes, so the
            // seeded duplicate is indistinguishable from a real merge.
            `${MOVED_NOTE_PREFIX} "${posts.find((t) => t.id === p.merged_into)?.title ?? ''}"`
          : (p.admin_response ?? null),
      admin_responded_at: p.admin_response || p.merged_into ? createdAt : null,
      merged_into_id: p.merged_into ?? null,
      roadmap_label: p.roadmap_label ?? null,
      shipped_at: p.shipped_days_ago !== undefined ? daysAgo(p.shipped_days_ago) : null,
      created_at: createdAt,
      updated_at: createdAt,
    })
    postIds.push(p.id)
    result.postsCreated += 1
  }

  const votesPerPost = new Map<string, number>()
  for (const v of votes) {
    const postId = postIds[v.post - 1]
    if (!postId) throw new Error(`seed: vote references unknown post index ${v.post}`)
    await create('feedback_votes', {
      post_id: postId,
      user_id: users[v.voter - 1]?.user_id,
      created_at: daysAgo(v.days_ago),
      updated_at: daysAgo(v.days_ago),
    })
    votesPerPost.set(postId, (votesPerPost.get(postId) ?? 0) + 1)
    result.votesCreated += 1
  }

  const commentsPerPost = new Map<string, number>()
  for (const c of comments) {
    const postId = postIds[c.post - 1]
    if (!postId) throw new Error(`seed: comment references unknown post index ${c.post}`)
    await create('feedback_comments', {
      post_id: postId,
      author_id: users[c.author - 1]?.user_id,
      body: c.body,
      created_at: daysAgo(c.days_ago),
      updated_at: daysAgo(c.days_ago),
    })
    commentsPerPost.set(postId, (commentsPerPost.get(postId) ?? 0) + 1)
    result.commentsCreated += 1
  }

  // Denormalized counters — set once from the seeded rows above.
  for (const [postId, n] of votesPerPost) {
    await updateById('feedback_posts', postId, { vote_count: n })
  }
  for (const [postId, n] of commentsPerPost) {
    await updateById('feedback_posts', postId, { comment_count: n })
  }

  return result
}

/**
 * Per-user demo seed hook — intentionally a no-op for feedback-roadmap: the
 * global workspace seed already populates every public surface a fresh user
 * lands on (boards, roadmap, changelog), and a new submitter should see the
 * real empty-state of their own My Activity page.
 */
export async function seedDemoForUser(_userId: string): Promise<void> {
  void _userId
}
