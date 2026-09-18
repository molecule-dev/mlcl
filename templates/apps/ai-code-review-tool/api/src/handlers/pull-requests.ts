/**
 * Pull-requests handler — shadow rows of remote PRs.
 *
 * Routes:
 *   GET    /pull-requests                          list owner's PRs
 *   GET    /pull-requests/:id                      single PR
 *   POST   /pull-requests                          create / upsert PR row (manual or webhook)
 *   PUT    /pull-requests/:id                      update PR (state transitions)
 *   DELETE /pull-requests/:id                      remove PR shadow
 *   GET    /pull-requests/by-repo/:repository_id   list PRs for a repo (must own repo)
 *
 * Owner-scoped via `owner_id` (G6 — IDOR-safe).
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
  state: z.enum(['open', 'closed', 'merged']).optional(),
  repository_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})

const createSchema = z.object({
  repository_id: z.string().uuid(),
  provider_pr_number: z.number().int().min(0),
  title: z.string().min(1).max(500),
  author_login: z.string().max(100).optional(),
  base_ref: z.string().max(200).optional(),
  head_ref: z.string().max(200).optional(),
  state: z.enum(['open', 'closed', 'merged']).optional().default('open'),
  additions: z.number().int().min(0).optional().default(0),
  deletions: z.number().int().min(0).optional().default(0),
})

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  state: z.enum(['open', 'closed', 'merged']).optional(),
  closed_at: z.string().optional(),
  additions: z.number().int().min(0).optional(),
  deletions: z.number().int().min(0).optional(),
})

router.use(authorizers.auth())

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { state, repository_id, page, limit } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (state) where.push({ field: 'state', operator: '=', value: state })
    if (repository_id) where.push({ field: 'repository_id', operator: '=', value: repository_id })
    const items = await findMany('pull_requests', {
      where,
      orderBy: [{ field: 'opened_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json(items)
  } catch (err) {
    logger.error('pull_requests.list', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('pull_requests', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('pullRequests.notFound', {}, { defaultValue: 'Pull request not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (err) {
    logger.error('pull_requests.get', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof createSchema>
    // Ownership check on the parent repository — non-owner cannot create
    // a PR row attached to a repo they don't own.
    const repoCheck = await requireOwnership('repositories', body.repository_id, userId)
    if (!repoCheck.ok) {
      res.status(repoCheck.status).json({
        error: t('repositories.notFound', {}, { defaultValue: 'Repository not found' }),
      })
      return
    }
    const id = randomUUID()
    const created = await create('pull_requests', {
      id,
      owner_id: userId,
      user_id: userId,
      repository_id: body.repository_id,
      provider_pr_number: body.provider_pr_number,
      title: body.title,
      author_login: body.author_login ?? null,
      base_ref: body.base_ref ?? null,
      head_ref: body.head_ref ?? null,
      state: body.state,
      opened_at: new Date().toISOString(),
      additions: body.additions,
      deletions: body.deletions,
    })
    res.status(201).json(created.data ?? { id })
  } catch (err) {
    logger.error('pull_requests.create', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('pull_requests', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('pullRequests.notFound', {}, { defaultValue: 'Pull request not found' }),
      })
      return
    }
    const updated = await updateById(
      'pull_requests',
      req.params.id as string,
      req.body as Record<string, unknown>,
    )
    res.json(updated.data)
  } catch (err) {
    logger.error('pull_requests.update', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('pull_requests', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('pullRequests.notFound', {}, { defaultValue: 'Pull request not found' }),
      })
      return
    }
    await deleteById('pull_requests', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('pull_requests.delete', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
