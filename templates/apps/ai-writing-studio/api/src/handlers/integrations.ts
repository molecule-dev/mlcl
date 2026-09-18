/**
 * Publishing integrations handler — wraps the api_credentials table
 * with a fixed roster of supported destinations. Each row in
 * api_credentials represents an authenticated connection; the absence
 * of a row means the user has not connected that destination.
 *
 * Integrations are intentionally stubbed for connect/disconnect: the
 * concrete OAuth dance for each destination is out of scope for this
 * template, but the endpoints exercise a real DB write so the UI can
 * reflect connection state.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const SUPPORTED: ReadonlyArray<{ key: string; label: string; icon: string }> = [
  { key: 'wordpress', label: 'WordPress', icon: 'wordpress' },
  { key: 'medium', label: 'Medium', icon: 'description' },
  { key: 'ghost', label: 'Ghost', icon: 'language' },
  { key: 'substack', label: 'Substack', icon: 'mail' },
] as const

interface CredentialRow {
  id: string
  provider: string
  label?: string | null
  last_used_at?: string | Date | null
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const rows = (await findMany<CredentialRow>('api_credentials', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })) as CredentialRow[]
    const connectedByProvider = new Map<string, CredentialRow>()
    for (const row of rows) connectedByProvider.set(String(row.provider), row)
    const integrations = SUPPORTED.map((s) => {
      const row = connectedByProvider.get(s.key)
      return {
        key: s.key,
        label: s.label,
        icon: s.icon,
        connected: Boolean(row),
        credentialId: row?.id ?? null,
        lastUsedAt: row?.last_used_at ?? null,
      }
    })
    res.json({ integrations })
  } catch (error) {
    logger.error('integrations.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

const connectSchema = z.object({
  provider: z.string().min(1),
})

router.post('/connect', validateBody(connectSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof connectSchema>
    if (!SUPPORTED.find((s) => s.key === body.provider)) {
      res.status(400).json({
        error: t('integrations.unsupported', {}, { defaultValue: 'Unsupported integration' }),
      })
      return
    }
    const existing = (await findMany<CredentialRow>('api_credentials', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'provider', operator: '=', value: body.provider },
      ],
      limit: 1,
    })) as CredentialRow[]
    if (existing[0]) {
      res.json({ connected: true, credentialId: existing[0].id })
      return
    }
    const result = await create('api_credentials', {
      user_id: userId,
      provider: body.provider,
      // The full OAuth flow is out of scope; we record a placeholder
      // token so the row exists and the UI reflects connection state.
      // This sentinel is the ONE documented non-ciphertext value in the
      // encrypted_key column — it holds no secret, so it is not encrypted.
      // Real keys stored via credentials.ts always go through encrypt().
      encrypted_key: `pending:${body.provider}:${userId}`,
      label: body.provider,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json({
      connected: true,
      credentialId: (result.data as { id: string }).id,
    })
  } catch (error) {
    logger.error('integrations.connect', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const rows = (await findMany<CredentialRow & { user_id?: string }>('api_credentials', {
      where: [{ field: 'id', operator: '=', value: id }],
      limit: 1,
    })) as Array<CredentialRow & { user_id?: string }>
    const row = rows[0]
    if (!row || row.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('integrations.notFound', {}, { defaultValue: 'Integration not found' }) })
      return
    }
    await deleteById('api_credentials', id)
    res.status(204).end()
  } catch (error) {
    logger.error('integrations.disconnect', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
