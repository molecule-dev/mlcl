/**
 * Settlements handler — recording money that actually moved.
 *
 * A settlement is bookkeeping, NOT a payment: bill-split never moves money.
 * `method` (cash, transfer, app…) is metadata about how the members chose
 * to pay each other back; recording one adjusts both sides' balances so a
 * fully-settled group nets everyone to zero.
 *
 * Money is integer cents on every wire (`amount_cents`).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy } from '@molecule/api-database'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { recordActivity } from './_activity.js'
import { findOwnedGroup, listGroupMembers } from './groups.js'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

interface SettlementRow {
  id?: string
  group_id?: string
  from_member_id?: string
  to_member_id?: string
  amount_cents?: number
  method?: string
  date?: string | Date | null
  note?: string | null
  created_at?: string | Date | null
}

/** `create` returns `{ data }` or the row itself depending on the bond — fold both. */
function unwrap<T>(result: unknown): T {
  const r = result as { data?: T } | T
  return (
    'data' in (r as { data?: T }) && (r as { data?: T }).data ? (r as { data?: T }).data : r
  ) as T
}

const createSettlementSchema = z.object({
  group_id: z.string().regex(UUID_RE),
  from_member_id: z.string().regex(UUID_RE),
  to_member_id: z.string().regex(UUID_RE),
  amount_cents: z.number().int().positive().max(1_000_000_000),
  method: z.enum(['cash', 'transfer', 'app', 'other']).default('cash'),
  date: z.string().optional(),
  note: z.string().max(200).optional(),
})

function decorate(row: SettlementRow, names: Map<string, string>): Record<string, unknown> {
  return {
    id: row.id,
    group_id: row.group_id,
    from_member_id: row.from_member_id,
    from_name: names.get(row.from_member_id ?? '') ?? 'Member',
    to_member_id: row.to_member_id,
    to_name: names.get(row.to_member_id ?? '') ?? 'Member',
    amount_cents: row.amount_cents ?? 0,
    method: row.method ?? 'cash',
    date: row.date instanceof Date ? row.date.toISOString() : (row.date ?? null),
    note: row.note ?? null,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at ?? null),
  }
}

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const { group_id } = req.query
  if (typeof group_id !== 'string' || !isUuid(group_id)) {
    return res.status(400).json({
      error: t('settlements.groupRequired', undefined, {
        defaultValue: 'A group_id query parameter is required',
      }),
    })
  }
  const group = await findOwnedGroup(group_id, userId)
  if (!group) {
    return res
      .status(404)
      .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
  }

  const members = await listGroupMembers(group_id)
  const names = new Map(members.map((m) => [m.id as string, m.name ?? 'Member']))

  const orderBy: OrderBy[] = [{ field: 'date', direction: 'desc' }]
  const rows = await findMany<SettlementRow>('settlements', {
    where: [{ field: 'group_id', operator: '=', value: group_id }],
    orderBy,
    limit: 100,
  })
  res.json(rows.map((r) => decorate(r, names)))
})

router.post('/', validateBody(createSettlementSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const { group_id, from_member_id, to_member_id, amount_cents, method, date, note } = req.body

  const group = await findOwnedGroup(group_id, userId)
  if (!group) {
    return res
      .status(404)
      .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
  }
  const members = await listGroupMembers(group_id)
  const memberIds = new Set(members.map((m) => m.id as string))
  const names = new Map(members.map((m) => [m.id as string, m.name ?? 'Member']))
  if (!memberIds.has(from_member_id) || !memberIds.has(to_member_id)) {
    return res.status(400).json({
      error: t('settlements.membersNotInGroup', undefined, {
        defaultValue: 'Both settlement sides must be members of the group',
      }),
    })
  }
  if (from_member_id === to_member_id) {
    return res.status(400).json({
      error: t('settlements.sameMember', undefined, {
        defaultValue: 'A settlement needs two different members',
      }),
    })
  }

  const settlement = unwrap<SettlementRow>(
    await create('settlements', {
      group_id,
      from_member_id,
      to_member_id,
      amount_cents,
      method,
      date: date ? new Date(date) : new Date(),
      note: note ?? null,
      created_at: new Date(),
    }),
  )

  await recordActivity(group_id, 'settlement_recorded', {
    actor: 'You',
    amount_cents,
    group_name: group.name,
    from_name: names.get(from_member_id) ?? 'Member',
    to_name: names.get(to_member_id) ?? 'Member',
    method,
  })

  res.status(201).json(decorate(settlement, names))
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = String(req.params.id ?? '')
  if (!isUuid(id)) {
    return res.status(404).json({
      error: t('settlements.notFound', undefined, { defaultValue: 'Settlement not found' }),
    })
  }
  const settlement = await findById<SettlementRow>('settlements', id)
  if (!settlement || !settlement.group_id) {
    return res.status(404).json({
      error: t('settlements.notFound', undefined, { defaultValue: 'Settlement not found' }),
    })
  }
  const group = await findOwnedGroup(settlement.group_id, userId)
  if (!group) {
    return res.status(404).json({
      error: t('settlements.notFound', undefined, { defaultValue: 'Settlement not found' }),
    })
  }
  await deleteById('settlements', id)
  res.status(204).end()
})

export default router
