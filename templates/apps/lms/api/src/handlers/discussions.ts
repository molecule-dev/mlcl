import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import {
  assertEnrolled,
  enrolledCourseIds,
  isCourseStaff,
  requireUserId,
  staffCourseIds,
} from './_lmsAccess.js'

const router = Router()

/**
 * Discussion access (reading a thread / its replies / a course's threads, and
 * writing a new thread or reply) is gated by course membership: course staff
 * OR an active enrollment. The global `verifyMiddleware` only POPULATES the
 * session (it never 401s), so the handler must self-guard. `isCourseStaff` is
 * checked first so an instructor (not enrolled as a student) is not rejected
 * by `assertEnrolled` — the course author must be able to post in their own
 * course's forum. Writes a 404 (missing course) / 403 (not a member) and
 * returns false when access is denied — mirror of enrollments.ts's roster
 * read gate. Reads and writes share this gate: an unenrolled non-staff caller
 * can neither read nor write, while staff and enrolled members can do both.
 */
async function canAccessCourse(res: Response, userId: string, courseId: string): Promise<boolean> {
  if (await isCourseStaff(userId, courseId)) return true
  return assertEnrolled(res, userId, courseId)
}

const discussionCreateSchema = z.object({
  course_id: z.string(),
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(10000),
})

const discussionUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).max(10000).optional(),
})

const replyCreateSchema = z.object({
  content: z.string().min(1).max(5000),
})

/**
 * Attach an `author_name` display field to discussion/reply rows so the
 * forum UI can show who posted without a per-row user fetch. Rows only
 * store `author_id`; this resolves the referenced users in one query.
 */
async function attachAuthorNames<T extends Record<string, unknown>>(
  rows: T[],
): Promise<Array<T & { author_name: string | null }>> {
  const authorIds = [...new Set(rows.map((r) => String(r.author_id ?? '')).filter(Boolean))]
  if (authorIds.length === 0) return rows.map((r) => ({ ...r, author_name: null }))
  const users = await findMany<{ id: string; name?: string | null }>('users', {
    where: [{ field: 'id', operator: 'in', value: authorIds }],
  })
  const nameById = new Map(users.map((u) => [String(u.id), u.name ?? null]))
  return rows.map((r) => ({ ...r, author_name: nameById.get(String(r.author_id ?? '')) ?? null }))
}

