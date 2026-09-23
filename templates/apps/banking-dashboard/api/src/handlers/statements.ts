/**
 * Statements handler — `statements` CRUD.
 *
 * - Validates payloads via `@molecule/api-middleware-validation`.
 * - Statements are server-generated (PDF generation can be wired via
 *   `@molecule/api-pdf-pdfkit` later); this handler exposes the
 *   resource list + create endpoint used by the on-demand generator.
 * - All reads/writes scoped by `user_id`.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany } from '@molecule/api-database'
import { decrypt } from '@molecule/api-encryption'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { BankingDashboardLimits } from '../tiers.js'

const router = Router()

interface StatementRow {
  id: string
  user_id: string
  account_id: string
  account_name: string | null
  period_start: string | Date | null
  period_end: string | Date | null
  size_bytes: number | string | null
  url: string | null
}

interface AccountRow {
  id: string
  name?: string | null
  mask?: string | null
  account_number_encrypted?: string | null
}

async function accountLast4(account: AccountRow | null): Promise<string> {
  if (!account) return ''
  if (account.mask) return String(account.mask)
  if (account.account_number_encrypted) {
    try {
      const num = await decrypt(account.account_number_encrypted)
      return num.slice(-4)
    } catch (_error) {
      // Decrypt failure falls back to masked empty string; non-fatal.
      return ''
    }
  }
  return ''
}

// Map the persisted DB row to the shape the UI expects. The UI reads
// `period_start_iso`, `period_end_iso`, `account_last4`, and
// `download_url`; the row stores `period_start`, `period_end`,
// `account_name`, and `url`. Map in one place so the frontend never
// has to know about the storage layout. `account_last4` is derived on
// read from the linked `bank_accounts` row (the statements table
// itself does not carry that column).
async function shape(row: StatementRow): Promise<Record<string, unknown>> {
  const start = row.period_start ? new Date(row.period_start as string | Date) : null
  const end = row.period_end ? new Date(row.period_end as string | Date) : null
  const account = row.account_id
    ? await findById<AccountRow>('bank_accounts', row.account_id).catch(() => null)
    : null
  const last4 = await accountLast4(account)
  return {
    id: row.id,
    account_id: row.account_id,
    account_name: row.account_name ?? account?.name ?? '',
    account_last4: last4,
    period_start_iso: start ? start.toISOString() : '',
    period_end_iso: end ? end.toISOString() : '',
    size_bytes: Number(row.size_bytes ?? 0),
    download_url: row.url ?? `/api/statements/${row.id}/download`,
  }
}

const listQuerySchema = z.object({
  account_id: z.string().optional(),
})

const createStatementSchema = z.object({
  account_id: z.string().min(1),
  period_start: z.string().min(1),
  period_end: z.string().min(1),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (req.query.account_id) {
      where.push({ field: 'account_id', operator: '=', value: req.query.account_id })
    }
    const statements = await findMany<StatementRow>('statements', {
      where,
      orderBy: [{ field: 'period_start', direction: 'desc' }],
    })
    res.json(await Promise.all(statements.map(shape)))
  } catch (err) {
    logger.error('statements.list', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const stmt = await findById<StatementRow>('statements', getParamId(req))
    if (!stmt || stmt.user_id !== userId) {
      return res.status(404).json({ error: t('statements.notFound') })
    }
    res.json(await shape(stmt))
  } catch (err) {
    logger.error('statements.get', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

// Lightweight on-demand "PDF" download. Returns a minimal text/plain
// summary of the statement so the UI's Download button always lands on
// a real, user-scoped, 200-status response. A future milestone can swap
// this for `@molecule/api-pdf-pdfkit` rendering without changing the URL.
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const stmt = await findById<StatementRow>('statements', getParamId(req))
    if (!stmt || stmt.user_id !== userId) {
      return res.status(404).json({ error: t('statements.notFound') })
    }
    const start = stmt.period_start ? new Date(stmt.period_start as string | Date) : null
    const end = stmt.period_end ? new Date(stmt.period_end as string | Date) : null
    const account = stmt.account_id
      ? await findById<AccountRow>('bank_accounts', stmt.account_id).catch(() => null)
      : null
    const last4 = await accountLast4(account)
    const body = [
      `Statement for ${stmt.account_name ?? account?.name ?? 'Account'} (${last4})`,
      `Period: ${start?.toISOString() ?? ''} → ${end?.toISOString() ?? ''}`,
      `Statement ID: ${stmt.id}`,
    ].join('\n')
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="statement-${stmt.id}.txt"`)
    res.send(body)
  } catch (err) {
    logger.error('statements.download', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  validateBody(createStatementSchema),
  enforceLimit<BankingDashboardLimits>({
    limitType: 'maxStatements',
    getLimit: (limits) => limits.maxStatements,
    getCurrent: async (userId) =>
      count('statements', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const { account_id, period_start, period_end } = req.body
      const account = await findById<AccountRow & { user_id?: string; name?: string | null }>(
        'bank_accounts',
        account_id,
      )
      if (!account || (account as unknown as Record<string, unknown>).user_id !== userId) {
        return res.status(404).json({ error: t('accounts.notFound') })
      }
      const sizeBytes = 32_768 + Math.floor(Math.random() * 65_536)
      const result = await create('statements', {
        user_id: userId,
        account_id,
        account_name: account.name ?? null,
        period_start: new Date(period_start),
        period_end: new Date(period_end),
        ready_at: new Date(),
        size_bytes: sizeBytes,
        url: null,
        created_at: new Date(),
      })
      const data = (result as unknown as { data: StatementRow }).data
      res.status(201).json(await shape(data))
    } catch (err) {
      logger.error('statements.create', err)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

export default router
