/**
 * log-viewer — distributed traces.
 *
 * Read-only in v1: the seed populates a per-user trace catalog and the
 * frontend's TraceDetail page assembles its waterfall view. POST is
 * provided for future ingest but not exercised by the UI yet.
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, type OrderBy, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { seedDemoForUser } from './_seed.js'

const router = Router()

interface TraceRow {
  id: string
  user_id: string
  root_service: string
  operation: string
  started_at: Date | string | null
  duration_ms: number
  span_count: number
  error_count: number
  status: string
  attributes: unknown
  created_at: Date
}

function decorate(row: TraceRow): Record<string, unknown> {
  let attributes: Record<string, unknown> = {}
  const a = row.attributes
  if (a && typeof a === 'object' && !Array.isArray(a)) attributes = a as Record<string, unknown>
  else if (typeof a === 'string') {
    try {
      attributes = JSON.parse(a) as Record<string, unknown>
    } catch (_error) {
      // Non-JSON attributes string; fall back to empty object.
      attributes = {}
    }
  }
  // The seeded fixture id (e.g. trc_b8d4f1a3c1) doubles as a stable
  // public identifier; UI logs reference traces by this value.
  const publicId = (attributes.fixture_id as string | undefined) ?? row.id
  return {
    id: publicId,
    db_id: row.id,
    root_service: row.root_service,
    operation: row.operation,
    duration_ms: row.duration_ms,
    span_count: row.span_count,
    error_count: row.error_count,
    status: row.status,
    started_at:
      row.started_at instanceof Date
        ? row.started_at.toISOString()
        : ((row.started_at as string | null) ?? new Date().toISOString()),
    attributes,
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  await seedDemoForUser(userId)
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const orderBy: OrderBy[] = [{ field: 'started_at', direction: 'desc' }]
  const rows = (await findMany<TraceRow>('traces', { where, orderBy })) as TraceRow[]
  res.json(rows.map(decorate))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const idParam = req.params.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam
  // Look up by the public fixture id first (e.g. trc_b8d4f1a3c1) since
  // the UI references traces by that opaque token, not the underlying
  // UUID. Fall back to a UUID lookup if the URL-id parses as a UUID.
  const matches = (await findMany<TraceRow>('traces', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'started_at', direction: 'desc' }],
    limit: 200,
  })) as TraceRow[]
  let found = matches.find((row) => {
    const a = row.attributes
    let parsed: Record<string, unknown> = {}
    if (a && typeof a === 'object' && !Array.isArray(a)) parsed = a as Record<string, unknown>
    else if (typeof a === 'string') {
      try {
        parsed = JSON.parse(a) as Record<string, unknown>
      } catch (_error) {
        // Non-JSON attributes string; treat as no match.
        parsed = {}
      }
    }
    return parsed.fixture_id === id
  })
  if (!found) {
    const direct = await findById<TraceRow>('traces', id)
    if (direct && direct.user_id === userId) found = direct
  }
  if (!found) {
    res.status(404).json({ error: t('traces.notFound', {}, { defaultValue: 'Trace not found' }) })
    return
  }
  res.json(decorate(found))
})

export default router
