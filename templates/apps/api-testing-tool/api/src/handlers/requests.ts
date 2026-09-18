/**
 * requests handler — saved request templates + execute action.
 *
 * Execute routes the saved (user-controlled) URL through `safeFetch`
 * (`../lib/safe-fetch.js`), NOT the bare `@molecule/api-http` client, because
 * that URL is attacker-controlled and the bare client has no SSRF guard. [RVALL-2 SSRF]
 * safeFetch refuses private/loopback/link-local/CGNAT + cloud-metadata
 * (169.254.169.254) targets and pins the resolved address at connect time
 * (DNS-rebinding-safe), and does not auto-follow redirects.
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

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const
type HttpMethod = (typeof HTTP_METHODS)[number]

function asJson(value: unknown): string {
  if (value == null) return '{}'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

const createRequestSchema = z.object({
  collection_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255),
  method: z.enum(HTTP_METHODS).optional(),
  url: z.string().max(2048).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  query_params: z.record(z.string(), z.string()).optional(),
  body_type: z.string().max(64).optional(),
  body_content: z.string().optional(),
  auth_type: z.string().max(64).optional(),
  auth_config: z.record(z.string(), z.unknown()).optional(),
  sort_order: z.number().int().optional(),
})

const updateRequestSchema = createRequestSchema.partial()

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (typeof req.query.collection_id === 'string') {
      where.push({ field: 'collection_id', operator: '=', value: req.query.collection_id })
    }
    const orderBy: OrderBy[] = [{ field: 'sort_order', direction: 'asc' }]
    const rows = await findMany('requests', { where, orderBy })
    res.json(rows)
  } catch (error) {
    logger.error('requests.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const row = await findById<Record<string, unknown>>('requests', getParamId(req))
    if (!row || row.user_id !== userId) {
      return res.status(404).json({ error: t('requests.notFound') })
    }
    res.json(row)
  } catch (error) {
    logger.error('requests.getById', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createRequestSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const result = await create('requests', {
      user_id: userId,
      collection_id: req.body.collection_id ?? null,
      name: req.body.name,
      method: req.body.method ?? 'GET',
      url: req.body.url ?? '',
      headers: asJson(req.body.headers),
      query_params: asJson(req.body.query_params),
      body_type: req.body.body_type ?? 'none',
      body_content: req.body.body_content ?? '',
      auth_type: req.body.auth_type ?? 'none',
      auth_config: asJson(req.body.auth_config),
      sort_order: req.body.sort_order ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error('requests.create', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateRequestSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('requests', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('requests.notFound') })
    }
    const updates: Record<string, unknown> = { updated_at: new Date() }
    for (const key of Object.keys(req.body)) {
      if (key === 'headers' || key === 'query_params' || key === 'auth_config') {
        if (req.body[key] !== undefined) updates[key] = asJson(req.body[key])
      } else if (req.body[key] !== undefined) {
        updates[key] = req.body[key]
      }
    }
    const result = await updateById('requests', id, updates)
    res.json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error('requests.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/:id/execute', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const saved = await findById<Record<string, unknown>>('requests', getParamId(req))
  if (!saved || saved.user_id !== userId) {
    return res.status(404).json({ error: t('requests.notFound') })
  }

  const startTime = Date.now()
  const method = (saved.method as HttpMethod) ?? 'GET'
  // Load the active environment's variables and substitute {{VAR}} placeholders into the URL,
  // header values, and body before firing — they were being sent literally. Substitute the raw URL
  // BEFORE withQueryParams so path/host placeholders aren't percent-encoded first.
  const envVars = await loadActiveEnvVars(userId)
  const url = withQueryParams(
    substituteEnvVars((saved.url as string) ?? '', envVars),
    saved.query_params,
  )
  let headers: Record<string, string>
  try {
    headers = JSON.parse((saved.headers as string) || '{}') as Record<string, string>
  } catch (_error) {
    // malformed headers JSON — proceed with empty headers
    headers = {}
  }
  // Apply the saved auth (auth_type + auth_config) to the outbound headers —
  // Bearer/Basic/API-key were persisted but never sent, so an authenticated
  // request fired without its Authorization header.
  applyAuth(headers, saved.auth_type, saved.auth_config)
  substituteEnvVarsInHeaders(headers, envVars)
  const hasBody = method !== 'GET' && method !== 'HEAD'
  try {
    // SSRF: `url` is the saved row's user-controlled URL. safeFetch refuses
    // private/internal/metadata targets (incl. 169.254.169.254) and pins the
    // resolved address at connect time — no DNS-rebinding window — unlike the
    // bare api-http client which has no guard. [RVALL-2 SSRF]
    const rawResponse = await safeFetch(url, {
      method,
      headers,
      body:
        hasBody && saved.body_content
          ? substituteEnvVars(saved.body_content as string, envVars)
          : undefined,
    })
    const rawHeaders = Object.fromEntries(rawResponse.headers.entries())
    const rawText = await rawResponse.text()
    let parsedData: unknown
    try {
      parsedData = JSON.parse(rawText)
    } catch (_error) {
      // response body isn't JSON — keep the raw text
      parsedData = rawText
    }
    const duration = Date.now() - startTime
    await create('history', {
      user_id: userId,
      request_id: saved.id,
      method,
      url,
      status_code: rawResponse.status,
      response_headers: JSON.stringify(rawHeaders),
      response_body: typeof parsedData === 'string' ? parsedData : JSON.stringify(parsedData),
      duration_ms: duration,
      created_at: new Date(),
    })
    res.json({
      status: rawResponse.status,
      headers: rawHeaders,
      body: parsedData,
      duration_ms: duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const message = error instanceof Error ? error.message : t('requests.executionFailed')
    await create('history', {
      user_id: userId,
      request_id: saved.id,
      method,
      url,
      status_code: 0,
      response_headers: '{}',
      response_body: message,
      duration_ms: duration,
      error: message,
      created_at: new Date(),
    })
    res.status(502).json({ error: message, duration_ms: duration })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('requests', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('requests.notFound') })
    }
    await deleteById('requests', id)
    res.status(204).end()
  } catch (error) {
    logger.error('requests.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
