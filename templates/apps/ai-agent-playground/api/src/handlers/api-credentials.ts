/**
 * API credentials handler — per-provider keys (Anthropic, OpenAI, Google).
 *
 * Backs the `Add` / `Rotate` controls on the `/settings` page. The raw key
 * from the request body is encrypted SERVER-SIDE with the bonded
 * `@molecule/api-encryption` AES-256-GCM provider before it is persisted
 * (the column name `encrypted_key` is now literal); the GET response
 * returns only a masked hint and presence flags so the key is never
 * echoed back to the browser. Decrypt at the point of use — the one call
 * site that hands the key to a provider should
 * `const key = await decrypt(row.encrypted_key)`; nothing else may read
 * the column.
 *
 * Standard owner-scoped CRUD with the same authorization rules used
 * elsewhere — non-owner reads return 404, never 403.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { encrypt } from '@molecule/api-encryption'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const upsertSchema = z.object({
  provider: z.string().min(1).max(64),
  key: z.string().min(1).max(8192),
  label: z.string().max(255).optional(),
})

interface ApiCredentialRow {
  id: string
  user_id: string
  provider: string
  encrypted_key: string
  label?: string | null
  last_used_at?: Date | string | null
  created_at?: Date | string
  updated_at?: Date | string
}

interface PublicApiCredential {
  id: string
  provider: string
  hint: string
  label?: string | null
  hasKey: boolean
  last_used_at?: Date | string | null
  created_at?: Date | string
  updated_at?: Date | string
}

function toPublic(row: ApiCredentialRow): PublicApiCredential {
  // The stored value is AES ciphertext (opaque hex) — it has no meaningful
  // suffix to hint at, and echoing any part of it would leak ciphertext.
  // Presence is conveyed by `hasKey` alone.
  const masked = row.encrypted_key ? '••••' : ''
  return {
    id: row.id,
    provider: row.provider,
    hint: masked,
    label: row.label ?? null,
    hasKey: Boolean(row.encrypted_key),
    last_used_at: row.last_used_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const items = await findMany<ApiCredentialRow>('api_credentials', { where })
    res.json(items.map(toPublic))
  } catch (err) {
    logger.error('api-credentials.list failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/', validateBody(upsertSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof upsertSchema>
    // Encrypt before persisting — the column must never hold the raw key
    // (a DB read of a backup/replica would otherwise yield live provider keys).
    const encryptedKey = await encrypt(body.key)

    const where: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'provider', operator: '=', value: body.provider },
    ]
    const existing = await findMany<ApiCredentialRow>('api_credentials', { where, limit: 1 })

    if (existing.length === 0) {
      const result = await create<ApiCredentialRow>('api_credentials', {
        user_id: userId,
        provider: body.provider,
        encrypted_key: encryptedKey,
        label: body.label ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(toPublic(result.data as ApiCredentialRow))
      return
    }

    const result = await updateById<ApiCredentialRow>('api_credentials', existing[0].id, {
      encrypted_key: encryptedKey,
      label: body.label ?? existing[0].label ?? null,
      updated_at: new Date(),
    })
    res.json(toPublic(result.data as ApiCredentialRow))
  } catch (err) {
    logger.error('api-credentials.upsert failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<ApiCredentialRow>('api_credentials', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('apiCredentials.notFound', undefined, {
          defaultValue: 'API credential not found',
        }),
      })
      return
    }
    await deleteById('api_credentials', id)
    res.status(204).end()
  } catch (err) {
    logger.error('api-credentials.delete failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
