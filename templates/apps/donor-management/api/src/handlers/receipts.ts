/**
 * Year-end tax receipts — donor-management's signature flow.
 *
 * POST /generate collects every one of a donor's UNRECEIPTED gifts for a
 * calendar year, writes a receipt row with a deterministic receipt number
 * (`YYYY-NNNNN`, a per-owner sequence), one receipt_items line per gift,
 * and stamps the gifts `receipt_id` so they show as receipted everywhere.
 * GET /:id returns the receipt with its line items for the print-friendly
 * view; DELETE un-marks the gifts and removes the receipt + items.
 *
 * This module deliberately does NOT generate PDF binaries or send email:
 * the receipt VIEW is print-styled (browser Print → paper or OS-native
 * PDF export). The integration point for automated delivery is a bond —
 * `@molecule/api-documents-<provider>` for PDF rendering and the emails
 * bond (`@molecule/api-emails-*`) for sending — wired at the route that
 * already returns the receipt payload.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'
import { asMap, shapeGift, shapeReceipt, shapeReceiptItem } from './_shape.js'

const router = Router()

const generateSchema = z.object({
  donor_id: z.string().uuid(),
  year: z.number().int().min(1990).max(2100),
})

router.use(authorizers.auth())

interface GiftRow {
  id?: string
  donor_id?: string
  amount_cents?: number
  gift_date?: unknown
  method?: string
  fund?: string
  campaign_id?: string | null
  receipt_id?: string | null
}

/** Deterministic per-owner sequence: `YYYY-NNNNN`.
 *
 *  Numbered from the owner's HIGHEST issued NNNNN (not count+1) so a
 *  deleted middle receipt can't cause a later generate to reuse a number
 *  that still exists — `owner_id + receipt_number` is unique. */
async function nextReceiptNumber(userId: string, year: number): Promise<string> {
  const rows = await findMany<{ receipt_number?: string }>('receipts', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
    limit: 10000,
  })
  let highest = 0
  for (const r of rows) {
    const m = /^\d{4}-(\d{5})$/.exec(String(r.receipt_number ?? ''))
    if (m) highest = Math.max(highest, Number(m[1]))
  }
  return `${year}-${String(highest + 1).padStart(5, '0')}`
}

/** The donor's unreceipted gifts inside a calendar year, oldest first. */
async function unreceiptedGifts(userId: string, donorId: string, year: number): Promise<GiftRow[]> {
  const gifts = await findMany<GiftRow>('gifts', {
    where: [
      { field: 'owner_id', operator: '=', value: userId },
      { field: 'donor_id', operator: '=', value: donorId },
      { field: 'gift_date', operator: '>=', value: `${year}-01-01` },
      { field: 'gift_date', operator: '<=', value: `${year}-12-31` },
      // `receipt_id` is nullable: `=` with a null VALUE renders `= NULL`,
      // which is never true — the null-aware operator is required here.
      { field: 'receipt_id', operator: 'is_null' },
    ],
    orderBy: [{ field: 'gift_date', direction: 'asc' }],
    limit: 2000,
  })
  return gifts
}

