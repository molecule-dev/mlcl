/**
 * Team handler — minimal directory of users in this internal-announcements
 * workspace. Internal company tooling, so an authenticated employee can
 * see the full roster (id, name, email, role hint). Sensitive secrets
 * (password hash, oauth tokens, plan info) are stripped.
 *
 * Powers /people (TeamDirectory), the author-name lookup in Feed and
 * AnnouncementDetail, and the "to:" target picker in Composer.
 */
import { type Request, type Response, Router } from 'express'

import { findMany } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

import { internalError, requireUser, type UserRow } from '../lib/authz.js'

const router = Router()

interface TeamMember {
  id: string
  name: string
  email: string | null
  username: string | null
  role: string | null
  isAdmin: boolean
  isMe: boolean
}

function deriveName(u: UserRow): string {
  if (u.name && u.name.trim()) return u.name.trim()
  if (u.email) return u.email.split('@')[0] ?? u.email
  if (u.username) return u.username
  return 'Teammate'
}

router.get('/', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const rows = await findMany<UserRow>('users', {
      orderBy: [{ field: 'email', direction: 'asc' }],
      limit: 500,
    })
    const team: TeamMember[] = rows.map((u) => {
      const od = (u.oauthData ?? {}) as Record<string, unknown>
      const role = typeof od.role === 'string' ? (od.role as string) : null
      const isAdmin = od.isAdmin === true || u.id === ownerId
      return {
        id: u.id,
        name: deriveName(u),
        email: u.email,
        username: u.username,
        role,
        isAdmin,
        isMe: u.id === ownerId,
      }
    })
    res.json(team)
  } catch (error) {
    logger.error('team.list', error)
    internalError(res)
  }
})

export default router
