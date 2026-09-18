import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { requestsQuotaForPlanKey } from '../lib/plans.js'
import { safeFetch } from '../lib/safe-fetch.js'
import type { ApiDocumentationLimits } from '../tiers.js'

const router = Router()

const executeSchema = z.object({
  endpoint_id: z.string().optional(),
  base_url: z.string().min(1),
  method: z.string().optional(),
  path: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
  query_params: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const rows = await findMany('try_it_history', { where, orderBy })
    res.json(rows)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('try_it_history', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('tryIt.notFound') })
    }
    await deleteById('try_it_history', id)
    res.status(204).end()
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

// Enforce the per-tier try-it cap (tiers.ts maxTryIt) — defined + shown on Pricing but enforceLimit
// was never called here (only the sibling maxSpecs gate existed), so any user could run unlimited
// try-it requests regardless of tier. Mirror the spec-limit gate, counting try_it_history by user_id.
const enforceTryItLimit = enforceLimit<ApiDocumentationLimits>({
  limitType: 'maxTryIt',
  getLimit: (limits) => limits.maxTryIt,
  getCurrent: async (userId) =>
    count('try_it_history', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceTryItLimit,
  validateBody(executeSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    // Enforce the plan's monthly request quota (billing requests_quota) — shown on the Billing page
    // with live 30-day usage but never gated on this request path, so a user could run past it.
    const user = await findById<{ planKey?: string | null }>('users', userId)
    const quota = requestsQuotaForPlanKey(user?.planKey)
    const since = new Date()
    since.setDate(since.getDate() - 30)
    const used = (
      await findMany('try_it_history', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'created_at', operator: '>=', value: since },
        ],
      })
    ).length
    if (used >= quota) {
      return res.status(429).json({
        error: t(
          'tryIt.quotaExceeded',
          {},
          {
            defaultValue: 'Monthly request quota reached — upgrade your plan to run more requests.',
          },
        ),
      })
    }

    const { endpoint_id, base_url, method, path, headers, query_params, body } = req.body

    let url = `${base_url}${path}`
    if (query_params && Object.keys(query_params).length > 0) {
      const params = new URLSearchParams(query_params as Record<string, string>)
      url += `?${params.toString()}`
    }

    const startTime = Date.now()
    try {
      // SSRF: this "try it" console fetches the (user-supplied) base_url+path of a
      // DOCUMENTED, public API — internal/metadata targets are never a legitimate use.
      // safeFetch pins the connection away from private/internal/metadata addresses
      // inside the same DNS resolution undici connects with (no rebinding window),
      // unlike the bare api-http client which has no SSRF guard. [RVALL-2 SSRF]
      const rawResponse = await safeFetch(url, {
        method: (method || 'GET') as
          'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS',
        headers: (headers as Record<string, string>) ?? undefined,
        body: body != null ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      })
      const rawText = await rawResponse.text()
      let parsedData: unknown
      try {
        parsedData = JSON.parse(rawText)
      } catch (_error) {
        // Response body isn't JSON — surface it as raw text.
        parsedData = rawText
      }
      const response = {
        status: rawResponse.status,
        headers: Object.fromEntries(rawResponse.headers.entries()),
        data: parsedData,
      }
      const duration = Date.now() - startTime

      // Best-effort capture of the run; failure to persist must not block the
      // response since the user already paid the latency cost.
      try {
        await create('try_it_history', {
          user_id: userId,
          endpoint_id: endpoint_id ?? null,
          method: method ?? 'GET',
          url,
          request: JSON.stringify({ headers, query_params, body }),
          status: response.status,
          response: JSON.stringify(response.data),
          duration_ms: duration,
          created_at: new Date(),
        })
      } catch (_error) {
        // Best-effort: history persistence failure must not block the response
      }

      res.json({
        status: response.status,
        headers: response.headers,
        body: response.data,
        duration_ms: duration,
      })
    } catch (error) {
      const duration = Date.now() - startTime
      const message = error instanceof Error ? error.message : t('tryIt.requestFailed')
      res.status(502).json({
        error: message,
        duration_ms: duration,
      })
    }
  },
)

export default router
