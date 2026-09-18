/**
 * Custom-rules handler — user-authored review rules.
 *
 * Routes:
 *   GET    /custom-rules           list owner's rules
 *   GET    /custom-rules/:id       single rule
 *   POST   /custom-rules           create rule
 *   PUT    /custom-rules/:id       update rule
 *   DELETE /custom-rules/:id       delete rule
 *
 * Owner-scoped via `owner_id` (G6 — IDOR-safe).
 *
 * Validation: regex patterns are smoke-tested via `new RegExp(pattern)` so
 * `RulesEditor.tsx` invalid-regex form errors surface as 400 from this
 * endpoint (INVENTORY user flow 10).
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

const validRegex = (pattern: string): boolean => {
  try {
    new RegExp(pattern)
    return true
  } catch (_error) {
    // SyntaxError from invalid regex is the expected signal; return false to fail zod refinement
    return false
  }
}

const listQuerySchema = z.object({
  enabled: z.coerce.boolean().optional(),
  language: z.string().max(32).optional(),
})

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  language: z.string().max(32).optional().default('any'),
  pattern: z
    .string()
    .min(1)
    .max(2000)
    .refine(validRegex, { message: 'Invalid regular expression' }),
  severity: z.enum(['high', 'med', 'low', 'info', 'warning']).optional().default('warning'),
  enabled: z.boolean().optional().default(true),
})

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  language: z.string().max(32).optional(),
  pattern: z
    .string()
    .min(1)
    .max(2000)
    .refine(validRegex, { message: 'Invalid regular expression' })
    .optional(),
  severity: z.enum(['high', 'med', 'low', 'info', 'warning']).optional(),
  enabled: z.boolean().optional(),
})

router.use(authorizers.auth())

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { enabled, language } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (enabled !== undefined) where.push({ field: 'enabled', operator: '=', value: enabled })
    if (language) where.push({ field: 'language', operator: '=', value: language })
    const rules = await findMany('custom_rules', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    })
    res.json(rules)
  } catch (err) {
    logger.error('custom_rules.list', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('custom_rules', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('rules.notFound', {}, { defaultValue: 'Rule not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (err) {
    logger.error('custom_rules.get', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof createSchema>
    const id = randomUUID()
    const created = await create('custom_rules', {
      id,
      owner_id: userId,
      user_id: userId,
      name: body.name,
      description: body.description ?? null,
      language: body.language,
      pattern: body.pattern,
      severity: body.severity,
      enabled: body.enabled,
    })
    res.status(201).json(created.data ?? { id })
  } catch (err) {
    logger.error('custom_rules.create', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('custom_rules', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('rules.notFound', {}, { defaultValue: 'Rule not found' }),
      })
      return
    }
    const updated = await updateById(
      'custom_rules',
      req.params.id as string,
      req.body as Record<string, unknown>,
    )
    res.json(updated.data)
  } catch (err) {
    logger.error('custom_rules.update', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('custom_rules', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('rules.notFound', {}, { defaultValue: 'Rule not found' }),
      })
      return
    }
    await deleteById('custom_rules', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('custom_rules.delete', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
