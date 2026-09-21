import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'operator', 'viewer']).optional(),
})

interface TeamMemberRow {
  id: string
  owner_user_id: string
  member_user_id: string | null
  email: string
  role: string
  status: string
  invited_at: string | Date | null
  joined_at: string | Date | null
  created_at: string | Date
}

interface OwnerProfileRow {
  id: string
  name?: string | null
  email?: string | null
  created_at: string | Date
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  return (
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((s) => s[0]?.toUpperCase() + s.slice(1))
      .join(' ') || email
  )
}

async function decorateMembers(
  rows: TeamMemberRow[],
  owner: OwnerProfileRow | null,
): Promise<Array<Record<string, unknown>>> {
  const ownerEntry = owner
    ? [
        {
          id: owner.id,
          name: (owner.name && owner.name.trim()) || nameFromEmail(owner.email ?? 'owner'),
          email: owner.email ?? '',
          role: 'owner',
          joined_at: owner.created_at,
          last_active: new Date().toISOString(),
          shipments_handled_30d: 0,
        },
      ]
    : []
  const others = rows.map((r) => ({
    id: r.id,
    name: nameFromEmail(r.email),
    email: r.email,
    role: r.role || 'operator',
    joined_at: r.joined_at ?? r.invited_at ?? r.created_at,
    last_active: r.status === 'invited' ? null : (r.joined_at ?? null),
    shipments_handled_30d: 0,
  }))
  return [...ownerEntry, ...others]
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const [owner, members] = await Promise.all([
      findById<OwnerProfileRow>('users', userId),
      findMany<TeamMemberRow>('team_members', {
        where: [{ field: 'owner_user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
    ])
    res.json(await decorateMembers(members, owner ?? null))
  } catch (err) {
    logger.error?.(`team.request failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/invite', validateBody(inviteSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { email, role = 'operator' } = req.body
    const existing = await findOne<Record<string, unknown>>('team_members', [
      { field: 'owner_user_id', operator: '=', value: userId },
      { field: 'email', operator: '=', value: email },
    ])
    if (existing) {
      res.status(409).json({
        error: t('team.alreadyInvited', undefined, { defaultValue: 'User already invited' }),
      })
      return
    }
    const result = await create<Record<string, unknown>>('team_members', {
      owner_user_id: userId,
      member_user_id: null,
      email,
      role,
      status: 'invited',
      invited_at: new Date(),
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error?.(`team.request failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('team_members', id)
    if (!existing || existing.owner_user_id !== userId) {
      res
        .status(404)
        .json({ error: t('team.notFound', undefined, { defaultValue: 'Team member not found' }) })
      return
    }
    await deleteById('team_members', id)
    res.status(204).end()
  } catch (err) {
    logger.error?.(`team.request failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
