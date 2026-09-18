/**
 * Repositories handler — connected GitHub/GitLab repos.
 *
 * Routes:
 *   GET    /repositories             list owner's repos
 *   GET    /repositories/:id         single repo
 *   POST   /repositories             connect a repo
 *   PUT    /repositories/:id         update repo settings
 *   DELETE /repositories/:id         disconnect a repo
 *   GET    /repositories/stats/summary  KPI: repo counts by sync_status
 *
 * Owner-scoped via `owner_id` (G6 — IDOR-safe).
 */

import { randomUUID } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireOwnership } from '@molecule/api-bonds-default-express'
import {
  count,
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
  sync_status: z.enum(['pending', 'synced', 'error']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})

const createSchema = z.object({
  provider: z.enum(['github', 'gitlab']).optional().default('github'),
  full_name: z.string().min(1).max(200),
  provider_repo_id: z.string().max(64).optional(),
  default_branch: z.string().max(64).optional().default('main'),
  install_id: z.string().max(64).optional(),
  webhook_secret_encrypted: z.string().max(2048).optional(),
})

const updateSchema = z.object({
  default_branch: z.string().max(64).optional(),
  install_id: z.string().max(64).optional(),
  webhook_secret_encrypted: z.string().max(2048).optional(),
  sync_status: z.enum(['pending', 'synced', 'error']).optional(),
  last_sync_at: z.string().optional(),
})

router.use(authorizers.auth())

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { sync_status, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (sync_status) where.push({ field: 'sync_status', operator: '=', value: sync_status })
    const items = await findMany('repositories', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json(items)
  } catch (err) {
    logger.error('repositories.list', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/stats/summary', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const [pending, synced, errored, total] = await Promise.all([
      count('repositories', [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'sync_status', operator: '=', value: 'pending' },
      ]),
      count('repositories', [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'sync_status', operator: '=', value: 'synced' },
      ]),
      count('repositories', [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'sync_status', operator: '=', value: 'error' },
      ]),
      count('repositories', [{ field: 'owner_id', operator: '=', value: userId }]),
    ])
    res.json({ pending, synced, error: errored, total })
  } catch (err) {
    logger.error('repositories.stats', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('repositories', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('repositories.notFound', {}, { defaultValue: 'Repository not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (err) {
    logger.error('repositories.get', err)
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
    const created = await create('repositories', {
      id,
      owner_id: userId,
      user_id: userId,
      provider: body.provider,
      full_name: body.full_name,
      provider_repo_id: body.provider_repo_id ?? null,
      default_branch: body.default_branch,
      install_id: body.install_id ?? null,
      webhook_secret_encrypted: body.webhook_secret_encrypted ?? null,
      sync_status: 'pending',
    })
    res.status(201).json(created.data ?? { id })
  } catch (err) {
    logger.error('repositories.create', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('repositories', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('repositories.notFound', {}, { defaultValue: 'Repository not found' }),
      })
      return
    }
    const updated = await updateById(
      'repositories',
      req.params.id as string,
      req.body as Record<string, unknown>,
    )
    res.json(updated.data)
  } catch (err) {
    logger.error('repositories.update', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('repositories', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('repositories.notFound', {}, { defaultValue: 'Repository not found' }),
      })
      return
    }
    await deleteById('repositories', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('repositories.delete', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
