/**
 * webhook-manager — internal audit-log writer.
 *
 * Mutating handlers (webhooks, api_keys, team_members, profile) call
 * `recordAudit()` after a successful side effect so the AuditLog page
 * can show the real history of actions on a workspace. Writes are
 * best-effort: a failure here is logged but never breaks the main
 * response, since "we did the action but couldn't log it" is still a
 * valid outcome for the user.
 */

import type { Request } from 'express'

import { create } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

interface RecordAuditArgs {
  userId: string | null
  action: string
  target?: string | null
  actor?: string | null
  actorType?: 'user' | 'system'
  metadata?: Record<string, unknown>
  req?: Request
}

const extractIp = (req: Request | undefined): string | null => {
  if (!req) return null
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0]?.trim() ?? null
  if (Array.isArray(fwd) && fwd.length > 0) return fwd[0].split(',')[0]?.trim() ?? null
  return req.socket.remoteAddress ?? null
}

export const recordAudit = async ({
  userId,
  action,
  target = null,
  actor = null,
  actorType = 'user',
  metadata = {},
  req,
}: RecordAuditArgs): Promise<void> => {
  if (!userId) return
  try {
    await create('audit_events', {
      user_id: userId,
      action,
      target,
      actor,
      actor_type: actorType,
      ip_address: extractIp(req),
      metadata: JSON.stringify(metadata),
      occurred_at: new Date(),
      created_at: new Date(),
    })
  } catch (err) {
    logger.error({ err, action, userId }, 'audit-write-failed')
  }
}
