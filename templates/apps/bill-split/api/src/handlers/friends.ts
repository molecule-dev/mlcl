/**
 * Friends handler — the user's address book of people they split with.
 *
 * A friend is a lightweight `members` row with `is_self = false`. Adding one
 * by email is an invite STUB: the row is stored and immediately usable in
 * groups; no real email/registration flow is implied (bill-split never
 * sends money or onboarding mail).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy } from '@molecule/api-database'
import { create, deleteById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

interface MemberRow {
  id?: string
  user_id?: string
  name?: string
  email?: string | null
  is_self?: boolean
  created_at?: string | Date | null
}

/** `create` returns `{ data }` or the row itself depending on the bond — fold both. */
function unwrap<T>(result: unknown): T {
  const r = result as { data?: T } | T
  return (
    'data' in (r as { data?: T }) && (r as { data?: T }).data ? (r as { data?: T }).data : r
  ) as T
}

const createFriendSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
})

function decorate(row: MemberRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name ?? '',
    email: row.email ?? null,
    is_self: row.is_self === true,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at ?? null),
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'asc' }]
  const friends = await findMany<MemberRow>('members', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'is_self', operator: '=', value: false },
    ],
    orderBy,
    limit: 200,
  })
  res.json(friends.map(decorate))
})

router.post('/', validateBody(createFriendSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const { name, email } = req.body

  // One address-book entry per email.
  const existing = await findMany<MemberRow>('members', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'email', operator: '=', value: email },
    ],
    limit: 1,
  })
  if (existing.length > 0) {
    return res.status(200).json({ ...decorate(existing[0]), reused: true })
  }

  const friend = unwrap<MemberRow>(
    await create('members', {
      user_id: userId,
      name,
      email,
      is_self: false,
      created_at: new Date(),
    }),
  )
  res.status(201).json({ ...decorate(friend), reused: false })
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = String(req.params.id ?? '')
  if (!isUuid(id)) {
    return res.status(404).json({
      error: t('friends.notFound', undefined, { defaultValue: 'Friend not found' }),
    })
  }
  const rows = await findMany<MemberRow>('members', {
    where: [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ],
    limit: 1,
  })
  if (rows.length === 0 || rows[0].is_self === true) {
    return res.status(404).json({
      error: t('friends.notFound', undefined, { defaultValue: 'Friend not found' }),
    })
  }
  // Memberships reference this member with ON DELETE CASCADE, which removes
  // the friend from every group; historical expense_shares keep their rows
  // (no FK cascade) so past expenses still balance.
  await deleteById('members', id)
  res.status(204).end()
})

export default router
