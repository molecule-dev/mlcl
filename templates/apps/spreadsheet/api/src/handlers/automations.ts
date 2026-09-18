/**
 * Automation handlers — owner-scoped CRUD for the rules engine attached
 * to a workbook.
 *
 * v1 ships Mailgun-as-action and Webhook-as-action only; richer
 * connectors (Slack / Drive / Notion / etc.) are tracked as
 * propose-new bonds in `docs/flagship-rollout/SHARED-FEATURES.md`.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

// `trigger` carries an event identifier — accept either `{ type }` (legacy
// shape) or `{ event }` (INVENTORY shape). Extra keys (`filter`, `config`,
// etc.) are passed through verbatim to the action runtime.
const triggerSchema = z
  .looseObject({
    type: z.string().min(1).optional(),
    event: z.string().min(1).optional(),
  })
  .refine((t) => Boolean(t.type ?? t.event), {
    message: 'trigger.type or trigger.event is required',
  })

// Accept the v1-supported actions only — Mailgun (email) and Webhook.
// Drive / Slack / Notion / etc. live behind the still-pending integration
// bond and are surfaced as `BLOCKED:` in the corresponding e2e specs.
const actionKindEnum = z.enum(['mailgun', 'email', 'webhook', 'noop'])
const actionSchema = z
  .looseObject({
    type: actionKindEnum.optional(),
    kind: actionKindEnum.optional(),
  })
  .refine((a) => Boolean(a.type ?? a.kind), {
    message: 'action.type or action.kind is required and must be email|webhook|noop',
  })

const automationCreateSchema = z.object({
  spreadsheet_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  trigger: triggerSchema,
  action: actionSchema,
  is_active: z.boolean().optional(),
  enabled: z.boolean().optional(),
})

const automationUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  trigger: triggerSchema.optional(),
  action: actionSchema.optional(),
  is_active: z.boolean().optional(),
  enabled: z.boolean().optional(),
})

const idParam = z.object({ id: z.string().uuid() })

interface AutomationRow {
  id: string
  spreadsheet_id: string
  owner_id: string
  name: string
  trigger: Record<string, unknown>
  action: Record<string, unknown>
  is_active: boolean
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
    const items = await findMany<AutomationRow>('automations', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('automation.list', error)
    res.status(500).json({
      error: t('automation.error.list', {}, { defaultValue: 'Failed to list automations' }),
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
    const row = await findOne<AutomationRow>('automations', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!row) {
      res
        .status(404)
        .json({ error: t('automation.notFound', {}, { defaultValue: 'Automation not found' }) })
      return
    }
    res.json(row)
  } catch (error) {
    logger.error('automation.read', error)
    res.status(500).json({
      error: t('automation.error.read', {}, { defaultValue: 'Failed to read automation' }),
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = automationCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
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
    const result = await create<AutomationRow>('automations', {
      spreadsheet_id: parsed.data.spreadsheet_id,
      owner_id: ownerId,
      name: parsed.data.name,
      trigger: parsed.data.trigger,
      action: parsed.data.action,
      is_active: parsed.data.is_active ?? parsed.data.enabled ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('automation.create', error)
    res.status(500).json({
      error: t('automation.error.create', {}, { defaultValue: 'Failed to create automation' }),
    })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = automationUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<AutomationRow>('automations', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('automation.notFound', {}, { defaultValue: 'Automation not found' }) })
      return
    }
    const { enabled, ...rest } = body.data
    const result = await updateById<AutomationRow>('automations', id.data.id, {
      ...rest,
      ...(enabled !== undefined && body.data.is_active === undefined ? { is_active: enabled } : {}),
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('automation.update', error)
    res.status(500).json({
      error: t('automation.error.update', {}, { defaultValue: 'Failed to update automation' }),
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
    const owned = await findOne<AutomationRow>('automations', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('automation.notFound', {}, { defaultValue: 'Automation not found' }) })
      return
    }
    await deleteById('automations', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('automation.delete', error)
    res.status(500).json({
      error: t('automation.error.delete', {}, { defaultValue: 'Failed to delete automation' }),
    })
  }
})

export default router
