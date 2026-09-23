import { randomBytes } from 'crypto'
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { hash } from '@molecule/api-encryption'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const paramId = (req: Request): string => {
  const id = req.params.id
  return Array.isArray(id) ? id[0] : id
}

const PERMISSION = z.enum(['read', 'write', 'rotate'])

const createTokenSchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.object({
    vault_ids: z.array(z.string().uuid()).default([]),
    permissions: z.array(PERMISSION).default(['read']),
  }),
  expires_at: z.string().datetime().nullable().optional(),
})

router.get('/api-tokens', async (_req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const rows = await findMany<Record<string, unknown>>('api_tokens', {
      where: [{ field: 'user_id', operator: '=', value: uid }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(rows.map((r) => ({ ...r, token_hash: undefined })))
  } catch (err) {
    logger.error(`apiTokens.list failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/api-tokens', validateBody(createTokenSchema), async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const body = req.body as z.infer<typeof createTokenSchema>
    const plaintext = `smt_${randomBytes(32).toString('hex')}`
    const tokenHash = await hash(plaintext)
    const result = await create<Record<string, unknown>>('api_tokens', {
      user_id: uid,
      name: body.name,
      token_hash: tokenHash,
      scopes: JSON.stringify(body.scopes),
      expires_at: body.expires_at ?? null,
    })
    const created = result.data as Record<string, unknown> | null
    res.status(201).json({
      ...(created ?? {}),
      token_hash: undefined,
      token: plaintext,
    })
  } catch (err) {
    logger.error(`apiTokens.create failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/api-tokens/:id/revoke', async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = paramId(req)
    const existing = await findById<Record<string, unknown>>('api_tokens', id)
    if (!existing || existing.user_id !== uid) {
      return res
        .status(404)
        .json({ error: t('tokens.notFound', undefined, { defaultValue: 'API token not found' }) })
    }
    await updateById('api_tokens', id, { revoked_at: new Date() })
    res.status(204).end()
  } catch (err) {
    logger.error(`apiTokens.revoke failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/api-tokens/:id', async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = paramId(req)
    const existing = await findById<Record<string, unknown>>('api_tokens', id)
    if (!existing || existing.user_id !== uid) {
      return res
        .status(404)
        .json({ error: t('tokens.notFound', undefined, { defaultValue: 'API token not found' }) })
    }
    await deleteById('api_tokens', id)
    res.status(204).end()
  } catch (err) {
    logger.error(`apiTokens.delete failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
