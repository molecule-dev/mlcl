/**
 * Repositories handler — connected GitHub/GitLab repos. Owner-scoped by
 * `user_id`; the `(user_id, slug)` index makes a duplicate connection
 * attempt fail at the DB layer.
 *
 * `GET /` and `GET /:slug` return decorated rows (via decorators.ts) with
 * `last_build_status`, `last_build_at`, `recent_build_durations`, plus
 * (for `:slug`) `config_yml`, `webhooks`, `stats`, `branches`, and
 * `recent_pipelines` so the Repositories list and RepositoryDetail page
 * render without any client-side stitching. List responses lazily seed
 * demo data on first hit.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'
import { listDecoratedRepositories, readDecoratedRepository } from './decorators.js'

const router = Router()

const getParam = (req: Request, name: string): string => {
  const v = req.params[name]
  return Array.isArray(v) ? v[0] : (v ?? '')
}

const listQuerySchema = z.object({
  project_id: z.string().optional(),
  provider: z.enum(['github', 'gitlab']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const createSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  language: z.string().optional(),
  default_branch: z.string().optional(),
  provider: z.enum(['github', 'gitlab']).optional(),
  is_public: z.boolean().optional(),
  config_yml: z.string().optional(),
  project_id: z.string().optional(),
})

const updateSchema = createSchema.partial().extend({
  config_yml: z.string().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    await seedDemoForUser(userId).catch((err) => logger.warn(err))
    const repos = await listDecoratedRepositories(userId, {
      project_id: req.query.project_id as string | undefined,
      provider: req.query.provider as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    })
    res.json(repos)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const slug = getParam(req, 'slug')
    const repo = await readDecoratedRepository(userId, slug)
    if (!repo) {
      return res
        .status(404)
        .json({ error: t('repositories.notFound', {}, { defaultValue: 'Repository not found' }) })
    }
    res.json(repo)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const body = req.body as z.infer<typeof createSchema>
    const result = await create('repositories', {
      user_id: userId,
      slug: body.slug,
      name: body.name,
      description: body.description ?? null,
      language: body.language ?? null,
      default_branch: body.default_branch ?? 'main',
      provider: body.provider ?? 'github',
      is_public: body.is_public ?? false,
      config_yml: body.config_yml ?? '',
      webhooks: JSON.stringify([]),
      stats: {},
      project_id: body.project_id ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data ?? result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = getParam(req, 'id')
    const repo = await findById<Record<string, unknown>>('repositories', id)
    if (!repo || repo.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('repositories.notFound', {}, { defaultValue: 'Repository not found' }) })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    for (const k of [
      'slug',
      'name',
      'description',
      'language',
      'default_branch',
      'provider',
      'is_public',
      'config_yml',
      'project_id',
    ] as const) {
      if (body[k] !== undefined) updates[k] = body[k]
    }
    const result = await updateById('repositories', id, updates)
    res.json(result.data ?? result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = getParam(req, 'id')
    const repo = await findById<Record<string, unknown>>('repositories', id)
    if (!repo || repo.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('repositories.notFound', {}, { defaultValue: 'Repository not found' }) })
    }
    await deleteById('repositories', id)
    res.status(204).end()
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
