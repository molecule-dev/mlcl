/**
 * API keys handler — manage developer API credentials. Backed by
 * `public.api_credentials` (migration 0010). Stores ONLY the SHA-256 hash
 * of each key plus a masked preview (mirroring @molecule/api-resource-api-key):
 * a DB read of a backup/replica must never yield a usable `sk_live_…`
 * credential. The plaintext key is returned exactly once, at creation; every
 * later read shows the persisted masked preview. A consumer that authenticates
 * by key must hash the presented value (`hashKey`) and compare digests —
 * never compare against `hashed_key` with the raw string.
 */
import { createHash, randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const createSchema = z.object({
  provider: z.string().min(1).max(120),
})

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

const mask = (key: string): string => `${key.slice(0, 8)}••••${key.slice(-4)}`

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const items = await findMany<Record<string, unknown>>('api_credentials', { where, orderBy })
    // Only the persisted masked preview leaves the server — hashed_key never
    // appears in a response, and the plaintext key doesn't exist past create.
    res.json(
      items.map((it) => ({
        id: it.id,
        provider: it.provider,
        mask: typeof it.masked_preview === 'string' ? it.masked_preview : '••••',
        created_at: it.created_at,
        updated_at: it.updated_at,
      })),
    )
  } catch (error) {
    logger.error('apiKeys.list', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const body = req.body as z.infer<typeof createSchema>
    const newKey = `sk_live_${randomBytes(16).toString('hex')}`
    const created = await create('api_credentials', {
      user_id: userId,
      provider: body.provider,
      hashed_key: hashKey(newKey),
      masked_preview: mask(newKey),
    })
    const data = created.data as Record<string, unknown>
    // Return the full secret ONCE at creation time — the user must
    // copy it now because subsequent GET /api/api-keys only returns
    // the masked preview. Without this, a paying customer who creates
    // an API key can never use it. The store keeps only sha256(newKey):
    // a DB read must not yield a usable credential.
    res.status(201).json({
      id: data.id,
      provider: data.provider,
      key: newKey,
      mask: mask(newKey),
      created_at: data.created_at,
    })
  } catch (error) {
    logger.error('apiKeys.create', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const id = String(req.params.id)
    const found = await findById<Record<string, unknown>>('api_credentials', id)
    if (!found || found.user_id !== userId) {
      return res.status(404).json({
        error: t('apiKeys.notFound', {}, { defaultValue: 'API key not found' }),
      })
    }
    await deleteById('api_credentials', id)
    res.status(204).end()
  } catch (error) {
    logger.error('apiKeys.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
