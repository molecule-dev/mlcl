import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { LmsLimits } from '../tiers.js'
import {
  assertCourseStaff,
  assertEnrolled,
  enrolledCourseIds,
  isCourseStaff,
  requireUserId,
  staffCourseIds,
} from './_lmsAccess.js'

const router = Router()

/**
 * Module/lesson content reads (a course's modules, a single module, a lesson
 * item, a module's items) are gated by course membership: course staff OR an
 * active enrollment. The global `verifyMiddleware` only POPULATES the session
 * (it never 401s), so the handler must self-guard. `isCourseStaff` is checked
 * first so an instructor (not enrolled as a student) is not rejected by
 * `assertEnrolled`. Writes a 404 (missing course) / 403 (not a member) and
 * returns false when access is denied — mirror of discussions.ts canReadCourse.
 */
async function canReadCourse(res: Response, userId: string, courseId: string): Promise<boolean> {
  if (await isCourseStaff(userId, courseId)) return true
  return assertEnrolled(res, userId, courseId)
}

const moduleCreateSchema = z.object({
  course_id: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  position: z.number().int().min(0).optional(),
})

const moduleUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  position: z.number().int().min(0).optional(),
})

const moduleItemCreateSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.enum(['page', 'assignment', 'quiz', 'file', 'link']).optional(),
  content_id: z.string().optional(),
  url: z.string().optional(),
  position: z.number().int().min(0).optional(),
})

const reorderSchema = z.object({
  item_ids: z.array(z.string()),
})

/**
 * List every module across courses. Used by CourseDetail / Lesson when
 * resolving a module/lesson by id without already knowing the course.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    // Scope to the courses the caller is a member of (active enrollment) or
    // staffs — never the global course_modules table across every course.
    const accessible = new Set<string>([
      ...(await enrolledCourseIds(userId)),
      ...(await staffCourseIds(userId)),
    ])
    if (accessible.size === 0) {
      res.json([])
      return
    }

    const modules = await findMany('course_modules', {
      where: [{ field: 'course_id', operator: 'in', value: [...accessible] }],
      orderBy: [
        { field: 'course_id', direction: 'asc' },
        { field: 'position', direction: 'asc' },
      ],
    })
    res.json(modules)
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('modules.fetchError', {}, { defaultValue: 'Failed to fetch modules' }) })
  }
})

router.get('/course/:courseId', async (req: Request, res: Response) => {
  try {
    const courseId = req.params.courseId as string
    const userId = requireUserId(res)
    if (!userId) return
    if (!(await canReadCourse(res, userId, courseId))) return

    const modules = await findMany('course_modules', {
      where: [{ field: 'course_id', operator: '=', value: courseId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(modules)
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('modules.fetchError', {}, { defaultValue: 'Failed to fetch modules' }) })
  }
})

/**
 * Single module-item (a "lesson") lookup. Returns the item plus computed
 * navigation context: the parent course's name, the position of this
 * lesson within the course's flattened lesson sequence, and the ids of
 * the previous/next lesson in that sequence (null at the boundaries).
 *
 * The Lesson page consumes this to render order + prev/next nav.
 *
 * IMPORTANT: This route MUST be declared before `/:id` because Express
 * matches routes in declaration order — without this, `GET /items/:itemId`
 * would be captured by `/:id` with `id = "items"`, then a subsequent
 * `findById('course_modules', 'items')` would crash on a UUID validation
 * error in the postgres driver.
 */
router.get('/items/:itemId', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return
    const itemId = req.params.itemId as string
    const item = await findById<Record<string, unknown>>('module_items', itemId)
    if (!item) {
      res
        .status(404)
        .json({ error: t('modules.itemNotFound', {}, { defaultValue: 'Lesson not found' }) })
      return
    }

    const parentModule = await findById<Record<string, unknown>>(
      'course_modules',
      String(item.module_id),
    )
    if (!parentModule) {
      res
        .status(404)
        .json({ error: t('modules.notFound', {}, { defaultValue: 'Module not found' }) })
      return
    }
    const courseId = String(parentModule.course_id)
    if (!(await canReadCourse(res, userId, courseId))) return

    const course = await findById<Record<string, unknown>>('courses', courseId)

    const courseModules = await findMany<{ id: string; position: number }>('course_modules', {
      where: [{ field: 'course_id', operator: '=', value: courseId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })

    let allItems: Array<Record<string, unknown>> = []
    if (courseModules.length > 0) {
      const moduleIds = courseModules.map((m) => m.id)
      const items = await findMany<Record<string, unknown>>('module_items', {
        where: [{ field: 'module_id', operator: 'in', value: moduleIds }],
      })
      const moduleOrder = new Map(courseModules.map((m, i) => [m.id, i]))
      allItems = items.slice().sort((a, b) => {
        const ma = moduleOrder.get(String(a.module_id)) ?? 0
        const mb = moduleOrder.get(String(b.module_id)) ?? 0
        if (ma !== mb) return ma - mb
        return Number(a.position ?? 0) - Number(b.position ?? 0)
      })
    }

    const flatIndex = allItems.findIndex((it) => String(it.id) === itemId)
    const order = flatIndex >= 0 ? flatIndex + 1 : 1
    const prevLessonId = flatIndex > 0 ? String(allItems[flatIndex - 1]!.id) : null
    const nextLessonId =
      flatIndex >= 0 && flatIndex < allItems.length - 1 ? String(allItems[flatIndex + 1]!.id) : null

    res.json({
      ...item,
      course_id: courseId,
      course_name: course?.name ?? null,
      module_title: parentModule.title ?? null,
      order,
      total_lessons: allItems.length,
      prev_lesson_id: prevLessonId,
      next_lesson_id: nextLessonId,
    })
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('modules.fetchItemError', {}, { defaultValue: 'Failed to fetch lesson' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return
    const id = req.params.id as string
    const mod = await findById<Record<string, unknown>>('course_modules', id)
    if (!mod) {
      res
        .status(404)
        .json({ error: t('modules.notFound', {}, { defaultValue: 'Module not found' }) })
      return
    }
    if (!(await canReadCourse(res, userId, String(mod.course_id)))) return
    res.json(mod)
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('modules.fetchError', {}, { defaultValue: 'Failed to fetch module' }) })
  }
})

