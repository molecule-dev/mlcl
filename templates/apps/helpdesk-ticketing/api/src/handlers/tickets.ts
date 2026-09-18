import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { isHelpdeskAdmin } from '../middleware/require-admin.js'
import type { HelpdeskLimits } from '../tiers.js'

const router = Router()

// Helpdesk tickets are workspace-private. Every endpoint in this router
// requires an authenticated session — the upstream verifyMiddleware
// populates res.locals.session, but it does NOT short-circuit anonymous
// requests, so each handler must guard explicitly.
//
// Authorization model (P5TPL-01): tickets carry a `requester_id` (the end
// customer) distinct from `assignee_id` (the operator). A self-registered user
// defaults to role 'user' and must only ever see/modify their OWN tickets;
// operators (isHelpdeskAdmin: role 'admin' or an ADMIN_EMAILS address) manage the
// whole queue. So every handler scopes by requester_id for non-admins — returning
// 404 (not 403) on a cross-owner id so ticket existence isn't probeable — and
// internal (agent-only) replies are withheld from non-operators.

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
}

function notFound(res: Response): Response {
  return res
    .status(404)
    .json({ error: t('tickets.notFound', {}, { defaultValue: 'Ticket not found' }) })
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const statusEnum = z.enum(['open', 'pending', 'on_hold', 'resolved', 'closed'])
const priorityEnum = z.enum(['low', 'medium', 'high', 'urgent'])

const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1),
  priority: priorityEnum.optional().default('medium'),
  category: z.string().optional(),
  assignee_id: z.string().optional(),
})

const createReplySchema = z.object({
  body: z.string().min(1),
  is_internal: z.boolean().optional().default(false),
})

const updateTicketSchema = z.object({
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  assignee_id: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
})

const listTicketsQuery = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  assignee_id: z.string().optional(),
  sort: z.string().optional().default('updated_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
})

// ---------------------------------------------------------------------------
// GET / — List tickets
// ---------------------------------------------------------------------------

