/**
 * Settings handler — workspace-level settings (org name, region, retention)
 * + integrations (slack/pagerduty/etc connection state).
 *
 * Each authenticated user owns exactly one org_settings row (lazy-created
 * on first GET). Integrations are an array of rows, all user-scoped.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  deleteMany,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const settingsSchema = z.object({
  org_name: z.string().min(1).max(255).optional(),
  region: z.string().min(1).max(64).optional(),
  retention_days: z.number().int().min(1).max(3650).optional(),
})

const integrationSchema = z.object({
  name: z.string().min(1).max(255),
  detail: z.string().max(1024).optional(),
  connected: z.boolean().optional(),
})

const integrationUpdateSchema = z.object({
  detail: z.string().max(1024).optional(),
  connected: z.boolean().optional(),
})

const ensureSettings = async (userId: string): Promise<Record<string, unknown>> => {
  const existing = await findOne<Record<string, unknown>>('org_settings', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing) return existing
  const created = await create<Record<string, unknown>>('org_settings', {
    user_id: userId,
    org_name: '',
    region: 'us-east-1',
    retention_days: 30,
    created_at: new Date(),
    updated_at: new Date(),
  })
  return (
    created.data ?? {
      user_id: userId,
      org_name: '',
      region: 'us-east-1',
      retention_days: 30,
    }
  )
}

router.get('/me', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const settings = await ensureSettings(userId)
  const integrations = await findMany('org_integrations', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 100,
  })
  res.json({ ...settings, integrations })
})

router.patch('/me', validateBody(settingsSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const settings = await ensureSettings(userId)
  const result = await updateById('org_settings', String(settings.id), {
    ...(req.body as Record<string, unknown>),
    updated_at: new Date(),
  })
  res.json(result.data)
})

router.post(
  '/integrations',
  validateBody(integrationSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const body = req.body as z.infer<typeof integrationSchema>
    const result = await create('org_integrations', {
      user_id: userId,
      name: body.name,
      detail: body.detail ?? '',
      connected: body.connected ?? false,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.put(
  '/integrations/:id',
  validateBody(integrationUpdateSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const integration = await findById<Record<string, unknown>>('org_integrations', id)
    if (!integration || integration.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('integrations.notFound', {}, { defaultValue: 'Integration not found' }) })
    }
    const result = await updateById('org_integrations', id, req.body as Record<string, unknown>)
    res.json(result.data)
  },
)

router.delete('/integrations/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const integration = await findById<Record<string, unknown>>('org_integrations', id)
  if (!integration || integration.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('integrations.notFound', {}, { defaultValue: 'Integration not found' }) })
  }
  await deleteById('org_integrations', id)
  res.status(204).end()
})

// ---------------------------------------------------------------------------
// Workspace delete (danger zone)
// ---------------------------------------------------------------------------
//
// Wipes every user-scoped row in the workspace tables (issues, error_events,
// alert rules, releases, notifications, team members/invites, integrations,
// projects, transactions, profile-extension data) but keeps the user
// account itself so the user can re-onboard. Idempotent: subsequent calls
// no-op once the rows are gone. The next GET /api/issues will re-seed
// fresh demo data via `seedDemoForUser`.
const USER_SCOPED_TABLES_BY_USER_ID = [
  'alert_rules',
  'alert_triggers',
  'app_transactions',
  'error_events',
  'issues',
  'releases',
  'notifications',
  'team_members',
  'team_invites',
  'org_integrations',
  'org_settings',
  'user_api_keys',
  'connected_accounts',
] as const

router.delete('/workspace', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  // Order matters loosely (children before parents) but every table here
  // is scoped on user_id directly so they can be torn down in any order.
  const summary: Record<string, number> = {}
  for (const table of USER_SCOPED_TABLES_BY_USER_ID) {
    const before = await count(table, [{ field: 'user_id', operator: '=', value: userId }])
    if (before > 0) {
      await deleteMany(table, [{ field: 'user_id', operator: '=', value: userId }])
    }
    summary[table] = before
  }
  // projects.userId is camelCase per the resource bond's columnCase.
  const projectsBefore = await count('projects', [
    { field: 'userId', operator: '=', value: userId },
  ])
  if (projectsBefore > 0) {
    await deleteMany('projects', [{ field: 'userId', operator: '=', value: userId }])
  }
  summary.projects = projectsBefore
  res.json({ deleted: summary })
})

export default router
