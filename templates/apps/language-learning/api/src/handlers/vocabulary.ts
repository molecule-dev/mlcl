/**
 * Vocabulary CRUD + SRS review handlers.
 *
 * - Every read/write scopes by `user_id` (ownership) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * Mastery model: integer 0-5; correct review → +1 + double interval; wrong
 * → max(0, mastery-1) + 1-day reset.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const STARTER_VOCAB = [
  {
    word: 'desayuno',
    pronunciation: '/de.saˈʝu.no/',
    translation: 'breakfast',
    example: 'El desayuno está listo en la cocina.',
    language_code: 'es',
  },
  {
    word: 'biblioteca',
    pronunciation: '/bi.βljoˈte.ka/',
    translation: 'library',
    example: 'Estudio en la biblioteca todos los sábados.',
    language_code: 'es',
  },
  {
    word: 'imprescindible',
    pronunciation: '/im.pɾes.θinˈdi.βle/',
    translation: 'essential, indispensable',
    example: 'Una buena pronunciación es imprescindible.',
    language_code: 'es',
  },
  {
    word: 'amistad',
    pronunciation: '/a.misˈtað/',
    translation: 'friendship',
    example: 'La amistad sincera no se rompe con la distancia.',
    language_code: 'es',
  },
  {
    word: 'sorprender',
    pronunciation: '/soɾ.pɾenˈdeɾ/',
    translation: 'to surprise',
    example: 'Quería sorprender a mi madre con un viaje.',
    language_code: 'es',
  },
  {
    word: 'crecimiento',
    pronunciation: '/kɾe.θiˈmjen.to/',
    translation: 'growth',
    example: 'El crecimiento personal lleva tiempo.',
    language_code: 'es',
  },
]

/**
 * Seed a starter vocabulary deck for a user if they have none yet. Idempotent —
 * safe to call from any read endpoint. Mirrors the dashboard's bootstrap so
 * that visiting /vocabulary directly (without going through /dashboard first)
 * still shows real, demoable content for fresh accounts.
 */
async function ensureStarterVocab(userId: string): Promise<void> {
  const existing = await count('vocabulary_items', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing > 0) return
  const now = new Date()
  for (const v of STARTER_VOCAB) {
    await create('vocabulary_items', {
      user_id: userId,
      word: v.word,
      pronunciation: v.pronunciation,
      translation: v.translation,
      example: v.example,
      language_code: v.language_code,
      mastery: 0,
      next_review_iso: now,
      created_at: now,
      updated_at: now,
    })
  }
}

const idOf = (req: Request): string => String(req.params.id)

const createVocabSchema = z.object({
  word: z.string().min(1).max(200),
  pronunciation: z.string().max(200).optional(),
  translation: z.string().max(2000).optional(),
  example: z.string().max(2000).optional(),
  language_code: z.string().max(10).optional(),
})

const updateVocabSchema = createVocabSchema.partial()

const reviewSchema = z.object({ correct: z.boolean() })

const listQuerySchema = z.object({
  due_only: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

router.get(
  '/',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    await ensureStarterVocab(userId)
    const q = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q.due_only) {
      where.push({ field: 'next_review_iso', operator: '<=', value: new Date().toISOString() })
    }
    const orderBy: OrderBy[] = [{ field: 'next_review_iso', direction: 'asc' }]
    const items = await findMany('vocabulary_items', {
      where,
      orderBy,
      limit: q.limit ?? 200,
      offset: q.offset ?? 0,
    })
    res.json(items)
  },
)

router.get(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const item = await findById<Record<string, unknown>>('vocabulary_items', idOf(req))
    if (!item || item.user_id !== userId) {
      res.status(404).json({
        error: t('vocabulary.notFound', undefined, { defaultValue: 'Vocabulary item not found.' }),
      })
      return
    }
    res.json(item)
  },
)

router.post(
  '/',
  validateBody(createVocabSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createVocabSchema>
    const now = new Date()
    const result = await create('vocabulary_items', {
      user_id: userId,
      word: body.word,
      pronunciation: body.pronunciation ?? '',
      translation: body.translation ?? '',
      example: body.example ?? '',
      language_code: body.language_code ?? '',
      mastery: 0,
      next_review_iso: now,
      created_at: now,
      updated_at: now,
    })
    res.status(201).json((result as { data: unknown }).data)
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateVocabSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('vocabulary_items', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('vocabulary.notFound', undefined, { defaultValue: 'Vocabulary item not found.' }),
      })
      return
    }
    const updates = { ...(req.body as Record<string, unknown>), updated_at: new Date() }
    const result = await updateById('vocabulary_items', id, updates)
    res.json((result as { data: unknown }).data)
  },
)

router.post(
  '/:id/review',
  validateParams(idParamSchema),
  validateBody(reviewSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('vocabulary_items', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('vocabulary.notFound', undefined, { defaultValue: 'Vocabulary item not found.' }),
      })
      return
    }
    const { correct } = req.body as z.infer<typeof reviewSchema>
    const currentMastery = Number(existing.mastery ?? 0)
    const newMastery = correct ? Math.min(5, currentMastery + 1) : Math.max(0, currentMastery - 1)
    const intervalDays = correct ? Math.max(1, 2 ** newMastery) : 1
    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + intervalDays)
    const now = new Date()
    const result = await updateById('vocabulary_items', id, {
      mastery: newMastery,
      next_review_iso: nextReview,
      updated_at: now,
    })
    res.json((result as { data: unknown }).data)
  },
)

router.delete(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('vocabulary_items', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('vocabulary.notFound', undefined, { defaultValue: 'Vocabulary item not found.' }),
      })
      return
    }
    await deleteMany('vocabulary_items', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
