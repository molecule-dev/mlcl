import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

import { ensureSeed } from './_seed.js'

const router = Router()

const alertsQuerySchema = z.object({
  /** all=1 includes inactive (expired / future) alerts for the audit view. */
  all: z.string().optional(),
  line: z.string().min(1).max(8).optional(),
})

/**
 * GET /alerts — service alerts. By default only ACTIVE ones (now within
 * [starts_at, ends_at]; ends_at NULL = open-ended) with the line metadata
 * joined for rendering. line_code NULL means system-wide — the row carries
 * no line object. Read-only: alerts are agency-side data, not user content.
 */
router.get('/', validateQuery(alertsQuerySchema), async (req: Request, res: Response) => {
  try {
    await ensureSeed()
    const { all, line } = req.query as Record<string, string | undefined>
    const [alertRows, lineRows] = await Promise.all([
      findMany<Record<string, unknown>>('transit_alerts', {
        orderBy: [{ field: 'starts_at', direction: 'desc' }],
      }),
      findMany<Record<string, unknown>>('transit_lines', {}),
    ])
    const lineByCode = new Map(
      lineRows.map((row) => [
        String(row.code ?? ''),
        {
          code: String(row.code ?? ''),
          name: String(row.name ?? ''),
          kind: String(row.kind ?? 'bus'),
          color: String(row.color ?? '#000000'),
        },
      ]),
    )

    const now = Date.now()
    const rows = alertRows.filter((row) => {
      if (line && String(row.line_code ?? '') !== line.toUpperCase()) return false
      if (all === '1') return true
      const startsAt = new Date(String(row.starts_at)).getTime()
      const endsAt = row.ends_at
        ? new Date(String(row.ends_at)).getTime()
        : Number.POSITIVE_INFINITY
      return startsAt <= now && now <= endsAt
    })

    res.json(
      rows.map((row) => ({
        id: String(row.id ?? ''),
        line_code: row.line_code ? String(row.line_code) : null,
        line: row.line_code ? (lineByCode.get(String(row.line_code)) ?? null) : null,
        severity: String(row.severity ?? 'info'),
        title: String(row.title ?? ''),
        body: row.body ? String(row.body) : null,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
      })),
    )
  } catch (err) {
    console.error('[alerts.list] failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
