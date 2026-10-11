import { parse } from 'csv-parse/sync'
import express, { type NextFunction, type Request, type Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

// Accept text/csv, text/plain, and application/octet-stream so the client
// can POST the raw CSV bytes without requiring a multipart form.
const csvUpload = express.raw({
  type: ['text/csv', 'text/plain', 'application/octet-stream'],
  limit: '10mb',
})

const customerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  company: z.string().max(200).optional().default(''),
})

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

type Row = Record<string, string>
type ValidatedRow = { row: number; data: z.infer<typeof customerSchema> }
type ErrorRow = { row: number; errors: string[] }

/**
 * How many per-row validation errors `POST /commit` reports back.
 *
 * The detail list is a WINDOW, not the whole set: each entry carries a row
 * number plus every validation message for that row, so returning one per
 * rejected row made the RESPONSE grow with the upload — and the upload cap is
 * `limit: '10mb'`, i.e. a file of short malformed rows (millions of them) turned
 * a 10 mb request into hundreds of megabytes of JSON, buffered in the process
 * before a byte is written, for a list the client never renders. `skipped` stays
 * the TRUE count of rejected rows, and `/preview` already returns the per-row
 * errors for the rows it checks, so keeping the first page of them here is the
 * whole detail a caller can use.
 */
export const MAX_REPORTED_ERRORS = 50

function validateRows(rows: Row[]): { valid: ValidatedRow[]; invalid: ErrorRow[] } {
  const valid: ValidatedRow[] = []
  const invalid: ErrorRow[] = []
  for (let i = 0; i < rows.length; i++) {
    const parsed = customerSchema.safeParse(rows[i])
    if (parsed.success) {
      valid.push({ row: i + 2, data: parsed.data }) // +2 for header + 1-indexed
    } else {
      invalid.push({
        row: i + 2,
        errors: parsed.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`),
      })
    }
  }
  return { valid, invalid }
}

const router = Router()

router.post('/preview', requireAuth, csvUpload, (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res
      .status(400)
      .json({ error: t('import.noFile', undefined, { defaultValue: 'No file uploaded' }) })
  }
  let rows: Row[]
  try {
    rows = parse(req.body, { columns: true, trim: true, skip_empty_lines: true }) as Row[]
  } catch (_error) {
    // csv-parse's message is parser-internal noise for the user — the 400 body
    // names the outcome and the client shows it.
    return res
      .status(400)
      .json({ error: t('import.parseFailed', undefined, { defaultValue: 'Could not parse CSV' }) })
  }
  const { valid, invalid } = validateRows(rows.slice(0, 50))
  res.json({
    totalRows: rows.length,
    previewRows: rows.slice(0, 50),
    valid: valid.length,
    invalid,
  })
})

router.post('/commit', requireAuth, csvUpload, async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res
      .status(400)
      .json({ error: t('import.noFile', undefined, { defaultValue: 'No file uploaded' }) })
  }
  let rows: Row[]
  try {
    rows = parse(req.body, { columns: true, trim: true, skip_empty_lines: true }) as Row[]
  } catch (_error) {
    // Same policy as /preview: the parse failure is reported, not echoed.
    return res
      .status(400)
      .json({ error: t('import.parseFailed', undefined, { defaultValue: 'Could not parse CSV' }) })
  }
  const { valid, invalid } = validateRows(rows)

  // Scope every customer to the importing user — email is only a natural key WITHIN one
  // user's list. Without the user_id filter the upsert matches ANY user's customer with
  // that email, so importing a common address (e.g. info@acme.com) would silently
  // OVERWRITE another user's customer row — cross-tenant corruption. Set user_id on
  // create too, or the new rows are unowned and never show in that user's list.
  const userId = res.locals.session.userId as string

  let imported = 0
  let updated = 0
  // Existence is resolved ONE `in` QUERY PER CHUNK instead of one findMany per
  // row: the upload cap is 10mb — tens of thousands of rows — and a per-row
  // probe costs two round-trips per row, holding the request (and a database
  // connection) for minutes. Writes stay per-row: the abstract DataStore has no
  // bulk write, and handlers never drop to raw SQL. Rows are processed in file
  // order and every create records its new id in the map, so a duplicate email
  // later in the SAME file updates the row the earlier row just created — the
  // same outcome the old per-row find saw.
  const CHUNK = 500
  try {
    for (let start = 0; start < valid.length; start += CHUNK) {
      const chunk = valid.slice(start, start + CHUNK)
      const existingRows = (await findMany('customers', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'email', operator: 'in', value: [...new Set(chunk.map((r) => r.data.email))] },
        ],
      })) as Array<{ id: string; email: string }>
      const existingByEmail = new Map(existingRows.map((row) => [row.email, row.id]))
      for (const r of chunk) {
        const existingId = existingByEmail.get(r.data.email)
        if (existingId !== undefined) {
          // Upsert by email — natural key WITHIN this user's customers.
          await updateById('customers', existingId, r.data)
          updated++
        } else {
          const created = (await create('customers', {
            ...r.data,
            user_id: userId,
            created_at: new Date().toISOString(),
          })) as { data?: { id?: string } | null }
          const newId = created?.data?.id
          if (typeof newId === 'string') existingByEmail.set(r.data.email, newId)
          imported++
        }
      }
    }
  } catch (error) {
    // A write can fail partway through the file (a dropped connection, a
    // constraint, a full disk). The rows written BEFORE it stay — the abstract
    // DataStore has no transaction, and this handler never drops to raw SQL for
    // one — so a bare 500 reads as "nothing was imported" while the data is
    // already stored: the next attempt re-upserts by email and converges, but in
    // the meantime the answer is a lie. Report how far the import got, and log
    // the cause (which is not user-facing detail).
    console.error('[csv-import] commit stopped partway through', error)
    return res.status(500).json({
      error: t('import.commitFailed', undefined, {
        defaultValue: 'The import stopped partway through — the rows already written were kept.',
      }),
      // The counts ARE the message: what the server holds now.
      imported,
      updated,
      skipped: invalid.length,
    })
  }
  res.json({
    imported,
    updated,
    // The TRUE number of rejected rows — every invalid row in the file, whether
    // or not its detail is in the window below.
    skipped: invalid.length,
    // A WINDOW, in file order — see MAX_REPORTED_ERRORS: the full list made the
    // response scale with the upload, and the client shows counts only.
    invalid: invalid.slice(0, MAX_REPORTED_ERRORS),
  })
})

export default router
