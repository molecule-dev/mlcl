/**
 * API keys handler — programmatic access tokens for the Settings → API
 * Keys tab. Plaintext is returned ONCE at creation; later reads only
 * return `key_masked`.
 *
 * @module
 */

import { createHash, randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createKeySchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.string()).optional(),
})

const updateKeySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  scopes: z.array(z.string()).optional(),
})

function generatePlaintext(): string {
  return `clrn_${randomBytes(24).toString('hex')}`
}

function hashKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

function maskKey(plaintext: string): string {
  return `${plaintext.slice(0, 8)}\u2026${plaintext.slice(-4)}`
}

function sanitize(row: Record<string, unknown>): Record<string, unknown> {
  const safe = { ...row }
  delete safe['key_hash']
  return safe
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const rows = await findMany<Record<string, unknown>>('api_keys', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })
  res.json(rows.map(sanitize))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const row = await findById<Record<string, unknown>>('api_keys', getParamId(req, 'id'))
  if (!row || row.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('apiKeys.notFound', {}, { defaultValue: 'API key not found' }) })
  }
  res.json(sanitize(row))
})

router.post('/', validateBody(createKeySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const body = req.body as z.infer<typeof createKeySchema>
  const plaintext = generatePlaintext()
  const result = await create<Record<string, unknown>>('api_keys', {
    user_id: userId,
    name: body.name,
    key_hash: hashKey(plaintext),
    key_masked: maskKey(plaintext),
    scopes: JSON.stringify(body.scopes ?? []),
    created_at: new Date(),
  })
  const persisted = result.data ?? {}
  // Plaintext returned ONCE on creation, never again.
  res.status(201).json({ ...sanitize(persisted), key: plaintext })
})

router.put('/:id', validateBody(updateKeySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req, 'id')
  const existing = await findById<Record<string, unknown>>('api_keys', id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('apiKeys.notFound', {}, { defaultValue: 'API key not found' }) })
  }
  const body = req.body as z.infer<typeof updateKeySchema>
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.scopes !== undefined) updates.scopes = JSON.stringify(body.scopes)
  if (Object.keys(updates).length === 0) {
    return res.json(sanitize(existing))
  }
  const result = await updateById<Record<string, unknown>>('api_keys', id, updates)
  const persisted = result.data ?? existing
  res.json(sanitize(persisted))
})

router.post('/:id/rotate', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req, 'id')
  const existing = await findById<Record<string, unknown>>('api_keys', id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('apiKeys.notFound', {}, { defaultValue: 'API key not found' }) })
  }
  const plaintext = generatePlaintext()
  const result = await updateById<Record<string, unknown>>('api_keys', id, {
    key_hash: hashKey(plaintext),
    key_masked: maskKey(plaintext),
  })
  const persisted = result.data ?? existing
  res.json({ ...sanitize(persisted), key: plaintext })
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req, 'id')
  const existing = await findById<Record<string, unknown>>('api_keys', id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('apiKeys.notFound', {}, { defaultValue: 'API key not found' }) })
  }
  await deleteById('api_keys', id)
  res.status(204).end()
})

export default router
