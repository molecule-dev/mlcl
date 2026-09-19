/**
 * Expenses handler — a payer-fronted cost split across group members.
 *
 * POST computes the per-member shares server-side (clients send intent,
 * never precomputed money):
 *
 * - `equal`  — split evenly across the chosen participants (default: every
 *   group member). Remainder cents go to the first participant so the
 *   shares always sum to the expense total exactly.
 * - `exact`  — the client sends explicit per-member cents; the API rejects
 *   any set that does not sum to the total.
 * - `shares` — integer weights per member (e.g. 2 for a couple); cents are
 *   apportioned by weight, remainder to the largest weight.
 *
 * Money is integer cents on every wire (`amount_cents`).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
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

interface ExpenseRow {
  id?: string
  group_id?: string
  payer_member_id?: string
  amount_cents?: number
  description?: string
  category?: string | null
  date?: string | Date | null
  split_method?: string
  created_at?: string | Date | null
}

interface ShareRow {
  id?: string
  expense_id?: string
  member_id?: string
  amount_cents?: number
}

/** `create` returns `{ data }` or the row itself depending on the bond — fold both. */
function unwrap<T>(result: unknown): T {
  const r = result as { data?: T } | T
  return (
    'data' in (r as { data?: T }) && (r as { data?: T }).data ? (r as { data?: T }).data : r
  ) as T
}

const shareInputSchema = z.object({
  member_id: z.string().regex(UUID_RE),
  amount_cents: z.number().int().min(0).optional(),
  weight: z.number().int().min(1).optional(),
})

type ShareInput = z.infer<typeof shareInputSchema>

const createExpenseSchema = z.object({
  group_id: z.string().regex(UUID_RE),
  payer_member_id: z.string().regex(UUID_RE),
  amount_cents: z.number().int().positive().max(1_000_000_000),
  description: z.string().min(1).max(200),
  category: z.string().max(40).optional(),
  date: z.string().optional(),
  split_method: z.enum(['equal', 'exact', 'shares']).default('equal'),
  /** For `equal`: the members to split across (default: all group members). */
  participants: z.array(z.string().regex(UUID_RE)).max(50).optional(),
  /** For `exact` / `shares`: per-member rows. */
  shares: z.array(shareInputSchema).max(50).optional(),
})

function decorate(row: ExpenseRow, payerName: string, shares: ShareRow[]): Record<string, unknown> {
  return {
    id: row.id,
    group_id: row.group_id,
    payer_member_id: row.payer_member_id,
    payer_name: payerName,
    amount_cents: row.amount_cents ?? 0,
    description: row.description ?? '',
    category: row.category ?? 'other',
    date: row.date instanceof Date ? row.date.toISOString() : (row.date ?? null),
    split_method: row.split_method ?? 'equal',
    shares: shares.map((s) => ({ member_id: s.member_id, amount_cents: s.amount_cents ?? 0 })),
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at ?? null),
  }
}

/**
 * Distribute `total` cents across members.
 *
 * - equal: even split, remainder cents to the first participant.
 * - shares: weight-proportional, remainder cents to the largest weight.
 */
