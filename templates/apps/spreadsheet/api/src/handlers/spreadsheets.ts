/**
 * Spreadsheet handlers — owner-scoped CRUD for workbooks.
 *
 * Every read/write filters by `owner_id = session.userId` so cross-user
 * IDOR attempts return 404 rather than leaking data. Spreadsheet creation
 * is gated by `enforceLimit` against `SpreadsheetLimits.maxSpreadsheets`.
 *
 * Uses the abstract DataStore from @molecule/api-database (no raw SQL).
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findMany,
  findOne,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import type { SpreadsheetLimits } from '../tiers.js'

const router = Router()

const spreadsheetCreateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  is_public: z.boolean().optional(),
  public_slug: z.string().max(120).optional(),
})

const spreadsheetUpdateSchema = spreadsheetCreateSchema.partial().extend({
  is_starred: z.boolean().optional(),
  trashed_at: z.string().nullable().optional(),
})

const idParam = z.object({ id: z.string().uuid() })

interface SpreadsheetRow {
  id: string
  owner_id: string
  title: string
  description: string | null
  is_public: boolean
  public_slug: string | null
  is_starred: boolean
  trashed_at: string | null
  created_at: string
  updated_at: string
}

interface SheetRow {
  id: string
  spreadsheet_id: string
  owner_id: string
  name: string
  position: number
  color: string | null
}

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: ownerId }]
    if (req.query.trashed === 'true') {
      where.push({ field: 'trashed_at', operator: 'is_not_null' })
    } else {
      where.push({ field: 'trashed_at', operator: 'is_null' })
    }
    const items = await findMany<SpreadsheetRow>('spreadsheets', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('spreadsheet.list', error)
    res.status(500).json({
      error: t('spreadsheet.error.list', {}, { defaultValue: 'Failed to list spreadsheets' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: id.error.issues,
    })
    return
  }
  try {
    const spreadsheet = await findOne<SpreadsheetRow>('spreadsheets', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!spreadsheet) {
      res
        .status(404)
        .json({ error: t('spreadsheet.notFound', {}, { defaultValue: 'Spreadsheet not found' }) })
      return
    }
    const sheets = await findMany<SheetRow>('sheets', {
      where: [{ field: 'spreadsheet_id', operator: '=', value: spreadsheet.id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json({ ...spreadsheet, sheets })
  } catch (error) {
    logger.error('spreadsheet.read', error)
    res.status(500).json({
      error: t('spreadsheet.error.read', {}, { defaultValue: 'Failed to read spreadsheet' }),
    })
  }
})

router.post(
  '/',
  enforceLimit<SpreadsheetLimits>({
    limitType: 'maxSpreadsheets',
    getLimit: (limits) => limits.maxSpreadsheets,
    getCurrent: async (userId) =>
      count('spreadsheets', [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'trashed_at', operator: 'is_null' },
      ]),
  }) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    const ownerId = requireUser(res)
    if (!ownerId) return
    const parsed = spreadsheetCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        issues: parsed.error.issues,
      })
      return
    }
    try {
      const result = await create<SpreadsheetRow>('spreadsheets', {
        owner_id: ownerId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        is_public: parsed.data.is_public ?? false,
        public_slug: parsed.data.public_slug ?? null,
        is_starred: false,
        trashed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      const created = result.data
      if (created) {
        // Seed a default sheet so the editor has something to render.
        await create<SheetRow>('sheets', {
          spreadsheet_id: created.id,
          owner_id: ownerId,
          name: t('sheet.defaultName', {}, { defaultValue: 'Sheet 1' }),
          position: 0,
          color: null,
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
      res.status(201).json(created)
    } catch (error) {
      logger.error('spreadsheet.create', error)
      res.status(500).json({
        error: t('spreadsheet.error.create', {}, { defaultValue: 'Failed to create spreadsheet' }),
      })
    }
  },
)

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = spreadsheetUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<SpreadsheetRow>('spreadsheets', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('spreadsheet.notFound', {}, { defaultValue: 'Spreadsheet not found' }) })
      return
    }
    const result = await updateById<SpreadsheetRow>('spreadsheets', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('spreadsheet.update', error)
    res.status(500).json({
      error: t('spreadsheet.error.update', {}, { defaultValue: 'Failed to update spreadsheet' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: id.error.issues,
    })
    return
  }
  try {
    const owned = await findOne<SpreadsheetRow>('spreadsheets', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('spreadsheet.notFound', {}, { defaultValue: 'Spreadsheet not found' }) })
      return
    }
    await deleteById('spreadsheets', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('spreadsheet.delete', error)
    res.status(500).json({
      error: t('spreadsheet.error.delete', {}, { defaultValue: 'Failed to delete spreadsheet' }),
    })
  }
})

export default router
