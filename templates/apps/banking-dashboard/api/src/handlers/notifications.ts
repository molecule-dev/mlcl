/**
 * Notifications handler — synthesises a unified activity feed for the
 * banking-dashboard.
 *
 * The app does not have a dedicated `notifications` table populated with
 * domain rows; instead we derive notification items from existing
 * server-owned events (recent transactions, transfers, statements ready,
 * audit events). This guarantees the UI always renders real, server-
 * derived rows even on a fresh install — no client-side fixtures.
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface FeedItem {
  id: string
  type:
    | 'transaction_alert'
    | 'security_event'
    | 'statement_ready'
    | 'transfer_complete'
    | 'low_balance'
    | 'system_message'
  title: string
  body: string
  href: string | null
  created_at: string
  unread: boolean
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]

    const [recentTx, recentTransfers, recentStatements] = await Promise.all([
      findMany<Record<string, unknown>>('bank_transactions', {
        where,
        orderBy: [{ field: 'posted_at', direction: 'desc' }],
        limit: 5,
      }).catch(() => []),
      findMany<Record<string, unknown>>('transfers', {
        where: [...where, { field: 'status', operator: '=', value: 'completed' }],
        orderBy: [{ field: 'completed_at', direction: 'desc' }],
        limit: 5,
      }).catch(() => []),
      findMany<Record<string, unknown>>('statements', {
        where,
        orderBy: [{ field: 'ready_at', direction: 'desc' }],
        limit: 3,
      }).catch(() => []),
    ])

    // Normalise DB-returned timestamps to ISO so the lexicographic sort
    // below is well-defined regardless of whether the driver hands us a
    // Date object or a PG timestamp string.
    const toIso = (v: unknown, fallback: unknown = null): string => {
      const cand = v ?? fallback
      if (cand instanceof Date) return cand.toISOString()
      if (typeof cand === 'string') {
        const d = new Date(cand)
        return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
      }
      return new Date().toISOString()
    }

    const items: FeedItem[] = [
      ...recentTx.map((row) => ({
        id: `tx:${String(row.id)}`,
        type: 'transaction_alert' as const,
        title: String(
          row.merchant ??
            t('notifications.derived.txTitle', {}, { defaultValue: 'New transaction' }),
        ),
        body: String(row.category ?? ''),
        href: `/accounts/${String(row.account_id)}`,
        created_at: toIso(row.posted_at, row.created_at),
        unread: true,
      })),
      ...recentTransfers.map((row) => ({
        id: `xfer:${String(row.id)}`,
        type: 'transfer_complete' as const,
        title: t('notifications.derived.transferTitle', {}, { defaultValue: 'Transfer complete' }),
        body: String(row.description ?? ''),
        href: '/transfers',
        created_at: toIso(row.completed_at, row.created_at),
        unread: false,
      })),
      ...recentStatements.map((row) => ({
        id: `stmt:${String(row.id)}`,
        type: 'statement_ready' as const,
        title: t('notifications.derived.statementTitle', {}, { defaultValue: 'Statement ready' }),
        body: String(row.account_name ?? ''),
        href: '/statements',
        created_at: toIso(row.ready_at, row.created_at),
        unread: false,
      })),
    ]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 25)

    res.json({ data: items, total: items.length })
  } catch (err) {
    logger.error('notifications.list', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
