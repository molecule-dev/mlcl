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

// SECURITY TRIAGE — `audio_s3_key` / `hero_image_key` are intentionally
// accepted here. These writes are admin-only (`requireAdmin` below) and target
// the SHARED meditation catalog, a global table with NO per-user owner column
// (the same audio/image is served to every user by design). They reference the
// admin-uploaded catalog blob and must record its exact key, so they are NOT
// per-tenant, client-controlled storage-addressing keys — there is no other
// tenant's object to address, so the cross-tenant read IDOR class does not
// apply. Minting a server-side UUID here would point at a non-existent object
// and break catalog playback. (Contrast per-user upload handlers, which must
// mint the key server-side.)
const createSessionSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  category_id: z.string().nullable().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  duration_seconds: z.number().int().nonnegative(),
  instructor_name: z.string().optional(),
  audio_s3_key: z.string().optional(),
  transcript_text: z.string().optional(),
  hero_image_key: z.string().optional(),
  language: z.string().optional(),
  is_premium: z.boolean().optional(),
  is_published: z.boolean().optional(),
})

const updateSessionSchema = createSessionSchema.partial()

router.get('/', async (req: Request, res: Response) => {
  try {
    const { category_id, category, difficulty, limit, offset, q } = req.query

    let resolvedCategoryId: string | undefined
    if (category_id) {
      resolvedCategoryId = String(category_id)
    } else if (category) {
      const slug = String(category)
      const matches = await findMany<Record<string, unknown>>('meditation_categories', {
        where: [{ field: 'slug', operator: '=', value: slug }],
        limit: 1,
      })
      if (matches[0]?.id) resolvedCategoryId = String(matches[0].id)
      else {
        // category slug given but not found — return empty rather than all
        res.json([])
        return
      }
    }

    const where: WhereCondition[] = [{ field: 'is_published', operator: '=', value: true }]
    if (resolvedCategoryId)
      where.push({ field: 'category_id', operator: '=', value: resolvedCategoryId })
    if (difficulty) where.push({ field: 'difficulty', operator: '=', value: String(difficulty) })
    if (q) {
      where.push({ field: 'title', operator: 'ilike', value: String(q) })
    }

    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]

    const sessions = await findMany('meditation_sessions', {
      where,
      orderBy,
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
    })

    res.json(sessions)
  } catch (error) {
    logger.error('sessions.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function findSessionByIdOrSlug(idOrSlug: string): Promise<Record<string, unknown> | null> {
  if (UUID_RE.test(idOrSlug)) {
    const byId = await findById<Record<string, unknown>>('meditation_sessions', idOrSlug)
    if (byId) return byId
  }
  const matches = await findMany<Record<string, unknown>>('meditation_sessions', {
    where: [{ field: 'slug', operator: '=', value: idOrSlug }],
    limit: 1,
  })
  return matches[0] ?? null
}

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const idOrSlug = getParamId(req)
    const session = await findSessionByIdOrSlug(idOrSlug)
    if (!session) {
      return res.status(404).json({
        error: t('sessions.notFound', {}, { defaultValue: 'Session not found' }),
      })
    }
    if (session.is_published === false) {
      return res.status(404).json({
        error: t('sessions.notFound', {}, { defaultValue: 'Session not found' }),
      })
    }
    res.json(session)
  } catch (error) {
    logger.error('sessions.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  requireAdmin,
  validateBody(createSessionSchema),
  async (req: Request, res: Response) => {
    try {
      const body = req.body as z.infer<typeof createSessionSchema>
      const result = await create('meditation_sessions', {
        slug: body.slug,
        title: body.title,
        description: body.description ?? null,
        category_id: body.category_id ?? null,
        difficulty: body.difficulty ?? 'beginner',
        duration_seconds: body.duration_seconds,
        instructor_name: body.instructor_name ?? null,
        audio_s3_key: body.audio_s3_key ?? null,
        transcript_text: body.transcript_text ?? null,
        hero_image_key: body.hero_image_key ?? null,
        language: body.language ?? 'en',
        is_premium: body.is_premium ?? false,
        is_published: body.is_published ?? true,
        published_at: body.is_published === false ? null : new Date(),
        created_at: new Date(),
      })

      res.status(201).json(result.data)
    } catch (error) {
      logger.error('sessions.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put(
  '/:id',
  requireAdmin,
  validateBody(updateSessionSchema),
  async (req: Request, res: Response) => {
    try {
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('meditation_sessions', id)
      if (!existing) {
        return res.status(404).json({
          error: t('sessions.notFound', {}, { defaultValue: 'Session not found' }),
        })
      }

      const body = req.body as Partial<z.infer<typeof createSessionSchema>>
      const updates: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined) updates[key] = value
      }
      updates.updatedAt = new Date()

      const result = await updateById('meditation_sessions', id, updates)
      res.json(result.data)
    } catch (error) {
      logger.error('sessions.update', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('meditation_sessions', id)
    if (!existing) {
      return res.status(404).json({
        error: t('sessions.notFound', {}, { defaultValue: 'Session not found' }),
      })
    }

    await deleteById('meditation_sessions', id)
    res.status(204).end()
  } catch (error) {
    logger.error('sessions.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