/**
 * List discussion threads with optional `?course_id` filter. The forum view
 * (`/discussions`) calls this with no params; per-course filtering is
 * supported via either `/course/:courseId` (sub-route) or `?course_id=…`
 * (query) — the UI uses the latter where it's already filtering by course.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    // Forum-wide list: restrict to the courses the caller is a member of
    // (active enrollment) or staffs — never the global discussions table.
    const accessible = new Set<string>([
      ...(await enrolledCourseIds(userId)),
      ...(await staffCourseIds(userId)),
    ])

    let courseIds = [...accessible]
    const { course_id } = req.query
    if (course_id) {
      // A ?course_id filter may only narrow within the accessible set.
      const cid = String(course_id)
      if (!accessible.has(cid)) {
        res.json([])
        return
      }
      courseIds = [cid]
    }
    if (courseIds.length === 0) {
      res.json([])
      return
    }

    const where: WhereCondition[] = [{ field: 'course_id', operator: 'in', value: courseIds }]
    const discussions = await findMany<Record<string, unknown>>('discussions', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(await attachAuthorNames(discussions))
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('discussions.fetchError', {}, { defaultValue: 'Failed to fetch discussions' }),
    })
  }
})

router.get('/course/:courseId', async (req: Request, res: Response) => {
  try {
    const courseId = req.params.courseId as string
    const userId = requireUserId(res)
    if (!userId) return
    if (!(await canAccessCourse(res, userId, courseId))) return

    const discussions = await findMany<Record<string, unknown>>('discussions', {
      where: [{ field: 'course_id', operator: '=', value: courseId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(await attachAuthorNames(discussions))
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('discussions.fetchError', {}, { defaultValue: 'Failed to fetch discussions' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const userId = requireUserId(res)
    if (!userId) return
    const discussion = await findById<Record<string, unknown>>('discussions', id)
    if (!discussion) {
      res
        .status(404)
        .json({ error: t('discussions.notFound', {}, { defaultValue: 'Discussion not found' }) })
      return
    }
    if (!(await canAccessCourse(res, userId, String(discussion.course_id)))) return
    const [withAuthor] = await attachAuthorNames([discussion])
    res.json(withAuthor)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('discussions.fetchError', {}, { defaultValue: 'Failed to fetch discussion' }),
    })
  }
})

router.post('/', validateBody(discussionCreateSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return
    // Never trust the client course_id without a membership check: this
    // blocks a mass-assignment / cross-course write to a course the caller is
    // not a member of. Course staff (the instructor, plus active TAs) and
    // enrolled students may post; everyone else is 403'd (404 if the course
    // is missing).
    if (!(await canAccessCourse(res, userId, String(req.body.course_id)))) return
    const { data: discussion } = await create('discussions', {
      ...req.body,
      author_id: userId,
      reply_count: 0,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(discussion)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('discussions.createError', {}, { defaultValue: 'Failed to create discussion' }),
    })
  }
})

router.put('/:id', validateBody(discussionUpdateSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('discussions', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('discussions.notFound', {}, { defaultValue: 'Discussion not found' }) })
      return
    }
    if (existing.author_id !== userId) {
      res.status(403).json({
        error: t(
          'discussions.forbidden',
          {},
          { defaultValue: 'Only the author can edit this discussion' },
        ),
      })
      return
    }
    const { data: discussion } = await updateById('discussions', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    if (!discussion) {
      res
        .status(404)
        .json({ error: t('discussions.notFound', {}, { defaultValue: 'Discussion not found' }) })
      return
    }
    res.json(discussion)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('discussions.updateError', {}, { defaultValue: 'Failed to update discussion' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('discussions', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('discussions.notFound', {}, { defaultValue: 'Discussion not found' }) })
      return
    }
    if (existing.author_id !== userId) {
      res.status(403).json({
        error: t(
          'discussions.forbidden',
          {},
          { defaultValue: 'Only the author can delete this discussion' },
        ),
      })
      return
    }
    await deleteById('discussions', id)
    res.status(204).end()
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('discussions.deleteError', {}, { defaultValue: 'Failed to delete discussion' }),
    })
  }
})

router.get('/:id/replies', async (req: Request, res: Response) => {
  try {
    const discussionId = req.params.id as string
    const userId = requireUserId(res)
    if (!userId) return
    const discussion = await findById<Record<string, unknown>>('discussions', discussionId)
    if (!discussion) {
      res
        .status(404)
        .json({ error: t('discussions.notFound', {}, { defaultValue: 'Discussion not found' }) })
      return
    }
    if (!(await canAccessCourse(res, userId, String(discussion.course_id)))) return

    const replies = await findMany<Record<string, unknown>>('discussion_replies', {
      where: [{ field: 'discussion_id', operator: '=', value: discussionId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(await attachAuthorNames(replies))
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('discussions.fetchRepliesError', {}, { defaultValue: 'Failed to fetch replies' }),
    })
  }
})

router.post(
  '/:id/replies',
  validateBody(replyCreateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUserId(res)
      if (!userId) return
      const discussionId = req.params.id as string
      const discussion = await findById<Record<string, unknown>>('discussions', discussionId)
      if (!discussion) {
        res
          .status(404)
          .json({ error: t('discussions.notFound', {}, { defaultValue: 'Discussion not found' }) })
        return
      }
      // Reply write: must be a member of the thread's course — course staff
      // (instructor + active TAs) or an enrolled student. Never trust the URL
      // id alone (cross-course write); non-members are 403'd.
      if (!(await canAccessCourse(res, userId, String(discussion.course_id)))) return
      const { data: reply } = await create('discussion_replies', {
        discussion_id: discussionId,
        author_id: userId,
        content: req.body.content,
        created_at: new Date().toISOString(),
      })
      // Keep the denormalized reply_count in step so the forum list shows
      // real counts (it renders discussions.reply_count directly).
      await updateById('discussions', discussionId, {
        reply_count: (Number(discussion.reply_count) || 0) + 1,
      })
      const [withAuthor] = await attachAuthorNames([(reply ?? {}) as Record<string, unknown>])
      res.status(201).json(reply ? withAuthor : reply)
    } catch (error) {
      logger.error(error)
      res.status(500).json({
        error: t('discussions.createReplyError', {}, { defaultValue: 'Failed to create reply' }),
      })
    }
  },
)

export default router
