import express, { type NextFunction, type Request, type Response } from 'express'
import { Router } from 'express'
import { parse } from 'csv-parse/sync'
import { z } from 'zod'

import { create, findMany } from '@molecule/api-database'
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
  } catch (err) {
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
  } catch (err) {
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
  for (const r of valid) {
    const existing = await findMany('customers', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'email', operator: '=', value: r.data.email },
      ],
      limit: 1,
    })
    if (existing.length > 0) {
      // Upsert by email — natural key WITHIN this user's customers.
      const { updateById } = await import('@molecule/api-database')
      await updateById('customers', (existing[0] as { id: string }).id, r.data)
      updated++
    } else {
      await create('customers', {
        ...r.data,
        user_id: userId,
        created_at: new Date().toISOString(),
      })
      imported++
    }
  }
  res.json({ imported, updated, skipped: invalid.length, invalid })
})

export default router
