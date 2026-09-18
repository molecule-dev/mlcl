/**
 * API credentials handler — owner-scoped storage of per-user provider keys
 * (e.g. user-supplied OpenAI / Anthropic keys when the workspace allows
 * BYOK). The request field is named `encrypted_key` for API
 * compatibility, but it carries the RAW key — the handler encrypts it
 * server-side with the bonded `@molecule/api-encryption` AES-256-GCM
 * provider before persisting, so the `encrypted_key` column holds
 * ciphertext. Decrypt at the point of use — the one call site that hands
 * the key to a provider should
 * `const key = await decrypt(row.encrypted_key)`; nothing else may read
 * the column.
 *
 * The handler never returns the encrypted_key in responses — only metadata
 * (provider, label, last_used_at).
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { encrypt } from '@molecule/api-encryption'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const createCredentialSchema = z.object({
  provider: z.string().min(1),
  // Raw key from the client — encrypted server-side before it is stored.
  encrypted_key: z.string().min(1),
  label: z.string().optional(),
})

const updateCredentialSchema = z.object({
  encrypted_key: z.string().min(1).optional(),
  label: z.string().optional(),
})

interface Credential {
  id: string
  user_id: string
  provider: string
  label: string | null
  last_used_at: string | null
  created_at: string
  updated_at: string
}

function strip(row: Record<string, unknown>): Credential {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    provider: String(row.provider),
    label: row.label == null ? null : String(row.label),
    last_used_at: row.last_used_at == null ? null : String(row.last_used_at),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const rows = await findMany<Record<string, unknown>>('api_credentials', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'provider', direction: 'asc' }],
    })
    res.json(rows.map(strip))
  } catch (error) {
    logger.error('credentials.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const cred = await findById<Record<string, unknown>>('api_credentials', id)
    if (!cred || cred.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('errors.notFound', {}, { defaultValue: 'Credential not found' }) })
      return
    }
    res.json(strip(cred))
  } catch (error) {
    logger.error('credentials.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createCredentialSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createCredentialSchema>
    const result = await create('api_credentials', {
      user_id: userId,
      provider: body.provider,
      // Encrypt before persisting — the column must never hold the raw key
      // (a DB read of a backup/replica would otherwise yield live provider keys).
      encrypted_key: await encrypt(body.encrypted_key),
      label: body.label ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(strip(result.data as Record<string, unknown>))
  } catch (error) {
    logger.error('credentials.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateCredentialSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('api_credentials', id)
      if (!existing || existing.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('errors.notFound', {}, { defaultValue: 'Credential not found' }) })
        return
      }
      const body = req.body as z.infer<typeof updateCredentialSchema>
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (body.encrypted_key !== undefined) {
        // Rotate path — encrypt the incoming raw key before it reaches the store.
        updates.encrypted_key = await encrypt(body.encrypted_key)
      }
      if (body.label !== undefined) updates.label = body.label
      const result = await updateById('api_credentials', id, updates)
      res.json(strip(result.data as Record<string, unknown>))
    } catch (error) {
      logger.error('credentials.update', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('api_credentials', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('errors.notFound', {}, { defaultValue: 'Credential not found' }) })
      return
    }
    await deleteById('api_credentials', id)
    res.status(204).end()
  } catch (error) {
    logger.error('credentials.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
