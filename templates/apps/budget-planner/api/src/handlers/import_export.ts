/**
 * CSV import + JSON/CSV export for the user's budget data.
 *
 *   POST /api/import/preview   — parse the uploaded CSV and report the row
 *                                 count + the first few mapped rows. No
 *                                 writes; lets the UI confirm what will land
 *                                 before committing.
 *   POST /api/import/commit    — actually persist the parsed rows into
 *                                 budget_transactions and recompute every
 *                                 affected account's balance.
 *   GET  /api/export/transactions.csv — CSV dump of the user's transactions
 *   GET  /api/export/transactions.json — JSON dump (for Settings → Data)
 *
 * No file system; the request body is the raw CSV text. We deliberately do
 * not lean on multipart upload here so a simple JSON body works from the
 * frontend without form-data plumbing.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { decorateTransactionsForUser } from '../lib/decorate.js'
import { applyOpeningBalanceRecompute, signedAmount } from '../lib/recompute.js'

const router = Router()

interface AccountRow {
  id: string
  user_id: string
  name: string
}

interface CategoryRow {
  id: string
  user_id: string
  name: string
}

const previewSchema = z.object({
  csv: z.string().min(1),
  account_id: z.string().min(1),
})

const commitSchema = z.object({
  account_id: z.string().min(1),
  rows: z
    .array(
      z.object({
        date: z.string(),
        payee: z.string(),
        memo: z.string().nullable().optional(),
        category_name: z.string().nullable().optional(),
        amount_cents: z.number().int(),
        type: z.enum(['inflow', 'outflow']),
      }),
    )
    .min(1),
})

interface ParsedRow {
  date: string
  payee: string
  memo: string | null
  category_name: string | null
  amount_cents: number
  type: 'inflow' | 'outflow'
}

/**
 * Tiny CSV parser tolerant of quoted fields with commas. Rejects multiline
 * quoted values to keep the surface small — banks export single-line rows
 * in practice.
 */
function parseCsv(input: string): string[][] {
  const lines = input
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => line.length > 0)
  return lines.map((line) => {
    const out: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
        continue
      }
      if (ch === ',' && !inQuotes) {
        out.push(current)
        current = ''
        continue
      }
      current += ch
    }
    out.push(current)
    return out.map((c) => c.trim())
  })
}

function findHeader(headers: string[], candidates: string[]): number {
  const norm = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
  for (const cand of candidates) {
    const target = cand.toLowerCase().replace(/[^a-z0-9]/g, '')
    const idx = norm.indexOf(target)
    if (idx >= 0) return idx
  }
  return -1
}

function rowsFromCsv(csv: string): ParsedRow[] {
  const grid = parseCsv(csv)
  if (grid.length < 2) return []
  const headers = grid[0]
  const dateIdx = findHeader(headers, ['date', 'posted', 'transactiondate'])
  const payeeIdx = findHeader(headers, ['payee', 'description', 'merchant', 'name'])
  const memoIdx = findHeader(headers, ['memo', 'notes', 'note'])
  const categoryIdx = findHeader(headers, ['category'])
  const amountIdx = findHeader(headers, ['amount', 'value'])
  const debitIdx = findHeader(headers, ['debit', 'withdrawal'])
  const creditIdx = findHeader(headers, ['credit', 'deposit'])

  if (dateIdx < 0 || (amountIdx < 0 && debitIdx < 0 && creditIdx < 0)) return []

  const rows: ParsedRow[] = []
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r]
    if (cells.length < 2) continue
    const date = cells[dateIdx] || ''
    if (!date) continue
    const payee = (payeeIdx >= 0 ? cells[payeeIdx] : '') || 'Imported'
    const memo = memoIdx >= 0 ? cells[memoIdx] || null : null
    const category = categoryIdx >= 0 ? cells[categoryIdx] || null : null
    let signedDecimal: number
    if (amountIdx >= 0 && cells[amountIdx]) {
      signedDecimal = Number(cells[amountIdx].replace(/[$,]/g, ''))
    } else {
      const debit = debitIdx >= 0 ? Number((cells[debitIdx] ?? '0').replace(/[$,]/g, '')) || 0 : 0
      const credit =
        creditIdx >= 0 ? Number((cells[creditIdx] ?? '0').replace(/[$,]/g, '')) || 0 : 0
      signedDecimal = credit - debit
    }
    if (!Number.isFinite(signedDecimal)) continue
    const cents = Math.round(signedDecimal * 100)
    rows.push({
      date,
      payee,
      memo,
      category_name: category,
      amount_cents: cents,
      type: cents >= 0 ? 'inflow' : 'outflow',
    })
  }
  return rows
}

