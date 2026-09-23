/**
 * Audit events handler — server-derived security & access feed.
 *
 * The app does not (yet) have a dedicated `audit_events` table populated
 * by the auth/transfer flows; instead this handler synthesises an audit
 * stream from observable events: recent completed transfers, account
 * link rows, and a synthetic current sign-in entry derived from the
 * caller's session. The result mirrors the shape the UI expects so the
 * audit page renders real, user-scoped rows on a fresh install.
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface AuditRow {
  id: string
  kind:
    | 'sign_in'
    | 'sign_out'
    | 'password_change'
    | 'transfer'
    | 'account_link'
    | 'device_added'
    | 'permission_change'
  description: string
  ip_address: string
  user_agent_brief: string
  occurred_at: string
  status: 'success' | 'failed'
}

function briefUserAgent(ua: string | undefined): string {
  if (!ua) return t('audit.uaUnknown', {}, { defaultValue: 'Unknown' })
  if (/iPhone|iPad/.test(ua)) return 'iPhone (Safari)'
  if (/Android/.test(ua)) return 'Android (Chrome)'
  if (/Mac OS X/.test(ua)) return 'Mac (Chrome)'
  if (/Windows/.test(ua)) return 'Windows (Chrome)'
  if (/Linux/.test(ua)) return 'Linux (Chrome)'
  return ua.split(' ').slice(0, 2).join(' ')
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]

    const [transfers, links] = await Promise.all([
      findMany<Record<string, unknown>>('transfers', {
        where,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 10,
      }).catch(() => []),
      findMany<Record<string, unknown>>('bank_accounts', {
        where,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 10,
      }).catch(() => []),
    ])

    const ip =
      String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '127.0.0.1')
        .split(',')[0]
        ?.trim() || '127.0.0.1'
    const ua = briefUserAgent(req.headers['user-agent'])

    const sessionEvent: AuditRow = {
      id: 'session:current',
      kind: 'sign_in',
      description: t(
        'audit.synthetic.signIn',
        {},
        { defaultValue: 'Signed in to current session' },
      ),
      ip_address: ip,
      user_agent_brief: ua,
      occurred_at: new Date().toISOString(),
      status: 'success',
    }
    // Normalise DB-returned timestamps (which can be either Date objects
    // or PG timestamp strings, depending on the driver). The synthetic
    // sign-in event is an ISO string; mixing the two formats breaks the
    // lexicographic sort below. ISO is the contract.
    const toIso = (v: unknown): string => {
      if (v instanceof Date) return v.toISOString()
      if (typeof v === 'string') {
        const d = new Date(v)
        return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
      }
      return new Date().toISOString()
    }

    const transferEvents: AuditRow[] = transfers.map((row) => ({
      id: `transfer:${String(row.id)}`,
      kind: 'transfer',
      description: t(
        'audit.synthetic.transfer',
        { description: String(row.description ?? '') },
        { defaultValue: 'Transfer scheduled — {{description}}' },
      ),
      ip_address: ip,
      user_agent_brief: ua,
      occurred_at: toIso(row.created_at),
      status: row.status === 'failed' ? 'failed' : 'success',
    }))
    const linkEvents: AuditRow[] = links.map((row) => ({
      id: `link:${String(row.id)}`,
      kind: 'account_link',
      description: t(
        'audit.synthetic.accountLink',
        { name: String(row.name ?? '') },
        { defaultValue: 'Linked account {{name}}' },
      ),
      ip_address: ip,
      user_agent_brief: ua,
      occurred_at: toIso(row.created_at),
      status: 'success',
    }))
    const events: AuditRow[] = [sessionEvent, ...transferEvents, ...linkEvents]
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .slice(0, 50)

    res.json({ data: events, total: events.length })
  } catch (err) {
    logger.error('audit_events.list', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
