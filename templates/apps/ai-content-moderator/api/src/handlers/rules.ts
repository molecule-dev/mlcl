/**
 * Moderation rules handler.
 *
 * Routes:
 *   GET    /rules           list owner's rules
 *   GET    /rules/:id       single rule
 *   POST   /rules           create rule
 *   PUT    /rules/:id       update rule
 *   DELETE /rules/:id       delete rule
 *
 * Rules are owner-scoped (G6 — IDOR-safe).
 */

import { randomUUID } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireOwnership } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

const listQuerySchema = z.object({
  enabled: z.coerce.boolean().optional(),
})

const createRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  kind: z.enum(['regex', 'embedding', 'classifier_threshold']),
  pattern_or_threshold: z.string().min(1).max(2000),
  action: z.enum(['auto_approve', 'queue', 'auto_reject', 'escalate']),
  enabled: z.boolean().optional().default(true),
  language_scope: z.string().max(8).optional(),
})

const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  kind: z.enum(['regex', 'embedding', 'classifier_threshold']).optional(),
  pattern_or_threshold: z.string().min(1).max(2000).optional(),
  action: z.enum(['auto_approve', 'queue', 'auto_reject', 'escalate']).optional(),
  enabled: z.boolean().optional(),
  language_scope: z.string().max(8).optional(),
})

router.use(authorizers.auth())

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { enabled } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (enabled !== undefined) {
      where.push({ field: 'enabled', operator: '=', value: enabled })
    }
    const rules = await findMany('moderation_rules', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    })
    res.json(rules)
  } catch (error) {
    logger.error('rules.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('moderation_rules', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('rules.notFound', {}, { defaultValue: 'Rule not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (error) {
    logger.error('rules.getById', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createRuleSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof createRuleSchema>

    const id = randomUUID()
    const created = await create('moderation_rules', {
      id,
      owner_id: userId,
      user_id: userId,
      name: body.name,
      description: body.description ?? null,
      kind: body.kind,
      pattern_or_threshold: body.pattern_or_threshold,
      action: body.action,
      enabled: body.enabled,
      language_scope: body.language_scope ?? null,
    })

    res.status(201).json(created.data ?? { id })
  } catch (error) {
    logger.error('rules.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateRuleSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('moderation_rules', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('rules.notFound', {}, { defaultValue: 'Rule not found' }),
      })
      return
    }
    const updated = await updateById(
      'moderation_rules',
      req.params.id as string,
      req.body as Record<string, unknown>,
    )
    res.json(updated.data)
  } catch (error) {
    logger.error('rules.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('moderation_rules', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('rules.notFound', {}, { defaultValue: 'Rule not found' }),
      })
      return
    }
    await deleteById('moderation_rules', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('rules.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
