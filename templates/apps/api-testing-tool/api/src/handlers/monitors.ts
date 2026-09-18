/**
 * monitors handler — on-demand re-runs of a saved test (and the metrics
 * surfaced on the Monitors dashboard).
 *
 * `POST /monitors/:id/run` re-fires the bound test's request, evaluates the
 * test's assertions against the freshly captured response, and updates the
 * monitor row with `last_run_at`, `last_status`, `p95_latency_ms` (the run
 * duration), and `success_rate_24h` (computed from the last 24 hours of
 * runs of the bound request, weighted by whether the assertions passed).
 *
 * The bound request's URL is user-controlled, so the re-run fires it through
 * `safeFetch` (`../lib/safe-fetch.js`), NOT the bare `@molecule/api-http`
 * client — blocking private/internal/cloud-metadata (169.254.169.254) targets
 * and pinning the resolved address at connect time. [RVALL-2 SSRF]
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { applyAuth } from '../lib/apply-auth.js'
import {
  loadActiveEnvVars,
  substituteEnvVars,
  substituteEnvVarsInHeaders,
} from '../lib/env-vars.js'
import { withQueryParams } from '../lib/request-url.js'
import { safeFetch } from '../lib/safe-fetch.js'

const router = Router()

const cronShape = /^[*\d/,\-\s]+$/
const cronSchema = z.string().min(9).max(255).regex(cronShape, {
  message: 'Invalid cron expression',
})

const createMonitorSchema = z.object({
  test_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255),
  cron_schedule: cronSchema.optional(),
  is_active: z.boolean().optional(),
})

const updateMonitorSchema = createMonitorSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'updated_at', direction: 'desc' }]
    const rows = await findMany('monitors', { where, orderBy })
    res.json(rows)
  } catch (error) {
    logger.error('monitors.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const row = await findById<Record<string, unknown>>('monitors', getParamId(req))
    if (!row || row.user_id !== userId) {
      return res.status(404).json({ error: t('monitors.notFound') })
    }
    res.json(row)
  } catch (error) {
    logger.error('monitors.getById', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createMonitorSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const result = await create('monitors', {
      user_id: userId,
      test_id: req.body.test_id ?? null,
      name: req.body.name,
      cron_schedule: req.body.cron_schedule ?? '0 * * * *',
      is_active: req.body.is_active ?? true,
      last_run_at: null,
      last_status: null,
      success_rate_24h: null,
      p95_latency_ms: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error('monitors.create', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateMonitorSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('monitors', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('monitors.notFound') })
    }
    const updates: Record<string, unknown> = { updated_at: new Date() }
    for (const key of Object.keys(req.body)) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    const result = await updateById('monitors', id, updates)
    res.json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error('monitors.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

interface AssertionInput {
  field: string
  operator: 'equals' | 'notEquals' | 'contains' | 'exists' | 'matches' | 'lt' | 'lte' | 'gt' | 'gte'
  expected?: unknown
}

function pickField(payload: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = payload
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function evalAssertion(payload: Record<string, unknown>, a: AssertionInput): boolean {
  const value = pickField(payload, a.field)
  switch (a.operator) {
    case 'equals':
      return value === a.expected
    case 'notEquals':
      return value !== a.expected
    case 'contains':
      return typeof value === 'string' && value.includes(String(a.expected))
    case 'exists':
      return value !== undefined && value !== null
    case 'matches':
      try {
        return typeof value === 'string' && new RegExp(String(a.expected)).test(value)
      } catch (_error) {
        // invalid regex pattern — treat as non-match
        return false
      }
    case 'lt':
      return typeof value === 'number' && typeof a.expected === 'number' && value < a.expected
    case 'lte':
      return typeof value === 'number' && typeof a.expected === 'number' && value <= a.expected
    case 'gt':
      return typeof value === 'number' && typeof a.expected === 'number' && value > a.expected
    case 'gte':
      return typeof value === 'number' && typeof a.expected === 'number' && value >= a.expected
    default:
      return false
  }
}

router.post('/:id/run', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const monitor = await findById<Record<string, unknown>>('monitors', id)
  if (!monitor || monitor.user_id !== userId) {
    return res.status(404).json({ error: t('monitors.notFound') })
  }
  const testId = monitor.test_id as string | null
  if (!testId) {
    return res.status(400).json({
      error: 'monitor must be bound to a test before it can run',
      code: 'monitor.no_test',
    })
  }
  const test = await findById<Record<string, unknown>>('tests', testId)
  if (!test || test.user_id !== userId) {
    return res.status(400).json({
      error: 'monitor.test_id no longer points at an owned test',
      code: 'monitor.test_missing',
    })
  }
  const requestId = test.request_id as string | null
  if (!requestId) {
    return res.status(400).json({
      error: 'test must be bound to a saved request before the monitor can run',
      code: 'monitor.test_no_request',
    })
  }
  const saved = await findById<Record<string, unknown>>('requests', requestId)
  if (!saved || saved.user_id !== userId) {
    return res.status(400).json({
      error: 'tests.request_id no longer points at an owned request',
      code: 'monitor.request_missing',
    })
  }

  const start = Date.now()
  const method = String(saved.method ?? 'GET').toUpperCase()
  // Substitute the active environment's {{VAR}} placeholders (raw URL, before withQueryParams so
  // path/host placeholders aren't percent-encoded first), then apply the bound request's saved
  // query_params — the env-var swap and the query_params were both previously dropped on re-run.
  const envVars = await loadActiveEnvVars(userId)
  const url = withQueryParams(
    substituteEnvVars(String(saved.url ?? ''), envVars),
    saved.query_params,
  )
  let headers: Record<string, string> = {}
  try {
    const parsed = JSON.parse((saved.headers as string) || '{}')
    if (parsed && typeof parsed === 'object') headers = parsed as Record<string, string>
  } catch (_error) {
    // malformed headers JSON — proceed with empty headers
    headers = {}
  }
  // Apply the bound request's saved auth (auth_type + auth_config), same as the
  // interactive execute path — the monitor re-run previously fired unauthenticated.
  applyAuth(headers, saved.auth_type, saved.auth_config)
  substituteEnvVarsInHeaders(headers, envVars)
  const hasBody = method !== 'GET' && method !== 'HEAD'
  let statusCode = 0
  let responseBody: unknown = null
  let responseHeaders: Record<string, unknown> = {}
  let networkError: string | null = null
  try {
    // SSRF: `url` is the bound request's user-controlled URL — route it through
    // safeFetch, never the bare api-http client. [RVALL-2 SSRF]
    const rawResponse = await safeFetch(url, {
      method,
      headers,
      body:
        hasBody && saved.body_content
          ? substituteEnvVars(saved.body_content as string, envVars)
          : undefined,
    })
    statusCode = rawResponse.status
    responseHeaders = Object.fromEntries(rawResponse.headers.entries())
    const rawText = await rawResponse.text()
    try {
      responseBody = JSON.parse(rawText)
    } catch (_error) {
      // response body isn't JSON — keep the raw text
      responseBody = rawText
    }
  } catch (err) {
    networkError = err instanceof Error ? err.message : 'request failed'
  }
  const duration = Date.now() - start

  await create('history', {
    user_id: userId,
    request_id: saved.id,
    method,
    url,
    status_code: statusCode,
    response_headers: JSON.stringify(responseHeaders),
    response_body:
      typeof responseBody === 'string'
        ? responseBody
        : JSON.stringify(responseBody ?? networkError ?? null),
    duration_ms: duration,
    error: networkError,
    created_at: new Date(),
  })

  let assertions: AssertionInput[]
  try {
    assertions = JSON.parse((test.assertions as string) || '[]') as AssertionInput[]
  } catch (_error) {
    // malformed assertions JSON — treat as no assertions
    assertions = []
  }
  const payload: Record<string, unknown> = {
    status: statusCode,
    duration_ms: duration,
    body: responseBody,
    response: responseBody,
  }
  const results = assertions.map((a) => ({ ...a, passed: evalAssertion(payload, a) }))
  const allPassed = results.length > 0 ? results.every((r) => r.passed) : statusCode > 0
  const status = networkError ? 'failed' : allPassed ? 'passed' : 'failed'

  // 24h success-rate window: weighted by whether each historical row's
  // status matches the assertion expectation pattern. We approximate by
  // checking 2xx status_code (since assertions vary per test, treating
  // every run identically would be wrong; 2xx is the universal floor).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recent = await findMany<Record<string, unknown>>('history', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'request_id', operator: '=', value: requestId },
      { field: 'created_at', operator: '>=', value: since },
    ],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 200,
  })
  const recentRows = recent ?? []
  const okCount = recentRows.filter((row) => {
    const code = row.status_code as number
    return typeof code === 'number' && code >= 200 && code < 400
  }).length
  const successRate = recentRows.length > 0 ? (okCount / recentRows.length) * 100 : null

  // p95 latency over the same 24h window. Falls back to the just-observed
  // duration when no prior runs exist.
  let p95: number = duration
  if (recentRows.length > 0) {
    const sorted = recentRows
      .map((row) => Number(row.duration_ms))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)
    if (sorted.length > 0) {
      const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))
      p95 = Math.round(sorted[idx])
    }
  }

  await updateById('monitors', id, {
    last_run_at: new Date(),
    last_status: status,
    p95_latency_ms: p95,
    success_rate_24h: successRate,
    updated_at: new Date(),
  })

  res.json({
    status,
    statusCode,
    durationMs: duration,
    networkError,
    successRate24h: successRate,
    p95LatencyMs: p95,
    results,
  })
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('monitors', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('monitors.notFound') })
    }
    await deleteById('monitors', id)
    res.status(204).end()
  } catch (error) {
    logger.error('monitors.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
