import { createHash, randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { isUuid } from '../lib/is-uuid.js'

const router = Router()

const createKeySchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string()).optional(),
})

const updateKeySchema = z.object({
  name: z.string().optional(),
  scopes: z.array(z.string()).optional(),
})

function generatePlaintext(): string {
  return `sk_live_${randomBytes(24).toString('hex')}`
}
function hashKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}
function maskKey(plaintext: string): string {
  return `${plaintext.slice(0, 8)}…${plaintext.slice(-4)}`
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const rows = await findMany<Record<string, unknown>>('api_keys', { where, orderBy })
    // Strip the hash from list responses; key_masked is the user-visible form.
    const sanitised = rows.map(({ key_hash: _hash, ...safe }) => safe)
    res.json(sanitised)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    if (!isUuid(getParamId(req))) return res.status(404).json({ error: t('apiKeys.notFound') })
    const row = await findById<Record<string, unknown>>('api_keys', getParamId(req))
    if (!row || row.user_id !== userId) {
      return res.status(404).json({ error: t('apiKeys.notFound') })
    }
    const safe = (({ key_hash: _hash, ...rest }) => rest)(row)
    res.json(safe)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createKeySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const plaintext = generatePlaintext()
    const result = await create('api_keys', {
      user_id: userId,
      name: req.body.name,
      key_hash: hashKey(plaintext),
      key_masked: maskKey(plaintext),
      scopes: JSON.stringify(req.body.scopes ?? []),
      created_at: new Date(),
    })
    const persisted =
      (result as unknown as { data?: Record<string, unknown> }).data ??
      (result as unknown as Record<string, unknown>)
    const safe = (({ key_hash: _hash, ...rest }) => rest)(persisted)
    // Plaintext returned ONCE on creation, never again.
    res.status(201).json({ ...safe, key: plaintext })
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateKeySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    if (!isUuid(id)) return res.status(404).json({ error: t('apiKeys.notFound') })
    const existing = await findById<Record<string, unknown>>('api_keys', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('apiKeys.notFound') })
    }
    const updates: Record<string, unknown> = {}
    if (req.body.name !== undefined) updates.name = req.body.name
    if (req.body.scopes !== undefined) updates.scopes = JSON.stringify(req.body.scopes)
    const result = await updateById('api_keys', id, updates)
    const persisted =
      (result as unknown as { data?: Record<string, unknown> }).data ??
      (result as unknown as Record<string, unknown>)
    const safe = (({ key_hash: _hash, ...rest }) => rest)(persisted)
    res.json(safe)
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
    if (!isUuid(id)) return res.status(404).json({ error: t('apiKeys.notFound') })
    const existing = await findById<Record<string, unknown>>('api_keys', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('apiKeys.notFound') })
    }
    // Soft revoke first; full delete keeps audit trail clean. The
    // composite (user_id, revoked_at) index makes filtering live keys cheap.
    await updateById('api_keys', id, { revoked_at: new Date() })
    await deleteById('api_keys', id)
    res.status(204).end()
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
