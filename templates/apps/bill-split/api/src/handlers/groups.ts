/**
 * Groups handler — the bill-split spine.
 *
 * A group owns members (via memberships) and every expense, settlement,
 * and activity row belongs to exactly one group. All routes are scoped to
 * the authenticated user: a group lookup that does not match `user_id`
 * returns 404, never someone else's data.
 *
 * Money is integer cents on every wire (`amount_cents`).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { recordActivity } from './_activity.js'
import { computeGroupBalances, type MemberRow, simplifyDebts, type Transfer } from './_balances.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

/** `create` returns `{ data }` or the row itself depending on the bond — fold both. */
function unwrap<T>(result: unknown): T {
  const r = result as { data?: T } | T
  return (
    'data' in (r as { data?: T }) && (r as { data?: T }).data ? (r as { data?: T }).data : r
  ) as T
}

interface GroupRow {
  id?: string
  user_id?: string
  name?: string
  description?: string | null
  currency?: string
  created_at?: string | Date | null
}

interface MembershipRow {
  id?: string
  group_id?: string
  member_id?: string
  role?: string
  joined_at?: string | Date | null
}

function decorateGroup(row: GroupRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name ?? '',
    description: row.description ?? null,
    currency: row.currency ?? 'USD',
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at ?? null),
  }
}

/** Groups owned by the user, most recent first. */
async function listGroups(userId: string): Promise<GroupRow[]> {
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
  return findMany<GroupRow>('groups', { where, orderBy, limit: 200 })
}

/** All members of a group (joined through memberships). */
async function listGroupMembers(groupId: string): Promise<MemberRow[]> {
  const memberships = await findMany<MembershipRow>('memberships', {
    where: [{ field: 'group_id', operator: '=', value: groupId }],
    orderBy: [{ field: 'joined_at', direction: 'asc' }],
    limit: 100,
  })
  const memberIds = memberships.map((m) => m.member_id!)
  if (memberIds.length === 0) return []
  const members = await findMany<MemberRow>('members', {
    where: [{ field: 'id', operator: 'in', value: memberIds }],
    limit: 100,
  })
  // Preserve join order for stable avatar stacks.
  const order = new Map(memberIds.map((id, i) => [id, i]))
  return members
    .filter((m) => m.id)
    .sort((a, b) => (order.get(a.id!) ?? 0) - (order.get(b.id!) ?? 0))
}

/** Load a group the user owns, or null (caller 404s). */
async function findOwnedGroup(groupId: string, userId: string): Promise<GroupRow | null> {
  if (!isUuid(groupId)) return null
  const group = await findById<GroupRow>('groups', groupId)
  if (!group || group.user_id !== userId) return null
  return group
}

const createGroupSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  /** Names of friends to seed as initial members (self is always added). */
  member_names: z.array(z.string().min(1).max(80)).max(20).optional(),
})

const updateGroupSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
})

const addMemberSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  try {
    await seedDemoForUser(userId)
  } catch (err) {
    console.warn('seedDemoForUser failed', err)
  }

  const groups = await listGroups(userId)
  const payload = await Promise.all(
    groups.map(async (g) => {
      const members = await listGroupMembers(g.id!)
      const balances = await computeGroupBalances(g.id!, members)
      const mine = balances.find((b) => b.is_self)
      return {
        ...decorateGroup(g),
        member_count: members.length,
        members: members.map((m) => ({ id: m.id, name: m.name, is_self: m.is_self === true })),
        my_balance_cents: mine ? mine.net_cents : 0,
        total_expenses_cents: balances.reduce((sum, b) => sum + b.paid_cents, 0),
      }
    }),
  )
  res.json(payload)
})

router.post('/', validateBody(createGroupSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const { name, description, member_names } = req.body

  const group = unwrap<GroupRow>(
    await create('groups', {
      user_id: userId,
      name,
      description: description ?? null,
      currency: 'USD',
      created_at: new Date(),
      updated_at: new Date(),
    }),
  )

  // The owner participates as their `is_self` member row.
  const self = unwrap<MemberRow>(
    await create('members', {
      user_id: userId,
      name: 'You',
      email: null,
      is_self: true,
      created_at: new Date(),
    }),
  )

  await create('memberships', {
    group_id: group.id,
    member_id: self.id,
    role: 'owner',
    joined_at: new Date(),
  })

  for (const friendName of member_names ?? []) {
    const friend = unwrap<MemberRow>(
      await create('members', {
        user_id: userId,
        name: friendName,
        email: null,
        is_self: false,
        created_at: new Date(),
      }),
    )
    await create('memberships', {
      group_id: group.id,
      member_id: friend.id,
      role: 'member',
      joined_at: new Date(),
    })
  }

  await recordActivity(group.id!, 'group_created', {
    actor: 'You',
    group_name: name,
    member_count: 1 + (member_names?.length ?? 0),
  })

  res.status(201).json({
    ...decorateGroup(group),
    member_count: 1 + (member_names?.length ?? 0),
    my_balance_cents: 0,
  })
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const id = String(req.params.id ?? '')
  const group = await findOwnedGroup(id, userId)
  if (!group) {
    return res
      .status(404)
      .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
  }

  const members = await listGroupMembers(id)
  const balances = await computeGroupBalances(id, members)
  const suggestions = simplifyDebts(balances)

  res.json({
    ...decorateGroup(group),
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email ?? null,
      is_self: m.is_self === true,
    })),
    balances,
    suggestions,
  })
})

