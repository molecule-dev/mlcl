import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface Integration {
  id: string
  name: string
  status: 'connected' | 'not_connected'
}

interface UserRow {
  oauthData?: Record<string, unknown> | null
}

const CATALOG: Array<{ id: string; name: string }> = [
  { id: 'github', name: 'GitHub' },
  { id: 'slack', name: 'Slack' },
  { id: 'pagerduty', name: 'PagerDuty' },
  { id: 'datadog', name: 'Datadog' },
]

async function readConnectedIds(userId: string): Promise<Set<string>> {
  const user = await findById<UserRow>('users', userId)
  const oauth = (user?.oauthData as Record<string, unknown> | null) ?? {}
  const raw = oauth.integrations
  if (!Array.isArray(raw)) return new Set<string>()
  return new Set(raw.filter((v): v is string => typeof v === 'string'))
}

async function writeConnectedIds(userId: string, ids: Set<string>): Promise<void> {
  const user = await findById<UserRow>('users', userId)
  const oauth = (user?.oauthData as Record<string, unknown>) ?? {}
  await updateById('users', userId, {
    oauthData: { ...oauth, integrations: Array.from(ids) },
  })
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const connected = await readConnectedIds(userId)
  const list: Integration[] = CATALOG.map((c) => ({
    ...c,
    status: connected.has(c.id) ? 'connected' : 'not_connected',
  }))
  res.json(list)
})

router.post('/:id/toggle', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  const known = CATALOG.find((c) => c.id === id)
  if (!known) return res.status(404).json({ error: t('integrations.notFound') })

  const connected = await readConnectedIds(userId)
  if (connected.has(id)) connected.delete(id)
  else connected.add(id)
  await writeConnectedIds(userId, connected)

  res.json({ id, status: connected.has(id) ? 'connected' : 'not_connected' })
})

export default router
