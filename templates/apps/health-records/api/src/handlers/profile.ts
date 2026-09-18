/**
 * Profile handler — manages "patient profile" fields that don't have
 * their own first-class table (demographics, emergency contacts,
 * notification preferences). Backed by the user's `oauthData` JSONB
 * column with structured top-level keys (`profile`, `emergency_contacts`,
 * `preferences`, `security`).
 *
 * Routes:
 *   GET  /api/profile/me  → flattened profile bundle for the page.
 *   PATCH /api/profile/me → deep-merge the supplied keys into oauthData
 *                            (the molecule user PATCH replaces oauthData
 *                            wholesale — this handler does the merge so
 *                            the frontend can send partial updates).
 */
import { randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface UserRow {
  id: string
  name?: string | null
  email?: string | null
  twoFactorEnabled?: boolean | null
  oauthData?: Record<string, unknown> | null
}

interface ProfileBundle {
  name: string
  email: string
  twoFactorEnabled: boolean
  profile: Record<string, unknown>
  emergency_contacts: Array<Record<string, unknown>>
  preferences: Record<string, unknown>
  security: Record<string, unknown>
}

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

async function loadBundle(userId: string): Promise<ProfileBundle | null> {
  const user = await findById<UserRow>('users', userId)
  if (!user) return null
  const oauth = asObject(user.oauthData)
  return {
    name: user.name ?? '',
    email: user.email ?? '',
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    profile: asObject(oauth.profile),
    emergency_contacts: asArray<Record<string, unknown>>(oauth.emergency_contacts),
    preferences: asObject(oauth.preferences),
    security: asObject(oauth.security),
  }
}

router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const bundle = await loadBundle(userId)
    if (!bundle) return res.status(404).json({ error: 'User not found.' })
    res.json(bundle)
  } catch (error) {
    logger.error('profile.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

const emergencyContactSchema = z.object({
  name: z.string().min(1),
  relation: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  profile: z.record(z.string(), z.unknown()).optional(),
  emergency_contacts: z.array(emergencyContactSchema).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  security: z.record(z.string(), z.unknown()).optional(),
})

/**
 * POST /api/profile/me/rotate-key — generate a fresh client encryption key
 * fingerprint, increment the key version, append to the rotation history,
 * and stamp `lastEncryptionKeyRotation`. This is what the Settings page
 * "Rotate now" button calls — the prior PATCH-based shim only updated the
 * timestamp and so the rotation was a placebo. The actual record content
 * isn't re-keyed (that would require a per-row crypto migration), but the
 * key fingerprint changes, which is the user-visible identifier we expose
 * in the audit trail and can hand to a real KMS later.
 */
router.post('/me/rotate-key', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const user = await findById<UserRow>('users', userId)
    if (!user) return res.status(404).json({ error: 'User not found.' })

    const currentOauth = asObject(user.oauthData)
    const security = asObject(currentOauth.security)
    const previousVersion =
      typeof security.encryptionKeyVersion === 'number'
        ? (security.encryptionKeyVersion as number)
        : 0
    const nextVersion = previousVersion + 1
    const nowIso = new Date().toISOString()
    const newFingerprint = randomBytes(16).toString('hex')
    const history = asArray<Record<string, unknown>>(security.encryptionKeyHistory)
    history.push({
      version: nextVersion,
      fingerprint: newFingerprint,
      rotatedAt: nowIso,
    })
    if (history.length > 25) history.splice(0, history.length - 25)

    const nextSecurity: Record<string, unknown> = {
      ...security,
      encryptionKeyVersion: nextVersion,
      encryptionKeyFingerprint: newFingerprint,
      encryptionKeyHistory: history,
      lastEncryptionKeyRotation: nowIso,
    }
    const nextOauth: Record<string, unknown> = { ...currentOauth, security: nextSecurity }

    await updateById('users', userId, { oauthData: nextOauth, updatedAt: new Date() })
    const bundle = await loadBundle(userId)
    res.json(bundle)
  } catch (error) {
    logger.error('profile.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.patch('/me', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const user = await findById<UserRow>('users', userId)
    if (!user) return res.status(404).json({ error: 'User not found.' })

    const currentOauth = asObject(user.oauthData)
    const nextOauth: Record<string, unknown> = { ...currentOauth }

    if (body.profile) {
      nextOauth.profile = { ...asObject(currentOauth.profile), ...body.profile }
    }
    if (body.emergency_contacts) {
      nextOauth.emergency_contacts = body.emergency_contacts
    }
    if (body.preferences) {
      nextOauth.preferences = { ...asObject(currentOauth.preferences), ...body.preferences }
    }
    if (body.security) {
      nextOauth.security = { ...asObject(currentOauth.security), ...body.security }
    }

    const update: Record<string, unknown> = { oauthData: nextOauth, updatedAt: new Date() }
    if (body.name) update.name = body.name

    await updateById('users', userId, update)
    const bundle = await loadBundle(userId)
    res.json(bundle)
  } catch (error) {
    logger.error('profile.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
