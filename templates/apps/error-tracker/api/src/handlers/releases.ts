/**
 * Releases handler — versioned deployment markers used for regression
 * detection. Validation via zod + `@molecule/api-middleware-validation`,
 * authorization scopes by `user_id` to prevent IDOR.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  project_id: z.string().optional(),
  environment: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const createReleaseSchema = z.object({
  project_id: z.string().min(1),
  version: z.string().min(1),
  environment: z.string().optional(),
  author: z.string().optional(),
  commits: z.array(z.unknown()).optional(),
  commit_sha: z.string().optional(),
  deploy_url: z.string().optional(),
})

const updateReleaseSchema = createReleaseSchema.partial()

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  await seedDemoForUser(userId)
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (req.query.project_id) {
    where.push({ field: 'project_id', operator: '=', value: String(req.query.project_id) })
  }
  if (req.query.environment) {
    where.push({ field: 'environment', operator: '=', value: String(req.query.environment) })
  }
  const limit = req.query.limit ? Number(req.query.limit) : 100
  const releases = await findMany('releases', {
    where,
    orderBy: [{ field: 'deployed_at', direction: 'desc' }],
    limit,
  })
  res.json(releases)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  // Allow lookup by id OR by version slug — the ReleaseDetail page route
  // is `/releases/:version` and the server should accept both.
  const isUuid = /^[0-9a-f-]{32,}$/i.test(id)
  const release: Record<string, unknown> | null = isUuid
    ? await findById<Record<string, unknown>>('releases', id)
    : ((
        await findMany<Record<string, unknown>>('releases', {
          where: [
            { field: 'user_id', operator: '=', value: userId },
            { field: 'version', operator: '=', value: id },
          ],
          orderBy: [{ field: 'deployed_at', direction: 'desc' }],
          limit: 1,
        })
      )[0] ?? null)
  if (!release || release.user_id !== userId) {
    return res.status(404).json({ error: t('releases.notFound') })
  }
  const events = await findMany('error_events', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'release', operator: '=', value: String(release.version) },
    ],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 20,
  })
  res.json({ ...release, recent_errors: events })
})

router.post('/', validateBody(createReleaseSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const body = req.body as z.infer<typeof createReleaseSchema>
  const result = await create('releases', {
    user_id: userId,
    project_id: body.project_id,
    version: body.version,
    environment: body.environment ?? 'production',
    author: body.author ?? null,
    commits: JSON.stringify(body.commits ?? []),
    commit_sha: body.commit_sha ?? null,
    deploy_url: body.deploy_url ?? null,
    deployed_at: new Date(),
    created_at: new Date(),
  })
  res.status(201).json(result.data)
})

router.put('/:id', validateBody(updateReleaseSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('releases', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({ error: t('releases.notFound') })
  }
  const body = req.body as z.infer<typeof updateReleaseSchema>
  const updates: Record<string, unknown> = {}
  for (const k of ['version', 'environment', 'author', 'commit_sha', 'deploy_url'] as const) {
    if (body[k] !== undefined) updates[k] = body[k]
  }
  if (body.commits !== undefined) updates.commits = JSON.stringify(body.commits)
  const result = await updateById('releases', id, updates)
  res.json(result.data)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('releases', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({ error: t('releases.notFound') })
  }
  await deleteById('releases', id)
  res.status(204).end()
})

export default router
