/**
 * API-credentials handler — provider OAuth tokens per provider.
 *
 * Routes:
 *   GET    /api-credentials             list owner's credentials (token redacted)
 *   GET    /api-credentials/:id         single credential (token redacted)
 *   POST   /api-credentials             store a token (encrypted server-side)
 *   PUT    /api-credentials/:id         rotate / update token
 *   DELETE /api-credentials/:id         revoke
 *
 * Owner-scoped (G6 — IDOR-safe). The request field is named
 * `encrypted_token` for API compatibility, but it carries the RAW token —
 * the handler encrypts it server-side with the bonded
 * `@molecule/api-encryption` AES-256-GCM provider before persisting, and
 * `redactToken` strips the ciphertext from every response so a leaked
 * endpoint can't exfiltrate the upstream token. Decrypt at the point of
 * use — the one call site that calls the provider should
 * `const token = await decrypt(row.encrypted_token)`; nothing else may
 * read the column.
 */

import { randomUUID } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireOwnership } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { encrypt } from '@molecule/api-encryption'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

const listQuerySchema = z.object({
  provider: z.enum(['github', 'gitlab']).optional(),
})

const createSchema = z.object({
  provider: z.enum(['github', 'gitlab']),
  // Raw token from the client — encrypted server-side before it is stored.
  encrypted_token: z.string().min(1).max(8000),
  scopes_json: z.array(z.string()).optional(),
  expires_at: z.string().optional(),
})

const updateSchema = z.object({
  encrypted_token: z.string().min(1).max(8000).optional(),
  scopes_json: z.array(z.string()).optional(),
  expires_at: z.string().optional(),
})

const redactToken = <T extends Record<string, unknown>>(row: T): T => {
  const { encrypted_token: _omit, ...rest } = row
  void _omit
  return rest as T
}

router.use(authorizers.auth())

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { provider } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (provider) where.push({ field: 'provider', operator: '=', value: provider })
    const items = await findMany<Record<string, unknown>>('api_credentials', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    })
    res.json(items.map(redactToken))
  } catch (err) {
    logger.error('api_credentials.list', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership<Record<string, unknown>>(
      'api_credentials',
      req.params.id as string,
      userId,
    )
    if (!check.ok) {
      res.status(check.status).json({
        error: t('apiCredentials.notFound', {}, { defaultValue: 'Credential not found' }),
      })
      return
    }
    res.json(redactToken(check.row))
  } catch (err) {
    logger.error('api_credentials.get', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof createSchema>
    const id = randomUUID()
    const insertData: Record<string, unknown> = {
      id,
      owner_id: userId,
      user_id: userId,
      provider: body.provider,
      // Encrypt before persisting — the column must never hold the raw token
      // (a DB read of a backup/replica would otherwise yield live OAuth tokens).
      encrypted_token: await encrypt(body.encrypted_token),
    }
    if (body.scopes_json !== undefined) insertData.scopes_json = JSON.stringify(body.scopes_json)
    if (body.expires_at !== undefined) insertData.expires_at = body.expires_at
    await create('api_credentials', insertData)
    res.status(201).json({ id, provider: body.provider, scopes_json: body.scopes_json ?? null })
  } catch (err) {
    logger.error('api_credentials.create', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('api_credentials', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('apiCredentials.notFound', {}, { defaultValue: 'Credential not found' }),
      })
      return
    }
    const patch = { ...(req.body as Record<string, unknown>) }
    if (typeof patch.encrypted_token === 'string') {
      // Rotate path — encrypt the incoming raw token before it reaches the store.
      patch.encrypted_token = await encrypt(patch.encrypted_token)
    }
    if (Array.isArray(patch.scopes_json)) {
      patch.scopes_json = JSON.stringify(patch.scopes_json)
    }
    const updated = await updateById('api_credentials', req.params.id as string, patch)
    res.json(redactToken((updated.data ?? {}) as Record<string, unknown>))
  } catch (err) {
    logger.error('api_credentials.update', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('api_credentials', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('apiCredentials.notFound', {}, { defaultValue: 'Credential not found' }),
      })
      return
    }
    await deleteById('api_credentials', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('api_credentials.delete', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
