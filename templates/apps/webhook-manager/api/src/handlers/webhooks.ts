/**
 * webhook-manager — webhooks (endpoints) CRUD.
 *
 * Each handler:
 *   - Authenticates the request via the user-resource verifyMiddleware
 *     (mounted in App/router.ts).
 *   - Resolves session.userId from res.locals (the molecule auth contract).
 *   - Scopes every read/write by user_id (no IDOR).
 *   - Validates request bodies / queries with zod via
 *     `@molecule/api-middleware-validation`.
 *   - Routes through the abstract DataStore (no raw SQL here).
 */

import { randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { safeFetch } from '../lib/safe-fetch.js'
import { recordAudit } from './_audit.js'

const router = Router()

const maskSecret = (secret: string): string =>
  secret.length <= 8 ? '*'.repeat(secret.length) : `${secret.slice(0, 4)}…${secret.slice(-4)}`

const listWebhooksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  is_active: z.coerce.boolean().optional(),
})

const createWebhookSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  url: z.string().url().max(2048),
  content_type: z.string().min(1).max(120).optional(),
  events: z.array(z.string().min(1).max(120)).optional(),
  secret: z.string().min(8).max(512).optional(),
  retry_count: z.number().int().min(0).max(10).optional(),
  is_active: z.boolean().optional(),
})

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  url: z.string().url().max(2048).optional(),
  content_type: z.string().min(1).max(120).optional(),
  events: z.array(z.string().min(1).max(120)).optional(),
  secret: z.string().min(8).max(512).optional(),
  retry_count: z.number().int().min(0).max(10).optional(),
  is_active: z.boolean().optional(),
})

const testWebhookSchema = z.object({
  payload: z.record(z.string(), z.unknown()).optional(),
  event_type: z.string().min(1).max(120).optional(),
})

