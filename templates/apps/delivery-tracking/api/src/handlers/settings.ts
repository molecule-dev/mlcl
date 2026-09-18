/**
 * Settings handler. Exposes endpoints for the Settings page's three
 * panels:
 *   - GET/PUT /api/settings/organization (organization_name, timezone, business_hours)
 *   - GET     /api/settings/api-keys     (public + masked secret + masked webhook secret)
 *   - POST    /api/settings/api-keys/rotate (generates fresh public + secret + webhook secret;
 *                                            secret is returned plaintext exactly once.)
 *
 * Everything is scoped to the authenticated user by columns added in
 * migration 0011.
 *
 * @module
 */
import { randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface UserSettingsRow {
  id: string
  organization_name?: string | null
  timezone?: string | null
  business_hours?: string | null
  api_public_key?: string | null
  api_secret_key?: string | null
  api_webhook_secret?: string | null
}

function maskSecret(s: string | null | undefined): string {
  if (!s) return ''
  if (s.length <= 8) return '••••••••'
  return s.slice(0, 6) + '•'.repeat(Math.max(8, s.length - 10)) + s.slice(-4)
}

router.get('/organization', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const row = await findById<UserSettingsRow>('users', userId)
    res.json({
      organization_name: row?.organization_name ?? '',
      timezone: row?.timezone ?? '',
      business_hours: row?.business_hours ?? '',
    })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

const orgUpdateSchema = z.object({
  organization_name: z.string().max(255).optional().nullable(),
  timezone: z.string().max(64).optional().nullable(),
  business_hours: z.string().max(255).optional().nullable(),
})

router.put('/organization', validateBody(orgUpdateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof orgUpdateSchema>
    await updateById<UserSettingsRow>('users', userId, {
      organization_name: body.organization_name ?? null,
      timezone: body.timezone ?? null,
      business_hours: body.business_hours ?? null,
    })
    res.json({
      organization_name: body.organization_name ?? '',
      timezone: body.timezone ?? '',
      business_hours: body.business_hours ?? '',
    })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/api-keys', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const row = await findById<UserSettingsRow>('users', userId)
    if (!row) {
      res
        .status(404)
        .json({ error: t('users.notFound', undefined, { defaultValue: 'User not found' }) })
      return
    }
    if (!row.api_public_key || !row.api_secret_key || !row.api_webhook_secret) {
      const fresh = await rotateKeys(userId)
      res.json({
        publicKey: fresh.publicKey,
        secretKey: fresh.secretKey,
        secretKeyMasked: maskSecret(fresh.secretKey),
        webhookSecret: fresh.webhookSecret,
        webhookSecretMasked: maskSecret(fresh.webhookSecret),
      })
      return
    }
    res.json({
      publicKey: row.api_public_key,
      secretKeyMasked: maskSecret(row.api_secret_key),
      webhookSecretMasked: maskSecret(row.api_webhook_secret),
    })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/api-keys/rotate', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const fresh = await rotateKeys(userId)
    res.json({
      publicKey: fresh.publicKey,
      secretKey: fresh.secretKey,
      secretKeyMasked: maskSecret(fresh.secretKey),
      webhookSecret: fresh.webhookSecret,
      webhookSecretMasked: maskSecret(fresh.webhookSecret),
    })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

async function rotateKeys(
  userId: string,
): Promise<{ publicKey: string; secretKey: string; webhookSecret: string }> {
  const publicKey = `pcl_pub_${randomBytes(16).toString('hex')}`
  const secretKey = `pcl_sec_${randomBytes(24).toString('hex')}`
  const webhookSecret = `whsec_${randomBytes(24).toString('hex')}`
  await updateById<UserSettingsRow>('users', userId, {
    api_public_key: publicKey,
    api_secret_key: secretKey,
    api_webhook_secret: webhookSecret,
  })
  return { publicKey, secretKey, webhookSecret }
}

export default router
