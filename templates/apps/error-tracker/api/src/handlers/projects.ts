/**
 * Projects handler — user-owned `projects` rows (the workspace's tracked
 * repositories). Validation via zod + `@molecule/api-middleware-validation`,
 * authorization scopes by `userId` (camelCase per the resource bond's
 * column case) to prevent IDOR.
 *
 * Companion to `projects-health.ts`, which derives aggregated stats
 * (issue counts, recent events, latest release) per project; this
 * handler is the canonical CRUD surface for the underlying rows.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const projectTypeSchema = z.enum(['app', 'api', 'service', 'mobile', 'web'])

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  projectType: projectTypeSchema.optional(),
  framework: z.string().max(255).nullish(),
})

const updateProjectSchema = createProjectSchema.partial()

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200) || 'project'

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const projects = await findMany('projects', {
    where: [{ field: 'userId', operator: '=', value: userId }],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit: 200,
  })
  res.json(projects)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const project = await findById<Record<string, unknown>>('projects', id)
  if (!project || project.userId !== userId) {
    return res
      .status(404)
      .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
  }
  res.json(project)
})

router.post('/', validateBody(createProjectSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const body = req.body as z.infer<typeof createProjectSchema>
  // Slugs are globally unique per the migration's projects_slug_key
  // constraint, so suffix with a slice of the user id + a short
  // timestamp tail to guarantee per-user create-many works.
  const base = body.slug ?? slugify(body.name)
  const slug = `${base}-${userId.slice(0, 8)}-${Date.now().toString(36).slice(-4)}`

  const result = await create('projects', {
    userId,
    name: body.name,
    slug,
    projectType: body.projectType ?? 'app',
    framework: body.framework ?? null,
    packages: JSON.stringify([]),
    envVars: JSON.stringify({}),
    settings: JSON.stringify({}),
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  res.status(201).json(result.data)
})

router.put('/:id', validateBody(updateProjectSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('projects', id)
  if (!existing || existing.userId !== userId) {
    return res
      .status(404)
      .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
  }

  const body = req.body as z.infer<typeof updateProjectSchema>
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name
  if (body.slug !== undefined) updates.slug = body.slug
  if (body.projectType !== undefined) updates.projectType = body.projectType
  if (body.framework !== undefined) updates.framework = body.framework
  const result = await updateById('projects', id, updates)
  res.json(result.data)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('projects', id)
  if (!existing || existing.userId !== userId) {
    return res
      .status(404)
      .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
  }
  await deleteById('projects', id)
  res.status(204).end()
})

export default router
