import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'
import type { DonorManagementLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'
import { type DonorStats, type ShapedGift, shapeDonor, shapeGift, shapeNote } from './_shape.js'

const router = Router()

const DONOR_TAG_VALUES = [
  'monthly-donor',
  'major-donor',
  'volunteer',
  'board-member',
  'lapsed',
  'new',
] as const

const createDonorSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  is_organization: z.boolean().optional(),
  tags: z.array(z.enum(DONOR_TAG_VALUES)).max(12).optional(),
})

const updateDonorSchema = createDonorSchema.partial()

const createNoteSchema = z.object({
  body: z.string().min(1).max(4000),
  author: z.string().max(200).optional(),
})

router.use(authorizers.auth())

/** Aggregate this owner's gifts into per-donor lifetime stats. */
async function donorStatsMap(userId: string): Promise<Map<string, DonorStats>> {
  const gifts = await findMany<{ donor_id?: string; amount_cents?: number; gift_date?: unknown }>(
    'gifts',
    { where: [{ field: 'owner_id', operator: '=', value: userId }], limit: 10000 },
  )
  const map = new Map<string, DonorStats>()
  for (const g of gifts) {
    const donorId = typeof g.donor_id === 'string' ? g.donor_id : ''
    if (!donorId) continue
    const amount = Number(g.amount_cents ?? 0)
    const date = g.gift_date instanceof Date ? g.gift_date : new Date(String(g.gift_date ?? 0))
    const prev = map.get(donorId)
    if (!prev) {
      map.set(donorId, {
        lifetimeCents: amount,
        giftCount: 1,
        firstGiftedAt: date,
        lastGiftAt: date,
      })
    } else {
      prev.lifetimeCents += amount
      prev.giftCount += 1
      if (date < new Date(String(prev.firstGiftedAt))) prev.firstGiftedAt = date
      if (date > new Date(String(prev.lastGiftAt))) prev.lastGiftAt = date
    }
  }
  return map
}

// List donors — owner-scoped, with lifetime giving + last gift.
// Seeds demo data on first authenticated call.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { search, tag, page = '1', limit = '100' } = req.query
    // tags is a jsonb array — no WhereCondition operator covers containment,
    // so tag filtering happens post-shape like the text search below.
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]

    const donors = await findMany('donors', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    const stats = await donorStatsMap(userId)
    let shaped = donors.map((d) =>
      shapeDonor(d as Record<string, unknown>, stats.get(String(d.id))),
    )
    if (tag) {
      const tagQ = String(tag)
      shaped = shaped.filter((d) => d.tags.includes(tagQ))
    }
    const q = search ? String(search).trim().toLowerCase() : ''
    if (q) {
      shaped = shaped.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.email ?? '').toLowerCase().includes(q) ||
          d.tags.some((tg) => tg.includes(q)),
      )
    }
    res.json(shaped)
  } catch (err) {
    logger.error('[donors] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get donor details — owner-only, with giving history timeline + notes.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('donors', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('donors.notFound', {}, { defaultValue: 'Donor not found' }) })
      return
    }
    const donorId = req.params.id as string
    const stats = await donorStatsMap(userId)
    const donor = shapeDonor(check.row as Record<string, unknown>, stats.get(donorId))

    const giftRows = await findMany('gifts', {
      where: [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'donor_id', operator: '=', value: donorId },
      ],
      orderBy: [{ field: 'gift_date', direction: 'desc' }],
      limit: 500,
    })
    const gifts: ShapedGift[] = giftRows.map((g) =>
      shapeGift(g as Record<string, unknown>, donor.name),
    )

    const noteRows = await findMany('notes', {
      where: [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'donor_id', operator: '=', value: donorId },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 100,
    })
    const notes = noteRows.map((n) => shapeNote(n as Record<string, unknown>))

    res.json({ ...donor, gifts, notes })
  } catch (err) {
    logger.error('[donors] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create donor — entitlement-gated by tier.
router.post(
  '/',
  enforceLimit<DonorManagementLimits>({
    limitType: 'maxDonors',
    getLimit: (limits) => limits.maxDonors,
    getCurrent: async (userId) =>
      count('donors', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createDonorSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createDonorSchema>
      const now = new Date().toISOString()
      const result = await create('donors', {
        owner_id: userId,
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        address: body.address ?? null,
        is_organization: body.is_organization ?? false,
        tags: body.tags ?? [],
        created_at: now,
        updated_at: now,
      })
      res.status(201).json(shapeDonor(result.data as Record<string, unknown>))
    } catch (err) {
      logger.error('[donors] create failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update donor — owner-only.
router.put('/:id', validateBody(updateDonorSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('donors', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('donors.notFound', {}, { defaultValue: 'Donor not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateDonorSchema>
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) updates.name = body.name
    if (body.email !== undefined) updates.email = body.email
    if (body.phone !== undefined) updates.phone = body.phone
    if (body.address !== undefined) updates.address = body.address
    if (body.is_organization !== undefined) updates.is_organization = body.is_organization
    if (body.tags !== undefined) updates.tags = body.tags

    const result = await updateById('donors', req.params.id as string, updates)
    res.json(shapeDonor(result.data as Record<string, unknown>))
  } catch (err) {
    logger.error('[donors] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete donor — owner-only. Gifts, notes and receipts cascade (FK).
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('donors', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('donors.notFound', {}, { defaultValue: 'Donor not found' }) })
      return
    }
    await deleteById('donors', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[donors] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// List a donor's notes — owner-only.
router.get('/:id/notes', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('donors', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('donors.notFound', {}, { defaultValue: 'Donor not found' }) })
      return
    }
    const rows = await findMany('notes', {
      where: [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'donor_id', operator: '=', value: req.params.id as string },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 100,
    })
    res.json(rows.map((n) => shapeNote(n as Record<string, unknown>)))
  } catch (err) {
    logger.error('[donors] notes list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Add a note to a donor — owner-only.
router.post('/:id/notes', validateBody(createNoteSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('donors', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('donors.notFound', {}, { defaultValue: 'Donor not found' }) })
      return
    }
    const body = req.body as z.infer<typeof createNoteSchema>
    const result = await create('notes', {
      owner_id: userId,
      donor_id: req.params.id as string,
      author: body.author ?? '',
      body: body.body,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(shapeNote(result.data as Record<string, unknown>))
  } catch (err) {
    logger.error('[donors] note create failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
