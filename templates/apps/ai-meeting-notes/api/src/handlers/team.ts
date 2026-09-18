import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const ALLOWED_ROLES = ['owner', 'admin', 'member'] as const

interface TeamMemberRow {
  id: string
  team_id: string | null
  user_id: string
  invitee_email: string
  role: string
  invited_at: string | Date
  joined_at: string | Date | null
  created_at: string | Date
}

interface UserRow {
  id: string
  email: string
  display_name?: string | null
}

function isoDate(value: string | Date | null): string | null {
  if (value == null) return null
  return value instanceof Date ? value.toISOString() : String(value)
}

function nameFromEmail(email: string): string {
  const local = (email || '').split('@')[0] || 'Member'
  return (
    local
      .split(/[._-]/)
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ') || 'Member'
  )
}

function initialOf(name: string): string {
  const t = (name || '').trim()
  if (!t) return '·'
  return t.charAt(0).toUpperCase()
}

function uiRole(raw: string): 'Owner' | 'Admin' | 'Member' | 'Guest' {
  const r = (raw || '').toLowerCase()
  if (r === 'owner') return 'Owner'
  if (r === 'admin') return 'Admin'
  if (r === 'member') return 'Member'
  return 'Guest'
}

const inviteMemberSchema = z.object({
  email: z.string().email(),
  team_id: z.string().uuid().optional(),
  role: z.enum(ALLOWED_ROLES).default('member'),
})

const updateMemberSchema = z.object({
  role: z.enum(ALLOWED_ROLES).optional(),
  joined: z.boolean().optional(),
})

/**
 * Lists team_members where the requesting user is the inviter (`user_id` =
 * caller). The caller themselves is always returned as the Owner row at the
 * top (synthesized — they don't exist as a row in `team_members`). For each
 * member we compute speaker_color (1–5 round-robin), initial, name, and
 * pending = joined_at == null so the Team UI can render directly.
 */
router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const me = await findById<UserRow>('users', userId)

  const members = await findMany<TeamMemberRow>('team_members', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'invited_at', direction: 'asc' }],
  })

  // Resolve any joined member's user row by email so we can show display name.
  const emails = Array.from(new Set(members.map((m) => m.invitee_email).filter(Boolean)))
  const joinedUsers: UserRow[] =
    emails.length === 0
      ? []
      : await findMany<UserRow>('users', {
          where: [{ field: 'email', operator: 'in', value: emails }],
        })
  const userByEmail = new Map(joinedUsers.map((u) => [u.email.toLowerCase(), u]))

  const enrichedMembers = members.map((m, idx) => {
    const u = userByEmail.get(m.invitee_email.toLowerCase())
    const name =
      u?.display_name?.trim() || (u ? u.email.split('@')[0] : nameFromEmail(m.invitee_email))
    const joinedIso = isoDate(m.joined_at)
    const invitedIso = isoDate(m.invited_at) ?? ''
    return {
      id: m.id,
      name,
      email: m.invitee_email,
      initial: initialOf(name),
      role: uiRole(m.role),
      role_raw: m.role,
      speaker_color: ((idx + 1) % 5) + 1,
      last_active: joinedIso ?? invitedIso,
      joined_at: joinedIso,
      invited_at: invitedIso,
      pending: joinedIso == null,
    }
  })

  // Synthesize the caller themselves as the Owner row.
  const myName = me?.display_name?.trim() || (me?.email ? me.email.split('@')[0] : 'You')
  const ownerRow = {
    id: `self:${userId}`,
    name: myName,
    email: me?.email ?? '',
    initial: initialOf(myName),
    role: 'Owner' as const,
    role_raw: 'owner',
    speaker_color: 1,
    last_active: new Date().toISOString(),
    joined_at: new Date().toISOString(),
    invited_at: new Date().toISOString(),
    pending: false,
  }

  res.json([ownerRow, ...enrichedMembers])
})

router.post('/', validateBody(inviteMemberSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const body = req.body as z.infer<typeof inviteMemberSchema>
  const result = await create('team_members', {
    team_id: body.team_id ?? null,
    user_id: userId,
    invitee_email: body.email,
    role: body.role,
    invited_at: new Date(),
    created_at: new Date(),
  })

  const created = (result as { data?: Record<string, unknown> }).data ?? result
  res.status(201).json(created)
})

router.put('/:id', validateBody(updateMemberSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const id = getParamId(req)
  const existing = await findById<TeamMemberRow>('team_members', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('team.notFound', undefined, { defaultValue: 'Team member not found.' }),
    })
  }

  const body = req.body as z.infer<typeof updateMemberSchema>
  const updates: Record<string, unknown> = {}
  if (body.role !== undefined) updates.role = body.role
  if (body.joined === true) updates.joined_at = new Date()

  const result = await updateById('team_members', id, updates)
  res.json((result as { data?: Record<string, unknown> }).data ?? result)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const id = getParamId(req)
  // Synthesized owner row id starts with `self:` — refuse to delete it.
  if (id.startsWith('self:')) {
    return res.status(400).json({
      error: t('team.cannotRemoveSelf', undefined, {
        defaultValue: 'You cannot remove yourself from the team.',
      }),
    })
  }
  const existing = await findById<TeamMemberRow>('team_members', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('team.notFound', undefined, { defaultValue: 'Team member not found.' }),
    })
  }

  await deleteById('team_members', id)
  res.status(204).end()
})

export default router