router.post(
  '/',
  enforceLimit<LmsLimits>({
    limitType: 'maxModulesPerCourse',
    getLimit: (limits) => limits.maxModulesPerCourse,
    // Per-course cap: count the modules already in the course this request targets. The tier doc
    // promises enforcement on the relevant POST routes, but only maxCourses was wired. getCurrent
    // receives the request, so we scope the count to req.body.course_id (an absent id counts 0 and
    // validateBody then rejects the malformed body).
    getCurrent: (_userId, req) => {
      // The entitlements core types `req` minimally (framework-agnostic); read the parsed body via a
      // structural cast — this route's body carries course_id (validateBody runs after this gate).
      const courseId = String((req as { body?: { course_id?: unknown } }).body?.course_id ?? '')
      return count('course_modules', [{ field: 'course_id', operator: '=', value: courseId }])
    },
  }) as unknown as RequestHandler,
  validateBody(moduleCreateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUserId(res)
      if (!userId) return
      if (!(await assertCourseStaff(res, userId, req.body.course_id as string))) return

      const { data: mod } = await create('course_modules', {
        ...req.body,
        position: req.body.position ?? 0,
        created_at: new Date().toISOString(),
      })
      res.status(201).json(mod)
    } catch (error) {
      logger.error(error)
      res
        .status(500)
        .json({ error: t('modules.createError', {}, { defaultValue: 'Failed to create module' }) })
    }
  },
)

router.put('/:id', validateBody(moduleUpdateSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('course_modules', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('modules.notFound', {}, { defaultValue: 'Module not found' }) })
      return
    }
    if (!(await assertCourseStaff(res, userId, String(existing.course_id)))) return

    const { data: mod } = await updateById('course_modules', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    if (!mod) {
      res
        .status(404)
        .json({ error: t('modules.notFound', {}, { defaultValue: 'Module not found' }) })
      return
    }
    res.json(mod)
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('modules.updateError', {}, { defaultValue: 'Failed to update module' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('course_modules', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('modules.notFound', {}, { defaultValue: 'Module not found' }) })
      return
    }
    if (!(await assertCourseStaff(res, userId, String(existing.course_id)))) return

    await deleteById('course_modules', id)
    res.status(204).end()
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('modules.deleteError', {}, { defaultValue: 'Failed to delete module' }) })
  }
})

router.get('/:id/items', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return
    const moduleId = req.params.id as string
    const mod = await findById<Record<string, unknown>>('course_modules', moduleId)
    if (!mod) {
      res
        .status(404)
        .json({ error: t('modules.notFound', {}, { defaultValue: 'Module not found' }) })
      return
    }
    if (!(await canReadCourse(res, userId, String(mod.course_id)))) return

    const items = await findMany('module_items', {
      where: [{ field: 'module_id', operator: '=', value: moduleId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('modules.fetchItemsError', {}, { defaultValue: 'Failed to fetch module items' }),
    })
  }
})

router.post(
  '/:id/items',
  validateBody(moduleItemCreateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUserId(res)
      if (!userId) return

      const moduleId = req.params.id as string
      const mod = await findById<Record<string, unknown>>('course_modules', moduleId)
      if (!mod) {
        res
          .status(404)
          .json({ error: t('modules.notFound', {}, { defaultValue: 'Module not found' }) })
        return
      }
      if (!(await assertCourseStaff(res, userId, String(mod.course_id)))) return

      const { data: item } = await create('module_items', {
        module_id: moduleId,
        ...req.body,
        position: req.body.position ?? 0,
        created_at: new Date().toISOString(),
      })
      res.status(201).json(item)
    } catch (error) {
      logger.error(error)
      res.status(500).json({
        error: t('modules.createItemError', {}, { defaultValue: 'Failed to create module item' }),
      })
    }
  },
)

router.put(
  '/:moduleId/reorder',
  validateBody(reorderSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUserId(res)
      if (!userId) return

      const moduleId = req.params.moduleId as string
      const mod = await findById<Record<string, unknown>>('course_modules', moduleId)
      if (!mod) {
        res
          .status(404)
          .json({ error: t('modules.notFound', {}, { defaultValue: 'Module not found' }) })
        return
      }
      if (!(await assertCourseStaff(res, userId, String(mod.course_id)))) return

      const { item_ids } = req.body as { item_ids: string[] }
      // Bind every child id to the authorized module before mutating — assertCourseStaff
      // only authorizes the PATH module's course, so without this a staff member of one
      // module/course could renumber another module's items by passing their ids. Only
      // reorder ids that actually belong to this module; ignore foreign/unknown ids. [RVALL IDOR]
      const owned = await findMany<{ id: string }>('module_items', {
        where: [{ field: 'module_id', operator: '=', value: moduleId }],
      })
      const validIds = new Set(owned.map((item) => String(item.id)))
      for (let i = 0; i < item_ids.length; i++) {
        if (!validIds.has(String(item_ids[i]))) continue
        await updateById('module_items', item_ids[i], { position: i })
      }
      res.json({ success: true })
    } catch (error) {
      logger.error(error)
      res
        .status(500)
        .json({ error: t('modules.reorderError', {}, { defaultValue: 'Failed to reorder items' }) })
    }
  },
)

export default router