router.patch('/:id', validateBody(updateGroupSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = String(req.params.id ?? '')
  const group = await findOwnedGroup(id, userId)
  if (!group) {
    return res
      .status(404)
      .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
  }
  const updates: Record<string, unknown> = { updated_at: new Date() }
  if (req.body.name !== undefined) updates.name = req.body.name
  if (req.body.description !== undefined) updates.description = req.body.description
  await updateById('groups', id, updates)
  const fresh = await findById<GroupRow>('groups', id)
  res.json(decorateGroup(fresh ?? group))
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = String(req.params.id ?? '')
  const group = await findOwnedGroup(id, userId)
  if (!group) {
    return res
      .status(404)
      .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
  }
  await deleteById('groups', id)
  res.status(204).end()
})

router.post('/:id/members', validateBody(addMemberSchema), async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = String(req.params.id ?? '')
  const group = await findOwnedGroup(id, userId)
  if (!group) {
    return res
      .status(404)
      .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
  }

  const { name, email } = req.body
  // Reuse an existing friend with the same email instead of duplicating the
  // address-book entry, so per-friend balance aggregation stays correct.
  let member: MemberRow | null = null
  if (email) {
    const existing = await findMany<MemberRow>('members', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'email', operator: '=', value: email },
      ],
      limit: 1,
    })
    if (existing.length > 0 && existing[0].id) {
      const already = await count('memberships', [
        { field: 'group_id', operator: '=', value: id },
        { field: 'member_id', operator: '=', value: existing[0].id },
      ])
      if (already > 0) {
        return res.json({ id: existing[0].id, name: existing[0].name, reused: true })
      }
      member = existing[0]
    }
  }

  if (!member) {
    member = unwrap<MemberRow>(
      await create('members', {
        user_id: userId,
        name,
        email: email ?? null,
        is_self: false,
        created_at: new Date(),
      }),
    )
  }

  await create('memberships', {
    group_id: id,
    member_id: member.id,
    role: 'member',
    joined_at: new Date(),
  })

  await recordActivity(id, 'member_added', {
    actor: 'You',
    member_name: name,
    group_name: group.name,
  })

  res.status(201).json({ id: member.id, name: member.name, reused: false })
})

router.delete('/:id/members/:memberId', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = String(req.params.id ?? '')
  const group = await findOwnedGroup(id, userId)
  if (!group) {
    return res
      .status(404)
      .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
  }
  const memberId = String(req.params.memberId ?? '')
  const self = await findMany<MemberRow>('members', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'is_self', operator: '=', value: true },
    ],
    limit: 1,
  })
  if (self.length > 0 && self[0].id === memberId) {
    return res.status(400).json({
      error: t('groups.cannotRemoveSelf', undefined, {
        defaultValue: 'You cannot remove yourself from a group you own',
      }),
    })
  }
  // Deleting the membership keeps the member available as a friend elsewhere.
  const memberships = await findMany<MembershipRow>('memberships', {
    where: [
      { field: 'group_id', operator: '=', value: id },
      { field: 'member_id', operator: '=', value: memberId },
    ],
    limit: 1,
  })
  if (memberships.length === 0 || !memberships[0].id) {
    return res.status(404).json({ error: 'Membership not found' })
  }
  await deleteById('memberships', memberships[0].id)
  await recordActivity(id, 'member_removed', {
    actor: 'You',
    group_name: group.name,
  })
  res.status(204).end()
})

/** Suggested minimal transfers that zero the group out. */
router.get('/:id/simplify', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = String(req.params.id ?? '')
  const group = await findOwnedGroup(id, userId)
  if (!group) {
    return res
      .status(404)
      .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
  }
  const members = await listGroupMembers(id)
  const balances = await computeGroupBalances(id, members)
  const suggestions: (Transfer & { from_name: string; to_name: string })[] = simplifyDebts(
    balances,
  ).map((tr) => ({
    ...tr,
    from_name: balances.find((b) => b.member_id === tr.from_member_id)?.name ?? 'Member',
    to_name: balances.find((b) => b.member_id === tr.to_member_id)?.name ?? 'Member',
  }))
  res.json(suggestions)
})

/** Exported for the balances/dashboard handlers. */
export { findOwnedGroup, listGroupMembers, listGroups }
export type { GroupRow }

export default router
