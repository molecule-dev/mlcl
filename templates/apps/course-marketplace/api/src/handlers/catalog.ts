/**
 * Catalog handler — courses CRUD + featured + categories.
 *
 * Authorization model from INVENTORY.md:
 *   - read: world-readable when status='published'; drafts are owner-only
 *     (queries 404 to non-owners to avoid leaking unpublished ids).
 *   - create/update/delete: instructor-owned, scoped by `instructor_id`.
 *
 * Validation: every input goes through `validateBody`/`validateQuery`/
 *   `validateParams` from `@molecule/api-middleware-validation`.
 *
 * MeiliSearch integration uses the @molecule/api-search bond — falls back to
 * an ILIKE scan against `courses.title` when the bond's backing service is
 * unreachable (CI without a Meili container, dev box with the service
 * stopped, etc.). This keeps catalog browse functional everywhere.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'
import { hasProvider, search } from '@molecule/api-search'

import { decorateCourse, decorateCourses } from './_decorate.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  category: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  price_min: z.coerce.number().int().min(0).optional(),
  price_max: z.coerce.number().int().min(0).optional(),
  search: z.string().optional(),
  sort: z.enum(['popular', 'rating', 'recent', 'price-asc']).optional(),
})

const createCourseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  category: z.string().max(80).optional(),
  thumbnail_url: z.string().url().optional(),
  price_cents: z.number().int().min(0).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  duration_min: z.number().int().min(0).optional(),
  slug: z.string().max(120).optional(),
})

const updateCourseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  category: z.string().max(80).optional(),
  thumbnail_url: z.string().url().optional(),
  price_cents: z.number().int().min(0).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  duration_min: z.number().int().min(0).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  // SECURITY: `featured` is a privileged, admin-curated column and is deliberately
  // NOT accepted here. Including it let an instructor self-promote their own course
  // (the handlers build the update via `{ ...body, updated_at }`, so any body field
  // is mass-assigned). Create forces `featured: false`; curation must go through a
  // dedicated admin-gated route, never an owner edit. Do not re-add it.
})

router.get('/featured', async (_req: Request, res: Response) => {
  try {
    const courses = await findMany<Record<string, unknown>>('courses', {
      where: [
        { field: 'status', operator: '=', value: 'published' },
        { field: 'featured', operator: '=', value: true },
      ],
      orderBy: [{ field: 'published_at', direction: 'desc' }],
      limit: 12,
    })
    res.json(await decorateCourses(courses))
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/categories', async (_req: Request, res: Response) => {
  try {
    // Categories are derived from distinct `category` values among published
    // courses — there is no separate categories table. Use findMany with a
    // limit and a manual aggregate so we never run raw SQL in handlers.
    const rows = await findMany<{ category: string | null }>('courses', {
      where: [{ field: 'status', operator: '=', value: 'published' }],
      select: ['category'],
      limit: 1000,
    })
    const counts = new Map<string, number>()
    for (const r of rows) {
      if (!r.category) continue
      counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
    }
    // Merge case-variant duplicates ("Design" vs "design" — category is a
    // free-text column, so both exist in practice) into one bucket keyed
    // case-insensitively, keeping the most-used spelling as the display name.
    const merged = new Map<string, { name: string; nameCount: number; courseCount: number }>()
    for (const [name, courseCount] of counts) {
      const key = name.toLowerCase()
      const existing = merged.get(key)
      if (!existing) {
        merged.set(key, { name, nameCount: courseCount, courseCount })
      } else {
        existing.courseCount += courseCount
        if (courseCount > existing.nameCount) {
          existing.name = name
          existing.nameCount = courseCount
        }
      }
    }
    res.json(
      Array.from(merged.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ name, courseCount }) => ({ name, courseCount })),
    )
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    // Catalog browse is world-readable so the unauthenticated landing page
    // and SEO crawlers can read the catalog. Per-user gating only matters
    // for unpublished drafts, which we always exclude below.
    const params = req.query as unknown as z.infer<typeof listQuerySchema>
    const page = Number(params.page ?? 1)
    const limit = Number(params.limit ?? 24)

    const ilikeFallback = async (text: string): Promise<Record<string, unknown>[]> =>
      findMany('courses', {
        where: [
          { field: 'status', operator: '=', value: 'published' },
          { field: 'title', operator: 'ilike', value: `%${text}%` },
        ],
        orderBy: [{ field: 'total_enrollments', direction: 'desc' }],
        limit,
        offset: (page - 1) * limit,
      })

    if (params.search) {
      const meiliReachable = !!(process.env.MEILISEARCH_URL || process.env.MEILI_HOST)
      if (hasProvider() && meiliReachable) {
        try {
          const results = await search('courses', {
            text: String(params.search),
            page,
            perPage: limit,
          })
          // Search returns a structured response with hits — pass through if
          // it's already an array; otherwise extract `hits` and decorate.
          const hits = Array.isArray(results)
            ? (results as Record<string, unknown>[])
            : ((results as unknown as { hits?: Record<string, unknown>[] }).hits ?? [])
          res.json(await decorateCourses(hits))
          return
        } catch (err) {
          console.warn('search bond failed, falling back to ILIKE:', err)
        }
      }
      res.json(await decorateCourses(await ilikeFallback(String(params.search))))
      return
    }

    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'published' }]
    if (params.category) where.push({ field: 'category', operator: '=', value: params.category })
    if (params.level) where.push({ field: 'level', operator: '=', value: params.level })
    if (params.price_min !== undefined)
      where.push({ field: 'price_cents', operator: '>=', value: params.price_min })
    if (params.price_max !== undefined)
      where.push({ field: 'price_cents', operator: '<=', value: params.price_max })

    const sort = params.sort ?? 'popular'
    const orderBy: OrderBy[] =
      sort === 'rating'
        ? [{ field: 'rating_avg', direction: 'desc' }]
        : sort === 'recent'
          ? [{ field: 'published_at', direction: 'desc' }]
          : sort === 'price-asc'
            ? [{ field: 'price_cents', direction: 'asc' }]
            : [{ field: 'total_enrollments', direction: 'desc' }]

    const courses = await findMany<Record<string, unknown>>('courses', {
      where,
      orderBy,
      limit,
      offset: (page - 1) * limit,
    })
    res.json(await decorateCourses(courses))
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const course = await findById<Record<string, unknown>>('courses', idOf(req))
    if (!course) {
      res
        .status(404)
        .json({ error: t('catalog.notFound', undefined, { defaultValue: 'Course not found' }) })
      return
    }
    // Drafts are owner-only — 404 to anyone else (including unauthenticated
    // visitors) to avoid leaking unpublished ids.
    if (course.status !== 'published' && (!userId || course.instructor_id !== userId)) {
      res
        .status(404)
        .json({ error: t('catalog.notFound', undefined, { defaultValue: 'Course not found' }) })
      return
    }
    res.json(await decorateCourse(course))
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createCourseSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createCourseSchema>
    const result = await create<Record<string, unknown>>('courses', {
      instructor_id: userId,
      user_id: userId,
      title: body.title,
      slug: body.slug ?? null,
      description: body.description ?? null,
      category: body.category ?? 'general',
      thumbnail_url: body.thumbnail_url ?? null,
      price_cents: body.price_cents ?? 0,
      level: body.level ?? 'beginner',
      duration_min: body.duration_min ?? 0,
      total_lessons: 0,
      status: 'draft',
      featured: false,
      total_enrollments: 0,
      rating_avg: 0,
      rating_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const courseRow = (result.data ?? result) as Record<string, unknown>
    res.status(201).json(await decorateCourse(courseRow))
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateCourseSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const existing = await findById<Record<string, unknown>>('courses', idOf(req))
      if (!existing) {
        res
          .status(404)
          .json({ error: t('catalog.notFound', undefined, { defaultValue: 'Course not found' }) })
        return
      }
      if (existing.instructor_id !== userId) {
        res
          .status(403)
          .json({ error: t('catalog.forbidden', undefined, { defaultValue: 'Not your course' }) })
        return
      }
      const body = req.body as z.infer<typeof updateCourseSchema>
      const patch: Record<string, unknown> = { ...body, updated_at: new Date() }
      if (body.status === 'published' && !existing.published_at) {
        patch.published_at = new Date()
      }
      const result = await updateById<Record<string, unknown>>('courses', idOf(req), patch)
      const courseRow = (result.data ?? result) as Record<string, unknown>
      res.json(await decorateCourse(courseRow))
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateCourseSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const existing = await findById<Record<string, unknown>>('courses', idOf(req))
      if (!existing) {
        res
          .status(404)
          .json({ error: t('catalog.notFound', undefined, { defaultValue: 'Course not found' }) })
        return
      }
      if (existing.instructor_id !== userId) {
        res
          .status(403)
          .json({ error: t('catalog.forbidden', undefined, { defaultValue: 'Not your course' }) })
        return
      }
      const body = req.body as z.infer<typeof updateCourseSchema>
      const patch: Record<string, unknown> = { ...body, updated_at: new Date() }
      if (body.status === 'published' && !existing.published_at) {
        patch.published_at = new Date()
      }
      const result = await updateById<Record<string, unknown>>('courses', idOf(req), patch)
      const courseRow = (result.data ?? result) as Record<string, unknown>
      res.json(await decorateCourse(courseRow))
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const existing = await findById<Record<string, unknown>>('courses', idOf(req))
    if (!existing) {
      res
        .status(404)
        .json({ error: t('catalog.notFound', undefined, { defaultValue: 'Course not found' }) })
      return
    }
    if (existing.instructor_id !== userId) {
      res
        .status(403)
        .json({ error: t('catalog.forbidden', undefined, { defaultValue: 'Not your course' }) })
      return
    }
    await deleteById('courses', idOf(req))
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
