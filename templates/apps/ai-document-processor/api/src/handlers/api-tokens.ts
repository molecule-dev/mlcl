/**
 * API-key management.
 *
 * Tokens are stored as their SHA-256 hash plus a non-secret 12-char
 * `prefix` (`adp_xxxxxxxxx…`) so the Settings page can show
 * "adp_a1b2c3d4…" next to a Revoke button. The plaintext token is
 * returned exactly once on POST and never persisted anywhere besides
 * the user's local copy.
 *
 * @module
 */
import { createHash, randomBytes } from 'crypto'
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createTokenSchema = z.object({
  label: z.string().min(1),
})

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

const stripHash = (row: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k !== 'hashed_token') out[k] = v
  }
  return out
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const tokens = (await findMany('api_tokens', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })) as Array<Record<string, unknown>>
    res.json(tokens.map(stripHash))
  } catch (error) {
    logger.error('api-tokens.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/', validateBody(createTokenSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const body = req.body as z.infer<typeof createTokenSchema>
    const raw = `adp_${randomBytes(24).toString('hex')}`
    const prefix = raw.slice(0, 12)
    const result = await create('api_tokens', {
      user_id: userId,
      label: body.label,
      hashed_token: hashToken(raw),
      prefix,
      created_at: new Date(),
    })
    const created = ((result as { data?: Record<string, unknown> }).data ?? result) as Record<
      string,
      unknown
    >
    // Plaintext token returned exactly once. Both `secret` (current
    // Settings page) and `token` (older callers) are populated.
    res.status(201).json({ ...stripHash(created), token: raw, secret: raw, prefix })
  } catch (error) {
    logger.error('api-tokens.create', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }
  try {
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('api_tokens', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('apiTokens.notFound', undefined, { defaultValue: 'API token not found.' }),
      })
      return
    }
    await deleteById('api_tokens', id)
    res.status(204).end()
  } catch (error) {
    logger.error('api-tokens.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
