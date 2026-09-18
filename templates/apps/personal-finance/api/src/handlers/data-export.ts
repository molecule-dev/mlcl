import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

// Tables that belong to a user — every one is scoped by `user_id` so a user only
// ever exports their OWN rows.
const USER_TABLES = ['accounts', 'transactions', 'budgets', 'goals', 'categories'] as const

/**
 * `GET /export/data` — the signed-in user's full dataset as one JSON document
 * (GDPR "download my data"). Encrypted columns (`*_encrypted`, e.g. the account
 * number) are omitted: exporting ciphertext is both useless to the user and an
 * unnecessary exposure. Owner-scoped by `user_id` on every table.
 */
router.get('/data', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }

  const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
  const data: Record<string, unknown[]> = {}
  for (const table of USER_TABLES) {
    const rows = (await findMany(table, { where })) as Record<string, unknown>[]
    data[table] = rows.map((row) =>
      Object.fromEntries(Object.entries(row).filter(([key]) => !key.endsWith('_encrypted'))),
    )
  }

  res.setHeader('Content-Disposition', 'attachment; filename="personal-finance-export.json"')
  res.json({ exportedAt: new Date().toISOString(), ...data })
})

export default router