router.get('/', validateQuery(listTicketsQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const { status, priority, assignee_id, sort, order, limit, offset } =
      req.query as unknown as z.infer<typeof listTicketsQuery>

    const where: WhereCondition[] = []
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (priority) where.push({ field: 'priority', operator: '=', value: priority })
    if (assignee_id) where.push({ field: 'assignee_id', operator: '=', value: assignee_id })
    // Non-operators see only their own tickets; operators see the whole queue.
    if (!(await isHelpdeskAdmin(userId))) {
      where.push({ field: 'requester_id', operator: '=', value: userId })
    }

    const tickets = await findMany('tickets', {
      where,
      orderBy: [{ field: sort ?? 'updated_at', direction: order ?? 'desc' }],
      limit,
      offset,
    })

    res.json(tickets)
  } catch (err) {
    console.error('Failed to list tickets', err)
    res
      .status(500)
      .json({ error: t('tickets.listFailed', {}, { defaultValue: 'Failed to list tickets' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id — Get ticket by ID (includes replies)
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const ticket = (await findById('tickets', id)) as { requester_id?: string } | null

    const isAdmin = await isHelpdeskAdmin(userId)
    // 404 (not 403) for a non-owner non-operator so ticket existence isn't probeable.
    if (!ticket || (!isAdmin && ticket.requester_id !== userId)) {
      return notFound(res)
    }

    const replies = (await findMany('ticket_replies', {
      where: [{ field: 'ticket_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })) as Array<{ is_internal?: boolean }>

    // Internal (operator-only) notes are withheld from the requesting customer.
    const visibleReplies = isAdmin ? replies : replies.filter((r) => !r.is_internal)

    res.json({ ...ticket, replies: visibleReplies })
  } catch (err) {
    console.error('Failed to get ticket', err)
    res
      .status(500)
      .json({ error: t('tickets.getFailed', {}, { defaultValue: 'Failed to get ticket' }) })
  }
})

// ---------------------------------------------------------------------------
// POST / — Create ticket
// ---------------------------------------------------------------------------

router.post(
  '/',
  enforceLimit<HelpdeskLimits>({
    limitType: 'maxOpenTickets',
    getLimit: (limits) => limits.maxOpenTickets,
    getCurrent: async (userId) =>
      count('tickets', [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '!=', value: 'closed' },
      ]),
  }) as unknown as RequestHandler,
  validateBody(createTicketSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId
      const { subject, description, priority, category, assignee_id } = req.body

      const result = await create('tickets', {
        subject,
        description,
        status: 'open',
        priority,
        category: category ?? null,
        assignee_id: assignee_id ?? null,
        requester_id: userId,
      })

      res.status(201).json(result.data)
    } catch (err) {
      console.error('Failed to create ticket', err)
      res
        .status(500)
        .json({ error: t('tickets.createFailed', {}, { defaultValue: 'Failed to create ticket' }) })
    }
  },
)

// ---------------------------------------------------------------------------
// POST /:id/replies — Reply to a ticket
// ---------------------------------------------------------------------------

router.post(
  '/:id/replies',
  validateBody(createReplySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return unauthorized(res)
      const id = req.params.id as string
      const ticket = (await findById('tickets', id)) as { requester_id?: string } | null

      const isAdmin = await isHelpdeskAdmin(userId)
      if (!ticket || (!isAdmin && ticket.requester_id !== userId)) {
        return notFound(res)
      }

      const { body, is_internal } = req.body

      const result = await create('ticket_replies', {
        ticket_id: id,
        body,
        // Internal (operator-only) notes can only be authored by an operator;
        // a customer's reply is always public to the thread.
        is_internal: isAdmin ? is_internal : false,
        author_id: userId,
      })

      await updateById('tickets', id, { updated_at: new Date().toISOString() })

      res.status(201).json(result.data)
    } catch (err) {
      console.error('Failed to create reply', err)
      res
        .status(500)
        .json({ error: t('tickets.replyFailed', {}, { defaultValue: 'Failed to create reply' }) })
    }
  },
)

// ---------------------------------------------------------------------------
// PATCH /:id — Update ticket
// ---------------------------------------------------------------------------

router.patch('/:id', validateBody(updateTicketSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const ticket = (await findById('tickets', id)) as { requester_id?: string } | null

    const isAdmin = await isHelpdeskAdmin(userId)
    if (!ticket || (!isAdmin && ticket.requester_id !== userId)) {
      return notFound(res)
    }

    // Mass-assignment guard (P5TPL-02): assignee_id, priority and status are
    // operator/workflow-controlled. An operator may set the full writable set;
    // a non-admin requester editing their OWN ticket is restricted to the
    // fields a customer legitimately controls (category, plus closing/reopening
    // their own ticket). assignee_id and priority are dropped entirely for
    // non-operators rather than spread from the body.
    const body = req.body as z.infer<typeof updateTicketSchema>
    const patch: Record<string, unknown> = isAdmin ? { ...body } : {}
    if (!isAdmin) {
      if (body.category !== undefined) patch.category = body.category
      if (body.status && ['open', 'closed'].includes(body.status)) {
        patch.status = body.status
      }
    }

    const result = await updateById('tickets', id, {
      ...patch,
      updated_at: new Date().toISOString(),
    })

    res.json(result.data)
  } catch (err) {
    console.error('Failed to update ticket', err)
    res
      .status(500)
      .json({ error: t('tickets.updateFailed', {}, { defaultValue: 'Failed to update ticket' }) })
  }
})

// ---------------------------------------------------------------------------
// DELETE /:id — Delete ticket
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    // Permanent deletion is an operator action only — a customer can't destroy
    // tickets (their own or anyone else's). 404 for non-operators (no probing).
    if (!(await isHelpdeskAdmin(userId))) {
      return notFound(res)
    }
    const id = req.params.id as string
    const ticket = await findById('tickets', id)

    if (!ticket) {
      return notFound(res)
    }

    await deleteById('tickets', id)

    res.status(204).send()
  } catch (err) {
    console.error('Failed to delete ticket', err)
    res
      .status(500)
      .json({ error: t('tickets.deleteFailed', {}, { defaultValue: 'Failed to delete ticket' }) })
  }
})

export default router
