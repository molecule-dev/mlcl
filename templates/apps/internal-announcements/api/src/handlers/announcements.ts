/**
 * Announcement handlers — owner-scoped CRUD + ack / pin / list endpoints.
 *
 * Uses the abstract DataStore from `@molecule/api-database` (no raw SQL).
 * Validation via zod through the shared `validationError` helper. Every
 * mutating endpoint gates on session userId; by-id reads/writes look the
 * row up scoped to `author_id = userId` so other users' rows cannot be
 * read or mutated (no IDOR).
 *
 * Email notification is intentionally a fire-and-forget call to the
 * `@molecule/api-emails` bond — the response does not block on delivery
 * and a missing bond logs but never 500s the create endpoint.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import {
  count,
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  type AnnouncementRow,
  findAnnouncement,
  internalError,
  requireOwnedAnnouncement,
  requireUser,
  validationError,
} from '../lib/authz.js'
import type { InternalAnnouncementsLimits } from '../tiers.js'

const router = Router()

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const idParam = z.object({ id: z.string().uuid() })

const priorityEnum = z.enum(['low', 'normal', 'high'])
const statusEnum = z.enum(['draft', 'scheduled', 'published', 'archived'])

const audienceSchema = z
  .object({
    kind: z.enum(['all', 'department', 'team', 'specific_users']),
    targets: z.array(z.string()).optional(),
  })
  .optional()

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  body_html: z.string().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  audience: audienceSchema,
  priority: priorityEnum.optional().default('normal'),
  status: statusEnum.optional().default('draft'),
  is_pinned: z.boolean().optional().default(false),
  requires_acknowledgment: z.boolean().optional().default(false),
  publish_at: z.string().datetime().nullable().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  publish_now: z.boolean().optional(),
  notify_emails: z.array(z.string().email()).optional(),
  from_email: z.string().email().optional(),
})

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
  body_html: z.string().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  audience: audienceSchema,
  priority: priorityEnum.optional(),
  status: statusEnum.optional(),
  is_pinned: z.boolean().optional(),
  requires_acknowledgment: z.boolean().optional(),
  publish_at: z.string().datetime().nullable().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
})

const listQuerySchema = z.object({
  category_id: z.string().uuid().optional(),
  status: statusEnum.optional(),
  pinned: z.enum(['true', 'false']).optional(),
  requires_ack: z.enum(['true', 'false']).optional(),
  priority: priorityEnum.optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
})

// ---------------------------------------------------------------------------
// GET / — list
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const { category_id, status, pinned, requires_ack, priority, limit, offset } = parsed.data
    const where: WhereCondition[] = []
    if (category_id) where.push({ field: 'category_id', operator: '=', value: category_id })
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (pinned) where.push({ field: 'is_pinned', operator: '=', value: pinned === 'true' })
    if (requires_ack)
      where.push({
        field: 'requires_acknowledgment',
        operator: '=',
        value: requires_ack === 'true',
      })
    if (priority) where.push({ field: 'priority', operator: '=', value: priority })
    const announcements = await findMany<AnnouncementRow>('announcements', {
      where,
      // Pinned announcements float to the top of the feed — the Composer "Pinned" option promises
      // "Stay at the top of the feed". The list previously sorted by created_at only, so a pinned
      // post sank below any newer normal post.
      orderBy: [
        { field: 'is_pinned', direction: 'desc' },
        { field: 'created_at', direction: 'desc' },
      ],
      limit,
      offset,
    })
    res.json(announcements)
  } catch (error) {
    logger.error('announcements.list', error)
    internalError(res)
  }
})

// ---------------------------------------------------------------------------
// GET /me/acknowledgments — current user's acks across all announcements
// (declared BEFORE /:id so Express does not match `me` as a uuid param.)
// ---------------------------------------------------------------------------

router.get('/me/acknowledgments', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const acks = await findMany('acknowledgments', {
      where: [{ field: 'user_id', operator: '=', value: ownerId }],
      orderBy: [{ field: 'acknowledged_at', direction: 'desc' }],
    })
    res.json(acks)
  } catch (error) {
    logger.error('announcements.myAcknowledgments', error)
    internalError(res)
  }
})

// ---------------------------------------------------------------------------
// GET /:id
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const announcement = await findAnnouncement(id.data.id)
    if (!announcement) {
      res.status(404).json({
        error: t('announcements.notFound', {}, { defaultValue: 'Announcement not found' }),
      })
      return
    }
    res.json(announcement)
  } catch (error) {
    logger.error('announcements.get', error)
    internalError(res)
  }
})

// ---------------------------------------------------------------------------
// POST / — create (entitlement-gated)
// ---------------------------------------------------------------------------

router.post(
  '/',
  enforceLimit<InternalAnnouncementsLimits>({
    limitType: 'maxAnnouncements',
    getLimit: (limits) => limits.maxAnnouncements,
    getCurrent: async (uid: string) =>
      count('announcements', [{ field: 'user_id', operator: '=', value: uid }]),
  }) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    const ownerId = requireUser(res)
    if (!ownerId) return
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      validationError(res, parsed.error.issues)
      return
    }
    const data = parsed.data
    const now = new Date()
    try {
      const result = await create<AnnouncementRow>('announcements', {
        title: data.title,
        body: data.body,
        body_html: data.body_html ?? null,
        category_id: data.category_id ?? null,
        audience: data.audience ?? { kind: 'all' },
        priority: data.priority ?? 'normal',
        status: data.publish_now ? 'published' : (data.status ?? 'draft'),
        is_pinned: data.is_pinned ?? false,
        requires_acknowledgment: data.requires_acknowledgment ?? false,
        publish_at: data.publish_at ?? null,
        scheduled_at: data.scheduled_at ?? null,
        published_at: data.publish_now ? now.toISOString() : null,
        author_id: ownerId,
        created_at: now,
        updated_at: now,
      })

      // Best-effort outbound notify; never blocks the create response.
      if (data.notify_emails?.length) {
        for (const email of data.notify_emails) {
          try {
            await sendMail({
              to: email,
              from: data.from_email ?? 'noreply@example.com',
              subject: t(
                'announcements.emailSubject',
                { title: data.title },
                { defaultValue: `New announcement: ${data.title}` },
              ),
              text: data.body,
            })
          } catch (_error) {
            // swallow — email bond is optional in test environments.
          }
        }
      }

      res.status(201).json(result.data)
    } catch (error) {
      logger.error('announcements.create', error)
      internalError(res)
    }
  },
)

// ---------------------------------------------------------------------------
// PATCH /:id — update (owner-scoped)
// ---------------------------------------------------------------------------

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const owned = await requireOwnedAnnouncement(id.data.id, ownerId)
    if (!owned) {
      res.status(404).json({
        error: t('announcements.notFound', {}, { defaultValue: 'Announcement not found' }),
      })
      return
    }
    const result = await updateById<AnnouncementRow>('announcements', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('announcements.patch', error)
    internalError(res)
  }
})

// ---------------------------------------------------------------------------
// PUT /:id — alias of PATCH (used by some templated frontends)
// ---------------------------------------------------------------------------

router.put('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const owned = await requireOwnedAnnouncement(id.data.id, ownerId)
    if (!owned) {
      res.status(404).json({
        error: t('announcements.notFound', {}, { defaultValue: 'Announcement not found' }),
      })
      return
    }
    const result = await updateById<AnnouncementRow>('announcements', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('announcements.put', error)
    internalError(res)
  }
})

// ---------------------------------------------------------------------------
// DELETE /:id — owner-scoped
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const owned = await requireOwnedAnnouncement(id.data.id, ownerId)
    if (!owned) {
      res.status(404).json({
        error: t('announcements.notFound', {}, { defaultValue: 'Announcement not found' }),
      })
      return
    }
    await deleteById('announcements', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('announcements.delete', error)
    internalError(res)
  }
})

// ---------------------------------------------------------------------------
// POST /:id/pin — owner-scoped
// ---------------------------------------------------------------------------

router.post('/:id/pin', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const owned = await requireOwnedAnnouncement(id.data.id, ownerId)
    if (!owned) {
      res.status(404).json({
        error: t('announcements.notFound', {}, { defaultValue: 'Announcement not found' }),
      })
      return
    }
    const result = await updateById<AnnouncementRow>('announcements', id.data.id, {
      is_pinned: true,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('announcements.pin', error)
    internalError(res)
  }
})

// ---------------------------------------------------------------------------
// POST /:id/unpin
// ---------------------------------------------------------------------------

router.post('/:id/unpin', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const owned = await requireOwnedAnnouncement(id.data.id, ownerId)
    if (!owned) {
      res.status(404).json({
        error: t('announcements.notFound', {}, { defaultValue: 'Announcement not found' }),
      })
      return
    }
    const result = await updateById<AnnouncementRow>('announcements', id.data.id, {
      is_pinned: false,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('announcements.unpin', error)
    internalError(res)
  }
})

// ---------------------------------------------------------------------------
// POST /:id/acknowledge — self-acknowledgment (any authenticated user)
//
// The acknowledger is the session user; we ignore any user_id in the body
// to prevent forgery. Idempotent — repeat acks return the same row.
// ---------------------------------------------------------------------------

const ackBodySchema = z.object({ ip: z.string().optional() })

router.post('/:id/acknowledge', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = ackBodySchema.safeParse(req.body ?? {})
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const announcement = await findAnnouncement(id.data.id)
    if (!announcement) {
      res.status(404).json({
        error: t('announcements.notFound', {}, { defaultValue: 'Announcement not found' }),
      })
      return
    }
    // Idempotent — if a row already exists, return it; otherwise create.
    const existing = await findMany('acknowledgments', {
      where: [
        { field: 'announcement_id', operator: '=', value: id.data.id },
        { field: 'user_id', operator: '=', value: ownerId },
      ],
      limit: 1,
    })
    if (existing.length > 0) {
      res.json({ acknowledged: true, ack: existing[0] })
      return
    }
    const result = await create('acknowledgments', {
      announcement_id: id.data.id,
      user_id: ownerId,
      acknowledged_at: new Date(),
      ip: body.data.ip ?? req.ip ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json({ acknowledged: true, ack: result.data })
  } catch (error) {
    logger.error('announcements.acknowledge', error)
    internalError(res)
  }
})

// ---------------------------------------------------------------------------
// GET /:id/acknowledgments — visible to any authenticated user
// ---------------------------------------------------------------------------

router.get('/:id/acknowledgments', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const acks = await findMany('acknowledgments', {
      where: [{ field: 'announcement_id', operator: '=', value: id.data.id }],
      orderBy: [{ field: 'acknowledged_at', direction: 'desc' }],
    })
    res.json(acks)
  } catch (error) {
    logger.error('announcements.getAcknowledgments', error)
    internalError(res)
  }
})

export default router
