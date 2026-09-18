import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'

const router = Router()

const createCourseSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  day_count: z.number().int().min(1),
  hero_image_key: z.string().optional(),
  is_premium: z.boolean().optional(),
  is_published: z.boolean().optional(),
})

const updateCourseSchema = createCourseSchema.partial()

const createCourseDaySchema = z.object({
  course_id: z.string().min(1),
  day_number: z.number().int().min(1),
  session_id: z.string().nullable().optional(),
  title: z.string().optional(),
  prep_text: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const where: WhereCondition[] = [{ field: 'is_published', operator: '=', value: true }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const courses = await findMany('meditation_courses', { where, orderBy })
    res.json(courses)
  } catch (error) {
    logger.error('courses.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function findCourseByIdOrSlug(idOrSlug: string): Promise<Record<string, unknown> | null> {
  if (UUID_RE.test(idOrSlug)) {
    const byId = await findById<Record<string, unknown>>('meditation_courses', idOrSlug)
    if (byId) return byId
  }
  const matches = await findMany<Record<string, unknown>>('meditation_courses', {
    where: [{ field: 'slug', operator: '=', value: idOrSlug }],
    limit: 1,
  })
  return matches[0] ?? null
}

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const idOrSlug = getParamId(req)
    const course = await findCourseByIdOrSlug(idOrSlug)
    if (!course) {
      return res.status(404).json({
        error: t('courses.notFound', {}, { defaultValue: 'Course not found' }),
      })
    }
    const days = await findMany('meditation_course_days', {
      where: [{ field: 'course_id', operator: '=', value: course.id }],
      orderBy: [{ field: 'day_number', direction: 'asc' }],
    })
    res.json({ ...course, days })
  } catch (error) {
    logger.error('courses.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  requireAdmin,
  validateBody(createCourseSchema),
  async (req: Request, res: Response) => {
    try {
      const body = req.body as z.infer<typeof createCourseSchema>
      const result = await create('meditation_courses', {
        slug: body.slug,
        title: body.title,
        description: body.description ?? null,
        day_count: body.day_count,
        hero_image_key: body.hero_image_key ?? null,
        is_premium: body.is_premium ?? false,
        is_published: body.is_published ?? true,
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('courses.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put(
  '/:id',
  requireAdmin,
  validateBody(updateCourseSchema),
  async (req: Request, res: Response) => {
    try {
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('meditation_courses', id)
      if (!existing) {
        return res.status(404).json({
          error: t('courses.notFound', {}, { defaultValue: 'Course not found' }),
        })
      }
      const body = req.body as Partial<z.infer<typeof createCourseSchema>>
      const updates: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined) updates[key] = value
      }
      updates.updatedAt = new Date()
      const result = await updateById('meditation_courses', id, updates)
      res.json(result.data)
    } catch (error) {
      logger.error('courses.update', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('meditation_courses', id)
    if (!existing) {
      return res.status(404).json({
        error: t('courses.notFound', {}, { defaultValue: 'Course not found' }),
      })
    }

    await deleteById('meditation_courses', id)
    res.status(204).end()
  } catch (error) {
    logger.error('courses.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/:id/days',
  requireAdmin,
  validateBody(createCourseDaySchema),
  async (req: Request, res: Response) => {
    try {
      const courseId = getParamId(req)
      const body = req.body as z.infer<typeof createCourseDaySchema>
      const result = await create('meditation_course_days', {
        course_id: courseId,
        day_number: body.day_number,
        session_id: body.session_id ?? null,
        title: body.title ?? null,
        prep_text: body.prep_text ?? null,
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('courses.createDay', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

export default router
