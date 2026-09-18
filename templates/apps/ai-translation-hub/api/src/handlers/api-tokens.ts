/**
 * API tokens handler — owner-scoped CRUD over `api_tokens`. The plaintext
 * token is returned ONCE at creation time; thereafter only the hashed
 * value is stored. List/read endpoints never echo the plaintext.
 *
 * Hashing uses Node's built-in `crypto.createHash('sha256')` — sufficient
 * for opaque revocable bearer tokens. Token authentication itself is out
 * of scope for v1; this surface exists so the Settings → API tab has
 * something to wire to.
 */
import { createHash, randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const createTokenSchema = z.object({
  label: z.string().default(''),
})

const sanitise = (
  row: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => {
  if (!row) return null
  const { hashed_token: _hashed, ...rest } = row
  void _hashed
  return rest
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex')

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const rows = await findMany<Record<string, unknown>>('api_tokens', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(rows.map((r) => sanitise(r)))
  } catch (error) {
    logger.error('apiTokens.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const token = await findById<Record<string, unknown>>('api_tokens', id)
    if (!token || token.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('apiTokens.notFound', {}, { defaultValue: 'Token not found' }) })
      return
    }
    res.json(sanitise(token))
  } catch (error) {
    logger.error('apiTokens.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createTokenSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createTokenSchema>
    const plaintext = `mol_${randomBytes(24).toString('hex')}`
    const hashed = sha256(plaintext)
    const result = await create<Record<string, unknown>>('api_tokens', {
      user_id: userId,
      label: body.label,
      hashed_token: hashed,
      created_at: new Date(),
    })
    res.status(201).json({ ...sanitise(result.data), token: plaintext })
  } catch (error) {
    logger.error('apiTokens.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('api_tokens', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('apiTokens.notFound', {}, { defaultValue: 'Token not found' }) })
      return
    }
    await deleteById('api_tokens', id)
    res.status(204).end()
  } catch (error) {
    logger.error('apiTokens.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
