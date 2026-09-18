import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'

import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

const COLUMNS = ['id', 'created_at', 'total', 'status', 'customer_email'] as const

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  let s = String(value)
  // Neutralize CSV/formula injection (CWE-1236): a cell beginning with = + - @ or a
  // leading tab/CR is executed as a formula by Excel/Sheets/LibreOffice when the
  // export is opened (`=HYPERLINK(...)`, `=cmd|'/c calc'!A1`, data-exfil via
  // `=IMPORTXML(...)`). Any field an attacker can influence (a customer_email, a
  // name, a status note) is a vector. Prefix such a cell with a single quote so
  // it's treated as literal text — but NOT a plain number (`-5` must stay numeric).
  if (!/^-?\d+(\.\d+)?$/.test(s) && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`
  return s
}

const router = Router()

router.get('/export.csv', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  // Scope to the current user's orders — never stream another user's rows into the export.
  // For an admin/merchant "export all orders" view, drop this filter and require an admin
  // role on the route instead.
  const where: { field: string; operator: '='; value: unknown }[] = [
    { field: 'user_id', operator: '=', value: userId },
  ]
  if (typeof req.query.status === 'string') {
    where.push({ field: 'status', operator: '=', value: req.query.status })
  }

  const today = new Date().toISOString().slice(0, 10)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="orders-${today}.csv"`)
  res.write(COLUMNS.join(',') + '\n')

  // Stream in pages of 1000 to avoid loading everything into memory.
  const PAGE_SIZE = 1000
  let offset = 0
  while (true) {
    const batch = await findMany('orders', {
      where,
      orderBy: [{ field: 'created_at', direction: 'asc' }],
      limit: PAGE_SIZE,
      offset,
    })
    if (batch.length === 0) break
    for (const row of batch) {
      const r = row as Record<string, unknown>
      res.write(COLUMNS.map((c) => csvEscape(r[c])).join(',') + '\n')
    }
    if (batch.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  res.end()
})

export default router
