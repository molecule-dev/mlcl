/**
 * webhook-manager — api keys (programmatic access tokens).
 *
 * Each key:
 *   - is hashed with SHA-256 at create time; only the hash + masked
 *     prefix-suffix string is persisted.
 *   - returns the plaintext value EXACTLY ONCE in the create response —
 *     subsequent reads only ever expose the masked form.
 *   - is scoped per user (no cross-tenant access).
 *
 * Revoking a key flips `is_revoked = true` so existing rows are
 * preserved for audit, but they can no longer be used.
 */

import { createHash, randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { recordAudit } from './_audit.js'

const router = Router()

const generateKey = (env: 'live' | 'test' = 'live'): string =>
  `pk_${env}_${randomBytes(24).toString('hex')}`

const maskKey = (key: string): string => {
  if (key.length <= 12) return '*'.repeat(key.length)
  return `${key.slice(0, 8)}••••${key.slice(-4)}`
}

const hashKey = (key: string): string => createHash('sha256').update(key).digest('hex')

const SCOPES = [
  'endpoints:read',
  'endpoints:write',
  'deliveries:read',
  'deliveries:replay',
  'audit:read',
  'events:write',
  '*',
] as const

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

const createSchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.enum(SCOPES)).min(1).default(['*']),
  env: z.enum(['live', 'test']).default('live'),
})

router.get('/', validateQuery(listSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const q = req.query as unknown as z.infer<typeof listSchema>
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
  const items = await findMany('api_keys', {
    where,
    orderBy,
    limit: q.limit,
    offset: (q.page - 1) * q.limit,
  })
  // Strip key_hash from every row — only the masked form is ever
  // exposed after create.
  const sanitized = items.map((row) => {
    const r = { ...(row as Record<string, unknown>) }
    delete r.key_hash
    return r
  })
  res.json(sanitized)
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const body = req.body as z.infer<typeof createSchema>
  const plaintext = generateKey(body.env)
  const result = await create('api_keys', {
    user_id: userId,
    name: body.name,
    key_hash: hashKey(plaintext),
    key_masked: maskKey(plaintext),
    scopes: JSON.stringify(body.scopes),
    is_revoked: false,
    last_used_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  })
  const row = result.data as Record<string, unknown> | null
  if (row) delete row.key_hash
  await recordAudit({
    userId,
    action: 'apikey.created',
    target: typeof row?.id === 'string' ? row.id : null,
    metadata: { name: body.name, env: body.env, scopes: body.scopes },
    req,
  })
  // Plaintext returned exactly once.
  res.status(201).json({ ...row, key: plaintext })
})

router.post('/:id/revoke', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = getParamId(req)
  const row = await findById<Record<string, unknown>>('api_keys', id)
  if (!row || row.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('apiKeys.notFound', {}, { defaultValue: 'API key not found' }) })
    return
  }
  await updateById('api_keys', id, { is_revoked: true, updated_at: new Date() })
  await recordAudit({
    userId,
    action: 'apikey.revoked',
    target: id,
    metadata: { name: row.name },
    req,
  })
  res.json({ revoked: true })
})

export default router
