/**
 * /api/counterparties — CRUD over the `counterparties` table.
 *
 * GET / and GET /:id enrich each row with computed aggregates so the
 * UI can render rich rows (active contracts, total value, last signed
 * date) without an N+1 join in the page.
 *
 * Field aliases:
 *   email → contact_email   (the UI uses contact_email; the column is
 *                            named `email` in the DB)
 *   tags  → []              (no column today; reserved for future)
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireUserOwnership } from '../lib/authz.js'

const router = Router()

const counterpartySchema = z.object({
  organization: z.string().min(1).max(500),
  contact_name: z.string().max(500).optional().default(''),
  contact_email: z.string().email().max(320).nullable().optional(),
  email: z.string().email().max(320).nullable().optional(),
  phone: z.string().max(64).nullable().optional(),
  address: z.string().max(2_000).nullable().optional(),
  notes: z.string().max(10_000).optional().default(''),
  type: z.enum(['client', 'vendor']).optional().default('client'),
})

const updateCounterpartySchema = counterpartySchema.partial()

interface CounterpartyRow {
  id: string
  user_id: string
  organization: string
  contact_name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string
  type: string
  created_at: string
  updated_at: string | null
}

interface ContractRow {
  id: string
  counterparty_id: string | null
  status: string | null
  amount_cents: number | null
  signed_at: string | null
  party_name: string | null
}

router.use(authorizers.auth())

function shape(
  row: CounterpartyRow,
  contracts: ContractRow[],
): {
  id: string
  organization: string
  contact_name: string
  contact_email: string
  email: string
  phone: string
  address: string
  notes: string | null | undefined
  type: string | null | undefined
  tags: string[]
  active_contracts: number
  total_value_cents: number
  last_signed_at: string | null
  created_at: string
  updated_at: string | null | undefined
} {
  const mine = contracts.filter(
    (c) =>
      c.counterparty_id === row.id || (!c.counterparty_id && c.party_name === row.organization),
  )
  const active = mine.filter((c) => c.status === 'active' || c.status === 'expiring').length
  const totalValueCents = mine.reduce((s, c) => s + (c.amount_cents ?? 0), 0)
  const lastSignedAt =
    mine
      .map((c) => (c.signed_at ? Date.parse(c.signed_at) : 0))
      .filter((t) => Number.isFinite(t) && t > 0)
      .sort((a, b) => b - a)[0] ?? null
  return {
    id: row.id,
    organization: row.organization,
    contact_name: row.contact_name,
    contact_email: row.email ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    address: row.address ?? '',
    notes: row.notes,
    type: row.type,
    tags: [] as string[],
    active_contracts: active,
    total_value_cents: totalValueCents,
    last_signed_at: lastSignedAt ? new Date(lastSignedAt).toISOString() : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const [items, contracts] = await Promise.all([
    findMany<CounterpartyRow>('counterparties', {
      where,
      orderBy: [{ field: 'organization', direction: 'asc' }],
    }),
    findMany<ContractRow>('contracts', { where, limit: 10_000 }),
  ])
  res.json(items.map((row) => shape(row, contracts)))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireUserOwnership<CounterpartyRow>(
    'counterparties',
    req.params.id as string,
    userId,
  )
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('counterparty.notFound', {}, { defaultValue: 'Counterparty not found' }) })
    return
  }
  const contracts = await findMany<ContractRow>('contracts', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 10_000,
  })
  res.json(shape(check.row, contracts))
})

router.post('/', validateBody(counterpartySchema), async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const body = req.body as z.infer<typeof counterpartySchema>
  const now = new Date().toISOString()
  const result = await create<CounterpartyRow>('counterparties', {
    user_id: userId,
    organization: body.organization,
    contact_name: body.contact_name ?? '',
    email: body.contact_email ?? body.email ?? null,
    phone: body.phone ?? null,
    address: body.address ?? null,
    notes: body.notes ?? '',
    type: body.type ?? 'client',
    created_at: now,
    updated_at: now,
  })
  const created = (result.data ?? result) as CounterpartyRow
  const contracts = await findMany<ContractRow>('contracts', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 10_000,
  })
  res.status(201).json(shape(created, contracts))
})

router.patch(
  '/:id',
  validateBody(updateCounterpartySchema),
  async (req: Request, res: Response) => {
    const userId = res.locals.session.userId as string
    const check = await requireUserOwnership<CounterpartyRow>(
      'counterparties',
      req.params.id as string,
      userId,
    )
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('counterparty.notFound', {}, { defaultValue: 'Counterparty not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateCounterpartySchema>
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.organization !== undefined) updates.organization = body.organization
    if (body.contact_name !== undefined) updates.contact_name = body.contact_name
    if (body.contact_email !== undefined) updates.email = body.contact_email
    else if (body.email !== undefined) updates.email = body.email
    if (body.phone !== undefined) updates.phone = body.phone
    if (body.address !== undefined) updates.address = body.address
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.type !== undefined) updates.type = body.type
    const result = await updateById<CounterpartyRow>(
      'counterparties',
      req.params.id as string,
      updates,
    )
    const row = (result.data ?? result) as CounterpartyRow
    const contracts = await findMany<ContractRow>('contracts', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 10_000,
    })
    res.json(shape(row, contracts))
  },
)

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireUserOwnership<CounterpartyRow>(
    'counterparties',
    req.params.id as string,
    userId,
  )
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('counterparty.notFound', {}, { defaultValue: 'Counterparty not found' }) })
    return
  }
  await deleteById('counterparties', req.params.id as string)
  res.status(204).end()
})

export default router