// List receipts — owner-scoped, newest first, with donor names.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { donor_id, year, page = '1', limit = '100' } = req.query
    const where = [
      { field: 'owner_id', operator: '=' as const, value: userId },
      ...(donor_id ? [{ field: 'donor_id', operator: '=' as const, value: String(donor_id) }] : []),
      ...(year && Number.isInteger(Number(year))
        ? [{ field: 'year', operator: '=' as const, value: Number(year) }]
        : []),
    ]
    const [receipts, donors] = await Promise.all([
      findMany('receipts', {
        where,
        orderBy: [{ field: 'issued_at', direction: 'desc' }],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
      }),
      findMany<{ id?: string; name?: string }>('donors', {
        where: [{ field: 'owner_id', operator: '=', value: userId }],
        limit: 10000,
      }),
    ])
    const donorMap = asMap(
      donors.map((d) => ({ id: String(d.id), name: String(d.name ?? '') })),
      'id',
    )
    res.json(
      receipts.map((r) =>
        shapeReceipt(r as Record<string, unknown>, donorMap.get(String(r.donor_id))?.name ?? ''),
      ),
    )
  } catch (err) {
    logger.error('[receipts] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Preview a would-be receipt: the unreceipted gifts a generate call would
// collect — powers the Receipts page's generate form.
router.get('/preview', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const donorId = String(req.query.donor_id ?? '')
    const year = Number(req.query.year)
    if (!donorId || !Number.isInteger(year)) {
      res.status(400).json({
        error: t('receipts.badPreview', {}, { defaultValue: 'donor_id and year are required' }),
      })
      return
    }
    const donor = await requireOwnership('donors', donorId, userId)
    if (!donor.ok) {
      res.status(donor.status).json({
        error: t('donors.notFound', {}, { defaultValue: 'Donor not found' }),
      })
      return
    }
    const gifts = await unreceiptedGifts(userId, donorId, year)
    const totalCents = gifts.reduce((sum, g) => sum + Number(g.amount_cents ?? 0), 0)
    res.json({
      donor_id: donorId,
      donor_name: String((donor.row as Record<string, unknown>).name ?? ''),
      year,
      gift_count: gifts.length,
      total_cents: totalCents,
      gifts: gifts.map((g) => shapeGift(g as Record<string, unknown>, '')),
    })
  } catch (err) {
    logger.error('[receipts] preview failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Generate a year-end receipt — the signature flow.
router.post('/generate', validateBody(generateSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof generateSchema>
    const donor = await requireOwnership('donors', body.donor_id, userId)
    if (!donor.ok) {
      res.status(donor.status).json({
        error: t('donors.notFound', {}, { defaultValue: 'Donor not found' }),
      })
      return
    }
    // One receipt per donor per year (UNIQUE(owner_id, year, donor_id)).
    const already = await count('receipts', [
      { field: 'owner_id', operator: '=', value: userId },
      { field: 'donor_id', operator: '=', value: body.donor_id },
      { field: 'year', operator: '=', value: body.year },
    ])
    if (already > 0) {
      res.status(409).json({
        error: t(
          'receipts.alreadyIssued',
          { year: String(body.year) },
          {
            defaultValue:
              'A receipt for this donor already exists for {{year}} — delete it before generating again.',
          },
        ),
      })
      return
    }

    const gifts = await unreceiptedGifts(userId, body.donor_id, body.year)
    if (gifts.length === 0) {
      res.status(422).json({
        error: t(
          'receipts.noGifts',
          { year: String(body.year) },
          {
            defaultValue:
              'No unreceipted gifts for this donor in {{year}} — record gifts first, or the year may already be receipted.',
          },
        ),
      })
      return
    }

    const totalCents = gifts.reduce((sum, g) => sum + Number(g.amount_cents ?? 0), 0)
    const receiptNumber = await nextReceiptNumber(userId, body.year)
    const now = new Date().toISOString()
    const receipt = (
      await create('receipts', {
        owner_id: userId,
        donor_id: body.donor_id,
        year: body.year,
        receipt_number: receiptNumber,
        total_cents: totalCents,
        issued_at: now,
        created_at: now,
        updated_at: now,
      })
    ).data as Record<string, unknown>

    const items: Array<Record<string, unknown>> = []
    for (const g of gifts) {
      const item = (
        await create('receipt_items', {
          receipt_id: String(receipt.id),
          gift_id: String(g.id),
          amount_cents: Number(g.amount_cents ?? 0),
          created_at: now,
        })
      ).data as Record<string, unknown>
      items.push(item)
      await updateById('gifts', String(g.id), { receipt_id: String(receipt.id), updated_at: now })
    }

    const donorName = String((donor.row as Record<string, unknown>).name ?? '')
    res.status(201).json({
      ...shapeReceipt(receipt, donorName),
      items: items.map((item, i) => shapeReceiptItem(item, gifts[i] as Record<string, unknown>)),
    })
  } catch (err) {
    logger.error('[receipts] generate failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get receipt details with line items — owner-only; feeds the print view.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('receipts', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('receipts.notFound', {}, { defaultValue: 'Receipt not found' }) })
      return
    }
    const receipt = check.row as Record<string, unknown>
    const donorId = String(receipt.donor_id)
    const donor = await requireOwnership('donors', donorId, userId)
    const [itemRows, giftRows] = await Promise.all([
      findMany<Record<string, unknown>>('receipt_items', {
        where: [{ field: 'receipt_id', operator: '=', value: req.params.id as string }],
        orderBy: [{ field: 'created_at', direction: 'asc' }],
        limit: 2000,
      }),
      findMany<GiftRow>('gifts', {
        where: [
          { field: 'owner_id', operator: '=', value: userId },
          { field: 'donor_id', operator: '=', value: donorId },
        ],
        limit: 2000,
      }),
    ])
    const giftMap = asMap(
      giftRows.map((g) => ({ ...g, id: String(g.id) })),
      'id',
    )
    res.json({
      ...shapeReceipt(
        receipt,
        donor.ok ? String((donor.row as Record<string, unknown>).name ?? '') : '',
      ),
      donor: donor.ok
        ? {
            id: donorId,
            name: String((donor.row as Record<string, unknown>).name ?? ''),
            email: ((donor.row as Record<string, unknown>).email as string) ?? null,
            address: ((donor.row as Record<string, unknown>).address as string) ?? null,
            is_organization: Boolean((donor.row as Record<string, unknown>).is_organization),
          }
        : null,
      items: itemRows.map((item) =>
        shapeReceiptItem(
          item as Record<string, unknown>,
          giftMap.get(String((item as Record<string, unknown>).gift_id)) ?? null,
        ),
      ),
    })
  } catch (err) {
    logger.error('[receipts] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete a receipt — un-marks its gifts (they become editable/re-receiptable),
// then removes the line items (FK cascade) and the receipt itself.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('receipts', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('receipts.notFound', {}, { defaultValue: 'Receipt not found' }) })
      return
    }
    const receiptId = req.params.id as string
    const giftRows = await findMany('gifts', {
      where: [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'receipt_id', operator: '=', value: receiptId },
      ],
      limit: 2000,
    })
    const now = new Date().toISOString()
    for (const g of giftRows) {
      await updateById('gifts', String(g.id), { receipt_id: null, updated_at: now })
    }
    await deleteById('receipts', receiptId)
    res.status(204).end()
  } catch (err) {
    logger.error('[receipts] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
