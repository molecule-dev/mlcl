import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { recordHeartbeat } from '../lib/heartbeats.js'

const router = Router()

const VALID_CHANNELS = ['email', 'sms', 'webhook'] as const
const VALID_NOTIFICATION_TYPES = ['all', 'incidents', 'maintenance'] as const

const subscribeSchema = z.object({
  email: z.string().email().optional(),
  destination: z.string().min(1).max(500).optional(),
  channel: z.enum(VALID_CHANNELS).optional().default('email'),
  notification_type: z.enum(VALID_NOTIFICATION_TYPES).optional().default('all'),
  components: z.array(z.string()).optional().default([]),
})

/**
 * Heartbeat receiver — the dead-man's-switch half of the monitor.
 *
 * Unauthenticated by necessity: the caller is an external agent (Alertmanager's
 * Watchdog webhook, a cron job, a CI run) that cannot hold a user session. The
 * `heartbeat_key` in the path IS the credential, which is why it must be an
 * unguessable random value — see the 0030 migration.
 *
 * Accepts both POST (webhook senders) and GET (cron one-liners, uptime pingers),
 * because refusing one of them just means the beat silently never arrives.
 * Always answers 204 on success with no body: the sender is a machine that only
 * reads the status code, and returning component details would leak the page's
 * internals to anyone who guesses a key.
 */
const heartbeat = async (req: Request, res: Response): Promise<void> => {
  const recorded = await recordHeartbeat(String(req.params.key ?? ''))
  if (!recorded) {
    res.status(404).json({
      error: t('status.heartbeatUnknownKey', {}, { defaultValue: 'Unknown heartbeat key.' }),
    })
    return
  }
  res.status(204).end()
}

router.post('/heartbeat/:key', heartbeat)
router.get('/heartbeat/:key', heartbeat)

/**
 * Columns the UNAUTHENTICATED status page may see.
 *
 * This is an allow-list on purpose. These endpoints used to return the whole
 * row, which was harmless until the row grew `heartbeat_key` — a credential
 * that lets its holder beat on behalf of a dead service and keep a real outage
 * showing green. A denylist would have to be updated every time a column is
 * added, and the failure mode of forgetting is silent public exposure; an
 * allow-list fails the other way, by omitting a field someone then notices.
 */
const PUBLIC_COMPONENT_FIELDS = [
  'id',
  'name',
  'description',
  'group',
  'status',
  'monitor_url',
  'uptime_pct_90',
  'sort_order',
]

/**
 * Project a component row down to the public fields, independently of the query.
 *
 * `select` is a hint to the bonded data store, and the store is swappable — so
 * whether the key comes back is a property of whichever provider happens to be
 * wired, not of this endpoint. Re-projecting here makes the guarantee belong to
 * the endpoint: even a provider that ignores `select` entirely cannot leak the
 * credential. Cheap, and the failure it prevents is silent.
 */
const toPublicComponent = (row: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(PUBLIC_COMPONENT_FIELDS.filter((f) => f in row).map((f) => [f, row[f]]))

router.get('/components', async (_req: Request, res: Response) => {
  const components = await findMany<Record<string, unknown>>('status_components', {
    select: PUBLIC_COMPONENT_FIELDS,
    orderBy: [{ field: 'sort_order', direction: 'asc' }],
  })
  res.json(components.map(toPublicComponent))
})

router.get('/incidents', async (_req: Request, res: Response) => {
  const incidents = await findMany('incidents', {
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 100,
  })
  res.json(incidents)
})

router.get('/maintenance', async (_req: Request, res: Response) => {
  const maintenance = await findMany('maintenance', {
    orderBy: [{ field: 'scheduled_for', direction: 'asc' }],
    limit: 100,
  })
  res.json(maintenance)
})

router.get('/status', async (_req: Request, res: Response) => {
  const [components, incidents, maintenance] = await Promise.all([
    findMany<Record<string, unknown>>('status_components', {
      select: PUBLIC_COMPONENT_FIELDS,
      orderBy: [{ field: 'sort_order', direction: 'asc' }],
    }),
    findMany('incidents', {
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 50,
    }),
    findMany('maintenance', {
      orderBy: [{ field: 'scheduled_for', direction: 'asc' }],
      limit: 50,
    }),
  ])
  res.json({ components: components.map(toPublicComponent), incidents, maintenance })
})

router.post('/subscribers', async (req: Request, res: Response) => {
  const parsed = subscribeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const destination = parsed.data.destination ?? parsed.data.email
  if (!destination) {
    return res.status(400).json({
      error: t(
        'subscribers.missingDestination',
        {},
        { defaultValue: 'Subscriber destination required' },
      ),
    })
  }
  // Public subscriptions attach to the workspace owner. In the flagship
  // demo there's a single workspace; we pick the first user_id from any
  // existing component or fall back to the first user. Real multi-tenant
  // implementations would scope by subdomain or path slug.
  let workspaceUserId: string | null = null
  const anyComponent = await findMany<{ user_id: string }>('status_components', {
    select: ['user_id'],
    limit: 1,
  })
  if (anyComponent.length > 0) workspaceUserId = anyComponent[0].user_id
  if (!workspaceUserId) {
    const anyUser = await findMany<{ id: string }>('users', { select: ['id'], limit: 1 })
    if (anyUser.length > 0) workspaceUserId = anyUser[0].id
  }
  if (!workspaceUserId) {
    return res.status(400).json({
      error: t('subscribers.noWorkspace', {}, { defaultValue: 'No workspace configured yet' }),
    })
  }
  const result = await create('status_subscribers', {
    user_id: workspaceUserId,
    channel: parsed.data.channel,
    destination,
    email: parsed.data.email ?? (parsed.data.channel === 'email' ? destination : null),
    notification_type: parsed.data.notification_type,
    components: JSON.stringify(parsed.data.components),
    is_confirmed: false,
  })
  res.status(201).json(result.data ?? result)
})

export default router
