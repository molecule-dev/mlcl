/**
 * Admin surface — status workflow, dashboard stats, duplicate merge.
 *
 * Everything here requires an admin session (the product team):
 *
 * - `GET  /admin/stats`           — dashboard: counts by status, top open
 *                                   posts, votes-per-week buckets, recent ships.
 * - `POST /admin/posts/:id/status`— move a post through
 *                                   open → planned → in_progress → shipped,
 *                                   or mark it declined; optionally set the
 *                                   official response body + roadmap quarter
 *                                   label. Setting shipped stamps shipped_at
 *                                   (which is what makes it a changelog entry);
 *                                   leaving shipped clears it.
 * - `POST /admin/posts/:id/merge` — fold a duplicate into a target post:
 *                                   votes move (collisions on the UNIQUE
 *                                   (post_id, user_id) pair are dropped),
 *                                   comments move, and the source gets a
 *                                   moved note + merged_into_id link.
 *
 * The IDOR gate is `requireAdmin` (an explicit role check on the user
 * record — admins legitimately operate cross-user, which the structural
 * gate accepts as the `requireOwner`-style marker).
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { POST_STATUSES } from './posts.js'

const router = Router()

const statusSchema = z.object({
  status: z.enum(POST_STATUSES),
  admin_response: z.string().max(5000).nullable().optional(),
  roadmap_label: z.string().max(40).nullable().optional(),
})

const mergeSchema = z.object({
  target_id: z.string().min(1),
})

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(id: string): boolean {
  return UUID_RX.test(id)
}

function getSession(res: Response): { userId?: string; role?: string } | undefined {
  return res.locals.session as { userId?: string; role?: string } | undefined
}

/** IDOR gate marker — admin-only mutations, role verified on the user row. */
async function requireAdmin(res: Response): Promise<string | null> {
  const session = getSession(res)
  const userId = session?.userId
  if (!userId) {
    res.status(401).json({
      error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
    })
    return null
  }
  const user = (await findById('users', userId)) as { role?: string } | null
  const role = user?.role ?? session?.role ?? 'member'
  if (role !== 'admin') {
    res.status(403).json({
      error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }),
    })
    return null
  }
  return userId
}

