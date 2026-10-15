/**
 * Transfers handler — `transfers` create + list, with atomic ledger update.
 *
 * - Validates payloads via `@molecule/api-middleware-validation`.
 * - Enforces `from_account.available_cents >= amount_cents` (insufficient
 *   funds → 400 with translated error, no balance mutation).
 * - Updates both account balances + writes a ledger row in
 *   `bank_transactions` for the immediately-posted case.
 * - Audits via `@molecule/api-audit` and emails confirmation via
 *   `@molecule/api-emails`.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { log } from '@molecule/api-audit'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, query, withTransaction } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { BankingDashboardLimits } from '../tiers.js'

const router = Router()

/** A transfer refused inside its transaction: rolled back, answered with this status. */
class TransferRefused extends Error {
  constructor(
    readonly status: number,
    readonly key: string,
  ) {
    super(key)
  }
}

const createTransferSchema = z.object({
  from_account_id: z.string().min(1),
  to_account_id: z.string().min(1).optional(),
  recipient_id: z.string().min(1).optional(),
  amount_cents: z.number().int().positive(),
  description: z.string().optional(),
  scheduled_date: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const transfers = await findMany('transfers', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(transfers)
  } catch (err) {
    logger.error('transfers.list', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const tr = await findById<Record<string, unknown>>('transfers', getParamId(req))
    if (!tr || tr.user_id !== userId) {
      return res.status(404).json({ error: t('transfers.notFound') })
    }
    res.json(tr)
  } catch (err) {
    logger.error('transfers.get', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  validateBody(createTransferSchema),
  enforceLimit<BankingDashboardLimits>({
    limitType: 'maxTransfers',
    getLimit: (limits) => limits.maxTransfers,
    getCurrent: async (userId) =>
      count('transfers', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const {
        from_account_id,
        to_account_id,
        recipient_id,
        amount_cents,
        description,
        scheduled_date,
      } = req.body

      const fromAccount = await findById<Record<string, unknown>>('bank_accounts', from_account_id)
      if (!fromAccount || fromAccount.user_id !== userId) {
        return res.status(404).json({ error: t('transfers.sourceNotFound') })
      }

      const fromAvailable = Number(fromAccount.available_cents ?? 0)
      if (fromAvailable < amount_cents) {
        return res.status(400).json({ error: t('transfers.insufficientFunds') })
      }

      let toAccount: Record<string, unknown> | null = null
      if (to_account_id) {
        toAccount = await findById<Record<string, unknown>>('bank_accounts', to_account_id)
        if (!toAccount || toAccount.user_id !== userId) {
          return res.status(404).json({ error: t('transfers.destinationNotFound') })
        }
      } else if (recipient_id) {
        const recipient = await findById<Record<string, unknown>>('recipients', recipient_id)
        if (!recipient || recipient.user_id !== userId) {
          return res.status(404).json({ error: t('transfers.recipientNotFound') })
        }
      } else {
        return res.status(400).json({ error: t('transfers.destinationRequired') })
      }

      const isScheduled = Boolean(scheduled_date)

      let transferRow: Record<string, unknown> | undefined

      if (isScheduled) {
        // Scheduled transfers do not move money yet — no balance mutation, so a
        // plain insert is sufficient.
        const result = await create('transfers', {
          user_id: userId,
          from_account_id,
          to_account_id: to_account_id ?? null,
          recipient_id: recipient_id ?? null,
          amount_cents,
          description: description ?? null,
          status: 'scheduled',
          scheduled_date: new Date(scheduled_date as string),
          completed_at: null,
          created_at: new Date(),
        })
        transferRow = (result as { data: Record<string, unknown> }).data
      } else {
        // Immediately-posted transfer: the debit, the destination credit, the
        // transfer row, and both ledger rows MUST be atomic. We run them inside
        // ONE DB transaction and perform the debit as a single CONDITIONAL
        // UPDATE that affects 0 rows when funds are insufficient. This removes
        // the read-check-write (TOCTOU) gap entirely — concurrent requests
        // serialize on the row, and the second one fails the
        // `available_cents >= $amt` guard instead of overwriting a stale-base
        // absolute value (double-spend / overdraft). The DataStore has no
        // atomic decrement, so the conditional UPDATE is raw SQL; withTransaction
        // makes every query() inside it (and any CRUD helper) one transaction,
        // committed when the callback returns and rolled back when it throws.
        try {
          transferRow = await withTransaction(async () => {
            const now = new Date()

            const debit = await query<{ balance_cents: number; available_cents: number }>(
              `UPDATE bank_accounts
               SET balance_cents = balance_cents - $1, available_cents = available_cents - $1
             WHERE id = $2 AND user_id = $3 AND available_cents >= $1
             RETURNING balance_cents, available_cents`,
              [amount_cents, from_account_id, userId],
            )
            if (debit.rowCount === 0 || debit.rows.length === 0) {
              throw new TransferRefused(400, 'transfers.insufficientFunds')
            }
            const newFromAvailable = Number(debit.rows[0].available_cents)

            let newToAvailable: number | null = null
            if (toAccount) {
              const credit = await query<{ available_cents: number }>(
                `UPDATE bank_accounts
                 SET balance_cents = balance_cents + $1, available_cents = available_cents + $1
               WHERE id = $2 AND user_id = $3
               RETURNING available_cents`,
                [amount_cents, to_account_id, userId],
              )
              if (credit.rowCount === 0 || credit.rows.length === 0) {
                throw new TransferRefused(404, 'transfers.destinationNotFound')
              }
              newToAvailable = Number(credit.rows[0].available_cents)
            }

            const inserted = await query<Record<string, unknown>>(
              `INSERT INTO transfers
               (user_id, from_account_id, to_account_id, recipient_id, amount_cents,
                description, status, scheduled_date, completed_at, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $9)
             RETURNING *`,
              [
                userId,
                from_account_id,
                to_account_id ?? null,
                recipient_id ?? null,
                amount_cents,
                description ?? null,
                'completed',
                now,
                now,
              ],
            )

            await query(
              `INSERT INTO bank_transactions
               (user_id, account_id, amount_cents, merchant, category, method,
                status, posted_at, running_balance_cents, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                userId,
                from_account_id,
                -Math.abs(amount_cents),
                description ?? 'Transfer',
                'transfer',
                'transfer',
                'posted',
                now,
                newFromAvailable,
                now,
              ],
            )

            if (toAccount) {
              await query(
                `INSERT INTO bank_transactions
                 (user_id, account_id, amount_cents, merchant, category, method,
                  status, posted_at, running_balance_cents, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                  userId,
                  to_account_id,
                  Math.abs(amount_cents),
                  description ?? 'Transfer',
                  'transfer',
                  'transfer',
                  'posted',
                  now,
                  newToAvailable,
                  now,
                ],
              )
            }

            return inserted.rows[0]
          })
        } catch (err) {
          if (err instanceof TransferRefused)
            return res.status(err.status).json({ error: t(err.key) })
          throw err
        }
      }

      if (!transferRow) {
        return res.status(500).json({ error: t('errors.internalServer') })
      }

      try {
        await log({
          actor: userId,
          action: 'transfer.created',
          resource: 'transfer',
          resourceId: String(transferRow.id),
          details: {
            amount_cents,
            from: from_account_id,
            to: to_account_id ?? recipient_id ?? null,
          },
        })
      } catch (_error) {
        // audit failures must not fail the user-visible request
      }
      try {
        const session = res.locals.session as { email?: string } | undefined
        if (session?.email) {
          await sendMail({
            from:
              process.env.EMAIL_FROM ??
              `no-reply@${process.env.MAILGUN_DOMAIN ?? 'banking-dashboard.local'}`,
            to: session.email,
            subject: t(
              'transfers.confirmationSubject',
              {},
              { defaultValue: 'Transfer confirmation' },
            ),
            text: t(
              'transfers.confirmationBody',
              {
                amount: `$${(amount_cents / 100).toFixed(2)}`,
                description: description ?? '',
              },
              {
                defaultValue: 'Your transfer of {{amount}} has been initiated. {{description}}',
              },
            ),
          })
        }
      } catch (_error) {
        // email failures must not fail the user-visible request
      }

      res.status(201).json(transferRow)
    } catch (err) {
      logger.error('transfers.create', err)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

export default router
