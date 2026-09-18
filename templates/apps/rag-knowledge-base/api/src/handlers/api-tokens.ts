import { createHash, randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

const createTokenSchema = z.object({
  label: z.string().min(1),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const tokens = await findMany('api_tokens', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const safe = (tokens as Array<Record<string, unknown>>).map((row) => {
      const copy: Record<string, unknown> = { ...row }
      delete copy.hashed_token
      return copy
    })
    res.json(safe)
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
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const body = req.body as z.infer<typeof createTokenSchema>
    const raw = randomBytes(32).toString('hex')
    const hashed = hashToken(raw)
    const result = await create('api_tokens', {
      user_id: userId,
      label: body.label,
      hashed_token: hashed,
      created_at: new Date(),
    })
    const created = (result as { data?: Record<string, unknown> }).data ?? result
    const safeCreated = { ...(created as Record<string, unknown>) }
    delete safeCreated.hashed_token
    res.status(201).json({ ...safeCreated, token: raw })
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
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('api_tokens', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('apiTokens.notFound', undefined, { defaultValue: 'API token not found.' }),
      })
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