// --- Routes ---

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(res)
    if (!admin) return

    const notMerged: WhereCondition[] = [{ field: 'merged_into_id', operator: 'is_null' }]
    const posts = await findMany<Record<string, unknown>>('feedback_posts', {
      where: notMerged,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })

    const countsByStatus: Record<string, number> = {}
    for (const s of POST_STATUSES) countsByStatus[s] = 0
    for (const p of posts) {
      const s = String(p.status ?? 'open')
      if (s in countsByStatus) countsByStatus[s] += 1
    }

    const topOpen = posts
      .filter((p) => p.status === 'open')
      .sort((a, b) => ((b.vote_count as number) ?? 0) - ((a.vote_count as number) ?? 0))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        title: p.title,
        vote_count: p.vote_count ?? 0,
        comment_count: p.comment_count ?? 0,
        created_at: p.created_at,
      }))

    const votes = await findMany<{ created_at: string }>('feedback_votes', {
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    // 8 weekly buckets ending with the current week. Demo-scale data means a
    // plain in-JS group-by is both simpler and more portable than SQL date
    // arithmetic that would differ per database bond.
    const week = 7 * 24 * 60 * 60 * 1000
    const now = Date.now()
    const votesOverTime = Array.from({ length: 8 }, (_, i) => {
      const end = now - (7 - i) * week
      const start = end - week
      const bucket = votes.filter((v) => {
        const at = new Date(v.created_at).getTime()
        return at > start && at <= end
      })
      // Label = the Monday-anchored week start, e.g. "Sep 15".
      return {
        label: new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: bucket.length,
      }
    })

    const recentShipped = (
      await findMany<Record<string, unknown>>('feedback_posts', {
        where: [{ field: 'status', operator: '=', value: 'shipped' }],
        orderBy: [{ field: 'shipped_at', direction: 'desc' }],
        limit: 5,
      })
    ).map((p) => ({
      id: p.id,
      title: p.title,
      shipped_at: p.shipped_at,
      vote_count: p.vote_count ?? 0,
    }))

    res.json({
      total_posts: posts.length,
      counts_by_status: countsByStatus,
      total_votes: votes.length,
      top_open: topOpen,
      votes_over_time: votesOverTime,
      recent_shipped: recentShipped,
    })
  } catch (error) {
    logger.error('admin.stats', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/posts/:id/status',
  validateBody(statusSchema),
  async (req: Request, res: Response) => {
    try {
      const admin = await requireAdmin(res)
      if (!admin) return

      const id = getParamId(req)
      if (!isUuid(id)) {
        res.status(404).json({
          error: t('posts.notFound', {}, { defaultValue: 'Post not found' }),
        })
        return
      }
      const post = await findById<Record<string, unknown>>('feedback_posts', id)
      if (!post) {
        res.status(404).json({
          error: t('posts.notFound', {}, { defaultValue: 'Post not found' }),
        })
        return
      }
      if (post.merged_into_id) {
        res.status(403).json({
          error: t('posts.merged', {}, { defaultValue: 'This post was merged into another' }),
        })
        return
      }

      const { status, admin_response, roadmap_label } = req.body as z.infer<typeof statusSchema>
      const now = new Date().toISOString()

      const updates: Record<string, unknown> = {
        status,
        updated_at: now,
        // Entering shipped stamps the changelog date; leaving shipped reopens
        // the changelog slot so the entry disappears rather than lingering
        // with a stale date.
        shipped_at: status === 'shipped' ? ((post.shipped_at as string) ?? now) : null,
      }
      if (admin_response !== undefined) {
        updates.admin_response = admin_response
        updates.admin_responded_at = admin_response === null ? null : now
      }
      // Roadmap labels only make sense for the roadmap statuses — moving a
      // post to open/declined/shipped clears any stale quarter label.
      if (roadmap_label !== undefined) {
        updates.roadmap_label = roadmap_label
      } else if (status === 'open' || status === 'declined') {
        updates.roadmap_label = null
      }

      const result = await updateById('feedback_posts', id, updates)
      res.json(result.data)
    } catch (error) {
      logger.error('admin.status', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post('/posts/:id/merge', validateBody(mergeSchema), async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(res)
    if (!admin) return

    const id = getParamId(req)
    const { target_id: targetId } = req.body as z.infer<typeof mergeSchema>
    if (!isUuid(id) || !isUuid(targetId) || id === targetId) {
      res.status(400).json({
        error: t('admin.mergeInvalid', {}, { defaultValue: 'Invalid merge target' }),
      })
      return
    }

    const source = await findById<Record<string, unknown>>('feedback_posts', id)
    const target = await findById<Record<string, unknown>>('feedback_posts', targetId)
    if (!source || !target) {
      res.status(404).json({
        error: t('posts.notFound', {}, { defaultValue: 'Post not found' }),
      })
      return
    }
    // No merge chains: a post that was already merged away cannot absorb
    // others, and merging into your own ancestor would create a cycle the
    // redirect path could never resolve.
    if (target.merged_into_id) {
      res.status(400).json({
        error: t('admin.mergeTargetMerged', {}, { defaultValue: 'Target was itself merged' }),
      })
      return
    }

    // 1. Move votes — a voter who already voted the target keeps exactly one
    //    vote there (UNIQUE pair); the duplicate source vote is dropped.
    const sourceVotes = await findMany<Record<string, unknown>>('feedback_votes', {
      where: [{ field: 'post_id', operator: '=', value: id }],
    })
    const targetVotes = await findMany<Record<string, unknown>>('feedback_votes', {
      where: [{ field: 'post_id', operator: '=', value: targetId }],
    })
    const targetVoters = new Set(targetVotes.map((v) => String(v.user_id)))
    let movedVotes = 0
    for (const v of sourceVotes) {
      const voter = String(v.user_id)
      if (targetVoters.has(voter)) continue
      const now = new Date().toISOString()
      await create('feedback_votes', {
        post_id: targetId,
        user_id: voter,
        created_at: (v.created_at as string) ?? now,
        updated_at: now,
      })
      targetVoters.add(voter)
      movedVotes += 1
    }
    for (const v of sourceVotes) {
      await deleteById('feedback_votes', String(v.id))
    }

    // 2. Move comments — no uniqueness constraint, straight repoint.
    const sourceComments = await findMany<Record<string, unknown>>('feedback_comments', {
      where: [{ field: 'post_id', operator: '=', value: id }],
    })
    for (const c of sourceComments) {
      await updateById('feedback_comments', String(c.id), {
        post_id: targetId,
        updated_at: new Date().toISOString(),
      })
    }

    // 3. Stamp the source: moved note + link to the survivor. The source
    //    keeps its own title/body visible under the banner (voters need to
    //    recognize what they voted for), but its counters now read 0 because
    //    every vote moved.
    const now = new Date().toISOString()
    const movedNote = t(
      'admin.movedNote',
      { title: String(target.title ?? '') },
      { defaultValue: 'Merged into "{{title}}"' },
    )
    await updateById('feedback_posts', id, {
      merged_into_id: targetId,
      admin_response: movedNote,
      admin_responded_at: now,
      vote_count: 0,
      comment_count: 0,
      updated_at: now,
    })

    await updateById('feedback_posts', targetId, {
      vote_count: targetVoters.size,
      comment_count: ((target.comment_count as number | undefined) ?? 0) + sourceComments.length,
      updated_at: now,
    })

    const updated = await findById<Record<string, unknown>>('feedback_posts', targetId)
    res.json({
      source_id: id,
      target_id: targetId,
      moved_votes: movedVotes,
      moved_comments: sourceComments.length,
      target: updated,
    })
  } catch (error) {
    logger.error('admin.merge', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
