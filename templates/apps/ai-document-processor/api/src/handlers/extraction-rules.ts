/**
 * Filing-rules CRUD.
 *
 * The Rules page (`app/src/pages/Rules.tsx`) speaks `matchedType` /
 * `conditions` / `destination` / `matched_count_30d`, but the DB
 * schema (see `migrations/0010_*`) stores `doc_class`, a free-form
 * `condition_json`, an `action` enum, and a `action_args_json` blob.
 *
 * `serializeRule()` adapts in both directions — accepts whatever the
 * front-end sends and presents the persisted row in the page's
 * vocabulary. The 30-day match counter is computed on read by joining
 * against `documents` rows the user has seen.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const ALLOWED_ACTIONS = ['assign_tag', 'move_to_folder', 'notify', 'route_to_user'] as const
const ALLOWED_DOC_CLASSES = [
  'invoice',
  'receipt',
  'contract',
  'form',
  'report',
  'identification',
  'letter',
  'other',
] as const

const createRuleSchema = z.object({
  name: z.string().min(1),
  doc_class: z.string().optional(),
  matchedType: z.string().optional(),
  destination: z.string().optional(),
  condition: z.record(z.string(), z.unknown()).optional(),
  action: z.enum(ALLOWED_ACTIONS).optional(),
  action_args: z.record(z.string(), z.unknown()).optional(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
})

const updateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  doc_class: z.string().optional(),
  matchedType: z.string().optional(),
  destination: z.string().optional(),
  condition: z.record(z.string(), z.unknown()).optional(),
  action: z.enum(ALLOWED_ACTIONS).optional(),
  action_args: z.record(z.string(), z.unknown()).optional(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
})

interface SerializedRule {
  id: unknown
  name: unknown
  matchedType: string
  doc_class: string
  conditions: string[]
  action: string
  destination: string
  enabled: boolean
  priority: number
  matched_count_30d: number
  created_at: unknown
}

const parseJson = (raw: unknown): Record<string, unknown> => {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw)
      return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
    } catch (_error) {
      // Invalid JSON stored in DB; fall back to empty object
      return {}
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>
  return {}
}

const ACTION_LABEL: Record<string, string> = {
  assign_tag: 'Tag',
  move_to_folder: 'File to',
  notify: 'Notify',
  route_to_user: 'Route to',
}

function serializeRule(
  row: Record<string, unknown>,
  recentDocCounts: Map<string, number>,
): SerializedRule {
  const docClass = String(row.doc_class ?? 'other')
  const cond = parseJson(row.condition_json)
  const args = parseJson(row.action_args_json)
  const action = String(row.action ?? 'move_to_folder')

  const conditions: string[] = [`classification = ${docClass}`]
  for (const [k, v] of Object.entries(cond)) {
    if (k === 'doc_class') continue
    conditions.push(`${k} ${typeof v === 'string' ? `= ${v}` : `: ${JSON.stringify(v)}`}`)
  }

  let destination = ''
  if (typeof args.destination === 'string') destination = args.destination
  else if (typeof args.folder === 'string') destination = args.folder
  else if (typeof args.tag === 'string') destination = args.tag
  else if (typeof args.channel === 'string') destination = args.channel

  return {
    id: row.id,
    name: row.name,
    matchedType: docClass,
    doc_class: docClass,
    conditions,
    action: ACTION_LABEL[action] ?? action,
    destination,
    enabled: Boolean(row.enabled),
    priority: Number(row.priority ?? 0),
    matched_count_30d: recentDocCounts.get(docClass) ?? 0,
    created_at: row.created_at,
  }
}

async function buildRecentCounts(userId: string): Promise<Map<string, number>> {
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const docs = (await findMany('documents', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'uploaded_at', operator: '>=', value: since },
    ],
  })) as Record<string, unknown>[]
  const counts = new Map<string, number>()
  for (const d of docs) {
    const k = String(d.doc_class ?? 'other')
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return counts
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const rules = (await findMany('extraction_rules', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'priority', direction: 'desc' }],
    })) as Record<string, unknown>[]
    const counts = await buildRecentCounts(userId)
    res.json(rules.map((r) => serializeRule(r, counts)))
  } catch (error) {
    logger.error('extraction-rules.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }
  try {
    const id = getParamId(req)
    const rule = await findById<Record<string, unknown>>('extraction_rules', id)
    if (!rule || rule.user_id !== userId) {
      res.status(404).json({
        error: t('rules.notFound', undefined, { defaultValue: 'Rule not found.' }),
      })
      return
    }
    const counts = await buildRecentCounts(userId)
    res.json(serializeRule(rule, counts))
  } catch (error) {
    logger.error('extraction-rules.read', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

const normalizeDocClass = (raw: string | undefined): string => {
  const v = String(raw ?? 'other').toLowerCase()
  return (ALLOWED_DOC_CLASSES as readonly string[]).includes(v) ? v : 'other'
}

router.post('/', validateBody(createRuleSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const body = req.body as z.infer<typeof createRuleSchema>
    const docClass = normalizeDocClass(body.doc_class ?? body.matchedType)
    const action = body.action ?? 'move_to_folder'
    const condition = body.condition ?? { doc_class: docClass }
    const action_args = body.action_args ?? {}
    if (body.destination) (action_args as Record<string, unknown>).destination = body.destination

    const result = await create('extraction_rules', {
      user_id: userId,
      name: body.name,
      doc_class: docClass,
      condition_json: JSON.stringify(condition),
      action,
      action_args_json: JSON.stringify(action_args),
      priority: body.priority ?? 0,
      enabled: body.enabled ?? true,
      created_at: new Date(),
    })
    const created = ((result as { data?: Record<string, unknown> }).data ?? result) as Record<
      string,
      unknown
    >
    const counts = await buildRecentCounts(userId)
    res.status(201).json(serializeRule(created, counts))
  } catch (error) {
    logger.error('extraction-rules.create', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

const applyUpdate = async (
  id: string,
  body: z.infer<typeof updateRuleSchema>,
  existing: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.doc_class !== undefined || body.matchedType !== undefined) {
    updates.doc_class = normalizeDocClass(body.doc_class ?? body.matchedType)
  }
  if (body.condition !== undefined) updates.condition_json = JSON.stringify(body.condition)
  if (body.action !== undefined) updates.action = body.action
  if (body.action_args !== undefined || body.destination !== undefined) {
    const args = (body.action_args ?? parseJson(existing.action_args_json) ?? {}) as Record<
      string,
      unknown
    >
    if (body.destination !== undefined) args.destination = body.destination
    updates.action_args_json = JSON.stringify(args)
  }
  if (body.priority !== undefined) updates.priority = body.priority
  if (body.enabled !== undefined) updates.enabled = body.enabled
  const result = await updateById('extraction_rules', id, updates)
  return ((result as { data?: Record<string, unknown> }).data ?? result) as Record<string, unknown>
}

router.put('/:id', validateBody(updateRuleSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('extraction_rules', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('rules.notFound', undefined, { defaultValue: 'Rule not found.' }),
      })
      return
    }
    const updated = await applyUpdate(id, req.body as z.infer<typeof updateRuleSchema>, existing)
    const counts = await buildRecentCounts(userId)
    res.json(serializeRule(updated, counts))
  } catch (error) {
    logger.error('extraction-rules.update', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.patch('/:id', validateBody(updateRuleSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }
  try {
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('extraction_rules', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('rules.notFound', undefined, { defaultValue: 'Rule not found.' }),
      })
      return
    }
    const updated = await applyUpdate(id, req.body as z.infer<typeof updateRuleSchema>, existing)
    const counts = await buildRecentCounts(userId)
    res.json(serializeRule(updated, counts))
  } catch (error) {
    logger.error('extraction-rules.patch', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }
  try {
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('extraction_rules', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('rules.notFound', undefined, { defaultValue: 'Rule not found.' }),
      })
      return
    }
    await deleteById('extraction_rules', id)
    res.status(204).end()
  } catch (error) {
    logger.error('extraction-rules.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
