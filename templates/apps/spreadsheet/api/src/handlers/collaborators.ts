/**
 * Collaborator handlers — owner-scoped CRUD for the per-spreadsheet
 * Team page. Roles: viewer | editor; only the owner may
 * invite/remove. (User role escalation paths beyond viewer/editor are
 * tracked for v2 — `@molecule/api-resource-share` proposal.)
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const ROLES = ['viewer', 'editor'] as const

const collaboratorCreateSchema = z.object({
  spreadsheet_id: z.string().uuid(),
  user_id: z.string().uuid().nullable().optional(),
  email: z.string().email().nullable().optional(),
  role: z.enum(ROLES).optional(),
})

const collaboratorUpdateSchema = z.object({
  role: z.enum(ROLES).optional(),
  accepted_at: z.string().nullable().optional(),
})

const idParam = z.object({ id: z.string().uuid() })

interface CollaboratorRow {
  id: string
  spreadsheet_id: string
  owner_id: string
  user_id: string | null
  email: string | null
  role: string
  invited_by: string | null
  accepted_at: string | null
}

interface SpreadsheetRow {
  id: string
  owner_id: string
}

async function ownsSpreadsheet(ownerId: string, spreadsheetId: string): Promise<boolean> {
  const ws = await findOne<SpreadsheetRow>('spreadsheets', [
    { field: 'id', operator: '=', value: spreadsheetId },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
  return ws !== null
}

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const where = [{ field: 'owner_id', operator: '=', value: ownerId }] as Array<{
      field: string
      operator: '='
      value: unknown
    }>
    if (typeof req.query.spreadsheet_id === 'string') {
      if (!(await ownsSpreadsheet(ownerId, req.query.spreadsheet_id))) {
        res.json([])
        return
      }
      where.push({ field: 'spreadsheet_id', operator: '=', value: req.query.spreadsheet_id })
    }
    const items = await findMany<CollaboratorRow>('spreadsheet_collaborators', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('collaborator.list', error)
    res.status(500).json({
      error: t('collaborator.error.list', {}, { defaultValue: 'Failed to list collaborators' }),
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = collaboratorCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  if (!parsed.data.user_id && !parsed.data.email) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'user_id or email required' }),
    })
    return
  }
  if (!(await ownsSpreadsheet(ownerId, parsed.data.spreadsheet_id))) {
    res
      .status(404)
      .json({ error: t('spreadsheet.notFound', {}, { defaultValue: 'Spreadsheet not found' }) })
    return
  }
  try {
    const result = await create<CollaboratorRow>('spreadsheet_collaborators', {
      spreadsheet_id: parsed.data.spreadsheet_id,
      owner_id: ownerId,
      user_id: parsed.data.user_id ?? null,
      email: parsed.data.email ?? null,
      role: parsed.data.role ?? 'viewer',
      invited_by: ownerId,
      accepted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('collaborator.create', error)
    res.status(500).json({
      error: t('collaborator.error.create', {}, { defaultValue: 'Failed to invite collaborator' }),
    })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = collaboratorUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<CollaboratorRow>('spreadsheet_collaborators', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('collaborator.notFound', {}, { defaultValue: 'Collaborator not found' }) })
      return
    }
    const result = await updateById<CollaboratorRow>('spreadsheet_collaborators', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('collaborator.update', error)
    res.status(500).json({
      error: t('collaborator.error.update', {}, { defaultValue: 'Failed to update collaborator' }),
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
    const owned = await findOne<CollaboratorRow>('spreadsheet_collaborators', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('collaborator.notFound', {}, { defaultValue: 'Collaborator not found' }) })
      return
    }
    await deleteById('spreadsheet_collaborators', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('collaborator.delete', error)
    res.status(500).json({
      error: t('collaborator.error.delete', {}, { defaultValue: 'Failed to remove collaborator' }),
    })
  }
})

export default router
