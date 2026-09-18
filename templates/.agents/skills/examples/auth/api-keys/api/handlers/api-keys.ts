import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { createApiKey, revokeApiKey } from '@molecule/api-resource-api-key'

const createSchema = z.object({
  name: z.string().min(1).max(80),
})

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

const router = Router()

router.get('/', requireAuth, async (_req, res) => {
  const userId = res.locals.session.userId as string
  const keys = await findMany<{
    id: string
    name: string
    masked: string
    scopes: string[]
    created_at: Date
    last_used_at: Date | null
  }>('api_keys', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'revoked_at', operator: '=', value: null },
    ],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 100,
  })
  // Return only metadata — never the hashed_token.
  res.json(
    keys.map((k) => ({
      id: k.id,
      name: k.name,
      masked: k.masked,
      scopes: k.scopes,
      created_at: k.created_at,
      last_used_at: k.last_used_at,
    })),
  )
})

router.post('/', requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }) })
  }
  const userId = res.locals.session.userId as string
  const { apiKey, plaintext } = await createApiKey({
    user_id: userId,
    name: parsed.data.name,
  })
  // Plaintext returned ONCE. Never accessible again.
  res.status(201).json({ id: apiKey.id, plaintext, masked: apiKey.masked })
})

router.delete('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const [key] = await findMany<{ id: string; user_id: string }>('api_keys', {
    where: [
      { field: 'id', operator: '=', value: req.params.id },
      { field: 'user_id', operator: '=', value: userId },
      { field: 'revoked_at', operator: '=', value: null },
    ],
    limit: 1,
  })
  if (!key)
    return res
      .status(404)
      .json({ error: t('apiKeys.notFound', undefined, { defaultValue: 'Key not found' }) })
  await revokeApiKey(key.id)
  res.status(204).end()
})

export default router
