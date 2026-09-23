/**
 * Linked-accounts handler — exposes the user's linked institutions for
 * the Settings page. Derived from rows in `bank_accounts` that carry an
 * `institution` value.
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface BankAccountRow {
  id: string
  institution: string | null
  mask: string | null
  kind: string | null
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const rows = await findMany<BankAccountRow>('bank_accounts', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    }).catch(() => [])

    const data = rows
      .filter((row) => Boolean(row.institution))
      .map((row) => ({
        id: row.id,
        kind: row.kind === 'brokerage' ? 'manual' : 'plaid',
        institution: row.institution as string,
        last4: row.mask ?? '0000',
      }))

    res.json({ data, total: data.length })
  } catch (err) {
    logger.error('linked_accounts.list', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