function distribute(
  total: number,
  entries: { member_id: string; weight: number }[],
): { member_id: string; amount_cents: number }[] {
  const weightSum = entries.reduce((sum, e) => sum + e.weight, 0)
  const result = entries.map((e) => ({
    member_id: e.member_id,
    weight: e.weight,
    amount_cents: Math.floor((total * e.weight) / weightSum),
  }))
  let assigned = result.reduce((sum, r) => sum + r.amount_cents, 0)
  // Largest weight first absorbs leftover cents — deterministic and keeps
  // the per-share error under 1 cent on the member with the biggest stake.
  const byWeight = [...result].sort((a, b) => b.weight - a.weight)
  let i = 0
  while (assigned < total && byWeight.length > 0) {
    byWeight[i % byWeight.length].amount_cents += 1
    assigned += 1
    i += 1
  }
  return result.map(({ member_id, amount_cents }) => ({ member_id, amount_cents }))
}

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const { group_id, category, limit, offset } = req.query
  if (typeof group_id !== 'string' || !isUuid(group_id)) {
    return res.status(400).json({
      error: t('expenses.groupRequired', undefined, {
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
  const memberNames = new Map(members.map((m) => [m.id as string, m.name ?? 'Member']))

  const where: WhereCondition[] = [{ field: 'group_id', operator: '=', value: group_id }]
  if (category) where.push({ field: 'category', operator: '=', value: category })
  const orderBy: OrderBy[] = [{ field: 'date', direction: 'desc' }]

  const expenses = await findMany<ExpenseRow>('expenses', {
    where,
    orderBy,
    limit: Number(limit) || 100,
    offset: Number(offset) || 0,
  })

  const payload = await Promise.all(
    expenses.map(async (e) => {
      const shares = await findMany<ShareRow>('expense_shares', {
        where: [{ field: 'expense_id', operator: '=', value: e.id! }],
        limit: 100,
      })
      return decorate(e, memberNames.get(e.payer_member_id ?? '') ?? 'Member', shares)
    }),
  )
  res.json(payload)
})

router.post('/', validateBody(createExpenseSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const {
    group_id,
    payer_member_id,
    amount_cents,
    description,
    category,
    date,
    split_method,
    participants,
    shares,
  } = req.body

  const group = await findOwnedGroup(group_id, userId)
  if (!group) {
    return res
      .status(404)
      .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
  }
  const members = await listGroupMembers(group_id)
  const memberIds = new Set(members.map((m) => m.id as string))
  const memberNames = new Map(members.map((m) => [m.id as string, m.name ?? 'Member']))
  if (!memberIds.has(payer_member_id)) {
    return res.status(400).json({
      error: t('expenses.payerNotMember', undefined, {
        defaultValue: 'The payer must be a member of the group',
      }),
    })
  }

  // ---- compute the split (server-side money math only) ----
  let computed: { member_id: string; amount_cents: number }[]
  if (split_method === 'exact') {
    const rows: ShareInput[] = shares ?? []
    const sum = rows.reduce((acc, s) => acc + (s.amount_cents ?? 0), 0)
    if (rows.length === 0 || sum !== amount_cents) {
      return res.status(400).json({
        error: t('expenses.exactSumMismatch', undefined, {
          defaultValue: 'Exact shares must sum to the expense amount',
        }),
      })
    }
    if (rows.some((s) => !memberIds.has(s.member_id))) {
      return res.status(400).json({
        error: t('expenses.shareNotMember', undefined, {
          defaultValue: 'Every shared member must belong to the group',
        }),
      })
    }
    computed = rows.map((s) => ({ member_id: s.member_id, amount_cents: s.amount_cents as number }))
  } else if (split_method === 'shares') {
    const rows = ((shares ?? []) as ShareInput[]).filter((s) => memberIds.has(s.member_id))
    if (rows.length === 0) {
      return res.status(400).json({
        error: t('expenses.sharesRequired', undefined, {
          defaultValue: 'Share weights are required for a shares split',
        }),
      })
    }
    computed = distribute(
      amount_cents,
      rows.map((s) => ({ member_id: s.member_id, weight: s.weight ?? 1 })),
    )
  } else {
    const ids = participants && participants.length > 0 ? participants : [...memberIds]
    const valid = ids.filter((id: string) => memberIds.has(id))
    if (valid.length === 0) {
      return res.status(400).json({
        error: t('expenses.participantsRequired', undefined, {
          defaultValue: 'At least one participant is required',
        }),
      })
    }
    computed = distribute(
      amount_cents,
      valid.map((id: string) => ({ member_id: id, weight: 1 })),
    )
  }

  const expense = unwrap<ExpenseRow>(
    await create('expenses', {
      group_id,
      payer_member_id,
      amount_cents,
      description,
      category: category ?? 'other',
      date: date ? new Date(date) : new Date(),
      split_method,
      created_at: new Date(),
      updated_at: new Date(),
    }),
  )

  for (const share of computed) {
    await create('expense_shares', {
      expense_id: expense.id,
      member_id: share.member_id,
      amount_cents: share.amount_cents,
    })
  }

  await recordActivity(group_id, 'expense_added', {
    actor: memberNames.get(payer_member_id) ?? 'Member',
    description,
    amount_cents,
    group_name: group.name,
    payer_name: memberNames.get(payer_member_id) ?? 'Member',
  })

  res
    .status(201)
    .json(
      decorate(expense, memberNames.get(payer_member_id) ?? 'Member', [
        ...computed.map((s) => ({ ...s, expense_id: expense.id }) as ShareRow),
      ]),
    )
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = String(req.params.id ?? '')
  if (!isUuid(id)) {
    return res
      .status(404)
      .json({ error: t('expenses.notFound', undefined, { defaultValue: 'Expense not found' }) })
  }
  const expense = await findById<ExpenseRow>('expenses', id)
  if (!expense || !expense.group_id) {
    return res
      .status(404)
      .json({ error: t('expenses.notFound', undefined, { defaultValue: 'Expense not found' }) })
  }
  const group = await findOwnedGroup(expense.group_id, userId)
  if (!group) {
    return res
      .status(404)
      .json({ error: t('expenses.notFound', undefined, { defaultValue: 'Expense not found' }) })
  }
  await deleteById('expenses', id) // shares cascade
  await recordActivity(expense.group_id, 'expense_deleted', {
    actor: 'You',
    description: expense.description ?? '',
    amount_cents: expense.amount_cents ?? 0,
    group_name: group.name,
  })
  res.status(204).end()
})

export default router