router.post('/import/preview', validateBody(previewSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const { csv, account_id } = req.body as z.infer<typeof previewSchema>
  // Validate the account exists and belongs to the user.
  const owns = await findMany<AccountRow>('budget_accounts', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'id', operator: '=', value: account_id },
    ],
    limit: 1,
  })
  if (owns.length === 0) return res.status(404).json({ error: t('accounts.notFound') })
  const rows = rowsFromCsv(csv)
  res.json({
    detected: rows.length,
    sample: rows.slice(0, 5),
    rows,
  })
})

router.post('/import/commit', validateBody(commitSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const { account_id, rows } = req.body as z.infer<typeof commitSchema>
  const owns = await findMany<AccountRow>('budget_accounts', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'id', operator: '=', value: account_id },
    ],
    limit: 1,
  })
  if (owns.length === 0) return res.status(404).json({ error: t('accounts.notFound') })
  // Resolve category names → existing category IDs (case-insensitive).
  const cats = await findMany<CategoryRow>('budget_categories', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  })
  const catByName = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]))
  let inserted = 0
  for (const row of rows) {
    const categoryId = row.category_name
      ? (catByName.get(row.category_name.toLowerCase()) ?? null)
      : null
    const signed = signedAmount(row.amount_cents / 100, row.type)
    await create('budget_transactions', {
      user_id: userId,
      account_id,
      category_id: categoryId,
      payee: row.payee || null,
      amount: signed,
      type: row.type,
      date: new Date(row.date),
      memo: row.memo || null,
      cleared: false,
      created_at: new Date(),
    })
    inserted++
  }
  await applyOpeningBalanceRecompute(account_id, userId)
  res.status(201).json({ inserted })
})

router.get('/export/transactions.json', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const txs = await findMany('budget_transactions', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'date', direction: 'desc' }],
  })
  const decorated = await decorateTransactionsForUser(txs, userId)
  res.setHeader('Content-Disposition', 'attachment; filename="coffer-transactions.json"')
  res.json(decorated)
})

router.get('/export/transactions.csv', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const txs = await findMany('budget_transactions', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'date', direction: 'desc' }],
  })
  const decorated = await decorateTransactionsForUser(txs, userId)
  const escape = (v: unknown): string => {
    let s = v == null ? '' : String(v)
    // [L2-1] Neutralize CSV/formula injection (CWE-1236): a cell starting with = + - @ or a
    // leading tab/CR is executed as a formula by Excel/Sheets/LibreOffice. Prefix a single
    // quote (the standard text marker, stripped on display) BEFORE RFC-4180 quoting; genuine
    // numbers are exempt so negative values aren't mangled (mirrors the shared csv escapeField).
    if (!/^-?\d+(\.\d+)?$/.test(s) && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }
  const header = ['date', 'payee', 'category', 'account', 'amount_cents', 'type', 'memo'].join(',')
  const lines = [header]
  for (const t of decorated) {
    lines.push(
      [
        t.posted_at,
        escape(t.payee),
        escape(t.category),
        escape(t.account_name),
        t.amount_cents,
        t.type,
        escape(t.memo),
      ].join(','),
    )
  }
  const body = lines.join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="coffer-transactions.csv"')
  res.send(body)
})

export default router
