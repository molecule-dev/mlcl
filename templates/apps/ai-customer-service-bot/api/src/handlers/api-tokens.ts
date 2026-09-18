import { createHash, randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'

const router = Router()

const createApiTokenSchema = z.object({
  label: z.string().min(1).max(200),
  scopes: z.array(z.string().max(100)).max(20).optional().default([]),
})

router.use(authorizers.auth())

// List api tokens — owner-scoped. Hashes are NEVER returned in API responses.
router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const rows = await findMany<Record<string, unknown>>('api_tokens', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const safe = rows.map((row) => {
      const cloned: Record<string, unknown> = { ...row }
      delete cloned.hashed_token
      return cloned
    })
    res.json(safe)
  } catch (error) {
    logger.error('api-tokens.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create new api token — entitlement-checked at the route level by tier (Phase 3).
router.post('/', validateBody(createApiTokenSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { label, scopes } = req.body as { label: string; scopes: string[] }

    // Generate a 32-byte secret; only the SHA-256 hash is stored. The
    // plaintext secret is returned ONCE in the create response — UI must
    // surface a "copy now, you won't see it again" affordance.
    const plaintext = `csb_${randomBytes(24).toString('base64url')}`
    const hashed = createHash('sha256').update(plaintext).digest('hex')

    const now = new Date().toISOString()
    const result = await create('api_tokens', {
      owner_id: userId,
      label,
      hashed_token: hashed,
      scopes_json: JSON.stringify(scopes),
      created_at: now,
    })

    const created = result.data as Record<string, unknown> | null
    if (!created) {
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
      return
    }
    const safe: Record<string, unknown> = { ...created }
    delete safe.hashed_token
    res.status(201).json({ ...safe, plaintext })
  } catch (err) {
    console.error('[api-tokens] create failed:', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Revoke a token — owner-only. Soft-revoke via `revoked_at`; row is kept
// so audit log and `last_used_at` history stay intact.
router.post('/:id/revoke', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('api_tokens', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('apiTokens.notFound', {}, { defaultValue: 'Token not found' }),
      })
      return
    }
    const now = new Date().toISOString()
    const result = await updateById('api_tokens', req.params.id as string, { revoked_at: now })
    const updated = result.data as Record<string, unknown> | null
    if (updated) {
      const safe: Record<string, unknown> = { ...updated }
      delete safe.hashed_token
      res.json(safe)
      return
    }
    res.json({ ok: true })
  } catch (error) {
    logger.error('api-tokens.revoke', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Hard-delete a token — owner-only. Used to fully purge a leaked token.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('api_tokens', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('apiTokens.notFound', {}, { defaultValue: 'Token not found' }),
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
