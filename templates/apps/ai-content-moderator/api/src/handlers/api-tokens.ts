/**
 * API tokens handler — long-lived bearer credentials for inbound submission API.
 *
 * Routes:
 *   GET    /api-tokens         list owner's tokens (no plaintext)
 *   POST   /api-tokens         create token; plaintext returned ONCE
 *   DELETE /api-tokens/:id     revoke token
 *
 * Tokens are stored as a SHA-256 hash; the plaintext is only revealed in
 * the create response. Per CLAUDE.md / G6, all rows scoped by `owner_id`.
 */

import { createHash, randomBytes, randomUUID } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireOwnership } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

const createTokenSchema = z.object({
  label: z.string().min(1).max(120),
  scopes: z.array(z.string().min(1)).optional(),
})

const hashToken = (plaintext: string): string =>
  createHash('sha256').update(plaintext).digest('hex')

router.use(authorizers.auth())

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    const tokens = await findMany<Record<string, unknown>>('api_tokens', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    })
    // Never return the hashed token over the wire.
    const safe = tokens.map((row) => {
      const { hashed_token, ...rest } = row as Record<string, unknown>
      void hashed_token
      return rest
    })
    res.json(safe)
  } catch (error) {
    logger.error('api-tokens.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createTokenSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { label, scopes } = req.body as z.infer<typeof createTokenSchema>

    const plaintext = `mod_${randomBytes(24).toString('hex')}`
    const id = randomUUID()
    const inserted = await create('api_tokens', {
      id,
      owner_id: userId,
      user_id: userId,
      label,
      hashed_token: hashToken(plaintext),
      // pg serializes JS arrays as Postgres array literals (e.g. {submit}); JSONB
      // columns need a real JSON string. Same pattern below for audit_log/flagged_content.
      scopes_json: scopes ? JSON.stringify(scopes) : null,
    })

    const row = (inserted.data ?? { id, label }) as Record<string, unknown>
    const { hashed_token, ...rest } = row
    void hashed_token
    res.status(201).json({ ...rest, token: plaintext })
  } catch (err) {
    console.error('[api-tokens] POST failed:', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('api_tokens', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('apiTokens.notFound', {}, { defaultValue: 'API token not found' }),
      })
      return
    }
    await deleteById('api_tokens', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('api-tokens.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