router.get('/', validateQuery(listWebhooksQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const q = req.query as unknown as z.infer<typeof listWebhooksQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q.is_active !== undefined) {
      where.push({ field: 'is_active', operator: '=', value: q.is_active })
    }
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const webhooks = await findMany('webhooks', {
      where,
      orderBy,
      limit: q.limit,
      offset: (q.page - 1) * q.limit,
    })
    res.json(webhooks)
  } catch (err) {
    logger.error({ err }, 'webhooks.list')
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const webhook = await findById<Record<string, unknown>>('webhooks', id)
    if (!webhook || webhook.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('webhooks.notFound', {}, { defaultValue: 'Webhook not found' }) })
      return
    }
    res.json(webhook)
  } catch (err) {
    logger.error({ err }, 'webhooks.get')
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createWebhookSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const body = req.body as z.infer<typeof createWebhookSchema>
    const secret = body.secret ?? randomBytes(24).toString('hex')
    const result = await create('webhooks', {
      user_id: userId,
      name: body.name,
      description: body.description ?? '',
      url: body.url,
      content_type: body.content_type ?? 'application/json',
      events: JSON.stringify(body.events ?? ['*']),
      secret,
      secret_masked: maskSecret(secret),
      retry_count: body.retry_count ?? 3,
      is_active: body.is_active ?? true,
      sparkline: JSON.stringify([]),
      created_at: new Date(),
      updated_at: new Date(),
    })
    const created = result.data as Record<string, unknown> | null
    await recordAudit({
      userId,
      action: 'endpoint.created',
      target: typeof created?.id === 'string' ? created.id : null,
      metadata: { name: body.name, url: body.url },
      req,
    })
    res.status(201).json(created)
  } catch (err) {
    logger.error({ err }, 'webhooks.create')
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateWebhookSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const webhook = await findById<Record<string, unknown>>('webhooks', id)
    if (!webhook || webhook.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('webhooks.notFound', {}, { defaultValue: 'Webhook not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateWebhookSchema>
    const update: Record<string, unknown> = { updated_at: new Date() }
    if (body.name !== undefined) update.name = body.name
    if (body.description !== undefined) update.description = body.description
    if (body.url !== undefined) update.url = body.url
    if (body.content_type !== undefined) update.content_type = body.content_type
    if (body.events !== undefined) update.events = JSON.stringify(body.events)
    if (body.retry_count !== undefined) update.retry_count = body.retry_count
    if (body.is_active !== undefined) update.is_active = body.is_active
    let secretRotated = false
    if (body.secret !== undefined) {
      update.secret = body.secret
      update.secret_masked = maskSecret(body.secret)
      secretRotated = true
    }
    const result = await updateById('webhooks', id, update)
    if (secretRotated) {
      await recordAudit({
        userId,
        action: 'secret.rotated',
        target: id,
        metadata: { name: webhook.name },
        req,
      })
    } else if (body.is_active === false) {
      await recordAudit({
        userId,
        action: 'endpoint.paused',
        target: id,
        metadata: { name: webhook.name },
        req,
      })
    } else if (body.is_active === true) {
      await recordAudit({
        userId,
        action: 'endpoint.resumed',
        target: id,
        metadata: { name: webhook.name },
        req,
      })
    } else {
      await recordAudit({
        userId,
        action: 'endpoint.updated',
        target: id,
        metadata: { changedFields: Object.keys(update).filter((k) => k !== 'updated_at') },
        req,
      })
    }
    res.json(result.data)
  } catch (err) {
    logger.error({ err }, 'webhooks.update')
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/test', validateBody(testWebhookSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const webhook = await findById<Record<string, unknown>>('webhooks', id)
    if (!webhook || webhook.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('webhooks.notFound', {}, { defaultValue: 'Webhook not found' }) })
      return
    }
    const body = req.body as z.infer<typeof testWebhookSchema>
    const startTime = Date.now()
    const url = typeof webhook.url === 'string' ? webhook.url : ''
    const contentType =
      typeof webhook.content_type === 'string' ? webhook.content_type : 'application/json'
    const requestBody = JSON.stringify(
      body.payload ?? { event: 'test', timestamp: new Date().toISOString() },
    )
    let statusCode = 0
    let responseBody = ''
    let status: 'success' | 'failed' = 'failed'
    // SSRF-safe delivery: safeFetch pins the connection away from private/loopback/
    // link-local + cloud-metadata targets by validating INSIDE the undici connect
    // lookup (the same resolution used to open the socket), so a low-TTL rebinding
    // host cannot slip an internal IP past a separate validate-then-fetch check. On
    // an SSRF/validation block, record the delivery as failed and return 400 — never
    // let a user-controlled URL reach an internal address. redirect:'manual' (inside
    // safeFetch) keeps a 3xx from rebinding to an internal host.
    try {
      const response = await safeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body: requestBody,
      })
      statusCode = response.status
      responseBody = await response.text()
      status = response.ok ? 'success' : 'failed'
    } catch (err) {
      const message = err instanceof Error ? err.message : 'request failed'
      const causeMessage =
        err instanceof Error && err.cause instanceof Error ? err.cause.message : ''
      const isBlocked = /SSRF|private\/internal|blocked|Only http|Invalid URL/i.test(
        `${message} ${causeMessage}`,
      )
      if (isBlocked) {
        const reason = causeMessage || message
        const duration = Date.now() - startTime
        await create('webhook_deliveries', {
          user_id: userId,
          webhook_id: id,
          event_type: body.event_type ?? 'test',
          method: 'POST',
          url,
          request_headers: JSON.stringify({ 'Content-Type': contentType }),
          request_body: requestBody,
          response_headers: JSON.stringify({}),
          response_body: reason,
          status: 'failed',
          status_code: 0,
          status_text: 'blocked',
          duration_ms: duration,
          retry_count: 0,
          delivered_at: new Date(),
          created_at: new Date(),
        })
        await recordAudit({
          userId,
          action: 'endpoint.tested',
          target: id,
          metadata: { name: webhook.name, status: 'failed', blocked: true, reason },
          req,
        })
        res.status(400).json({
          error: t(
            'webhooks.urlBlocked',
            { reason },
            { defaultValue: 'Webhook URL blocked: {{reason}}' },
          ),
        })
        return
      }
      responseBody = message
    }
    const duration = Date.now() - startTime
    await create('webhook_deliveries', {
      user_id: userId,
      webhook_id: id,
      event_type: body.event_type ?? 'test',
      method: 'POST',
      url,
      request_headers: JSON.stringify({ 'Content-Type': contentType }),
      request_body: requestBody,
      response_headers: JSON.stringify({}),
      response_body: responseBody,
      status,
      status_code: statusCode,
      status_text: status === 'success' ? 'OK' : 'failed',
      duration_ms: duration,
      retry_count: 0,
      delivered_at: new Date(),
      created_at: new Date(),
    })
    await recordAudit({
      userId,
      action: 'endpoint.tested',
      target: id,
      metadata: { name: webhook.name, status, status_code: statusCode, duration_ms: duration },
      req,
    })
    res.json({ status, status_code: statusCode, duration_ms: duration })
  } catch (err) {
    logger.error({ err }, 'webhooks.test')
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const webhook = await findById<Record<string, unknown>>('webhooks', id)
    if (!webhook || webhook.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('webhooks.notFound', {}, { defaultValue: 'Webhook not found' }) })
      return
    }
    await deleteById('webhooks', id)
    await recordAudit({
      userId,
      action: 'endpoint.deleted',
      target: id,
      metadata: { name: webhook.name },
      req,
    })
    res.status(204).end()
  } catch (err) {
    logger.error({ err }, 'webhooks.delete')
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
