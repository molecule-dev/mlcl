/**
 * App-local two-factor enrollment for the discussion-boards Settings page —
 * the REAL TOTP flow, not a flag write. This file is copied verbatim (module
 * doc aside) into every template that ships the self-service route.
 *
 * The molecule user resource deliberately makes `twoFactorEnabled` NOT
 * writable through the generic `PATCH /api/users/:id` endpoint (a session
 * alone must never flip a security flag — the M6-1 issue), and an earlier
 * version of this route made exactly that mistake: it persisted
 * `{ enabled }` with session auth only, so the UI could report "2FA on"
 * while no second factor existed at password login [M-5].
 *
 * This route now mirrors the platform's own lifecycle
 * (`POST /users/:id/verify-two-factor` in @molecule/api-resource-user,
 * already mounted alongside this router) on a self-authed `/users/me/…`
 * path, using the same `@molecule/api-two-factor` bond and the same
 * `usersSecrets` columns:
 *
 *   POST  /users/me/two-factor/setup   → generate a pending TOTP secret,
 *                                        store it in
 *                                        `usersSecrets.pendingTwoFactorSecret`,
 *                                        and return otpauth provisioning
 *                                        data (`keyUrl`, `QRImageUrl`,
 *                                        `secret`) exactly like the
 *                                        platform's `action: 'setup'`
 *   PATCH /users/me/two-factor         → `{ enabled: true, token }` verifies
 *                                        the token against the PENDING
 *                                        secret, then promotes it to
 *                                        `twoFactorSecret` + sets
 *                                        `twoFactorEnabled` (replay-
 *                                        protected via
 *                                        `lastTwoFactorTimeStep`)
 *                                      → `{ enabled: false, token }` verifies
 *                                        against the ACTIVE secret, then
 *                                        clears both secrets + the flag
 *
 * Every state transition requires a live TOTP token — a stolen session can
 * neither enable nor disable 2FA without possessing the authenticator.
 * Login-time challenges stay on the platform (`logIn`/`logInOAuth`), which
 * reads the same `usersSecrets` row, so flag and secret can never drift.
 *
 * Routes (require an authenticated session — `verifyMiddleware()` runs at
 * the top of router.ts and populates `res.locals.session.userId`):
 *
 *   POST  /users/me/two-factor/setup
 *   PATCH /users/me/two-factor
 *
 * The two-segment paths (`/users/me/…`) do not collide with the default
 * resource's `PATCH /users/:id` (one segment), so mount order is irrelevant.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { get } from '@molecule/api-config'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { generateSecret, getUrls, verify } from '@molecule/api-two-factor'

interface UserRow {
  id: string
  username?: string | null
  twoFactorEnabled: boolean | null
}

/** Shape of the platform's per-user secret row (`usersSecrets` table). */
interface SecretRow {
  id: string
  twoFactorSecret: string | null
  pendingTwoFactorSecret: string | null
  lastTwoFactorTimeStep: number | null
}

const router = Router()

function unauthorized(res: Response): void {
  res.status(401).json({
    error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }),
  })
}

/** A TOTP token is 6 digits; authenticator grouping whitespace is tolerated. */
function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, '') : ''
}

// Enroll: generate a fresh pending secret and hand back provisioning data.
// The response carries the secret ONCE (inside the otpauth URL / QR, plus
// raw for manual entry) — exactly what the platform's `action: 'setup'`
// returns. It is not yet active: nothing is trusted until PATCH verifies a
// live code against it.
router.post('/me/two-factor/setup', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      unauthorized(res)
      return
    }

    const secrets = await findById<SecretRow>('usersSecrets', userId)
    if (!secrets) {
      res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }

    const secret = generateSecret()
    await updateById('usersSecrets', userId, { pendingTwoFactorSecret: secret })

    const user = await findById<UserRow>('users', userId)
    const appName = get('APP_NAME', 'App') ?? 'App'
    const urls = await getUrls({ username: user?.username || userId, service: appName, secret })

    res.json({ keyUrl: urls.keyUrl, QRImageUrl: urls.QRImageUrl, secret })
  } catch (error) {
    logger.error('users-2fa setup failed', error)
    res.status(500).json({
      error: t('user.error.twoFactorOperationFailed', undefined, {
        defaultValue: 'Two-factor operation failed.',
      }),
    })
  }
})

// Confirm: enable (verify against the PENDING secret) or disable (verify
// against the ACTIVE secret). Both require a live token.
router.patch('/me/two-factor', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      unauthorized(res)
      return
    }

    const body = (req.body ?? {}) as Record<string, unknown>
    if (typeof body.enabled !== 'boolean') {
      res.status(400).json({
        error: t('user.error.noUpdatableFields', undefined, {
          defaultValue: 'No updatable fields were provided.',
        }),
      })
      return
    }

    const token = normalizeToken(body.token)
    if (!/^\d{6}$/.test(token)) {
      res.status(400).json({
        error: t('user.error.tokenRequired', undefined, {
          defaultValue: 'Enter the 6-digit code from your authenticator app.',
        }),
      })
      return
    }

    const secrets = await findById<SecretRow>('usersSecrets', userId)
    if (!secrets) {
      res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }

    if (body.enabled) {
      if (!secrets.pendingTwoFactorSecret) {
        res.status(400).json({
          error: t('user.error.noPendingTwoFactorSetup', undefined, {
            defaultValue: 'Start two-factor setup first.',
          }),
        })
        return
      }

      const result = await verify({
        secret: secrets.pendingTwoFactorSecret,
        token,
        // Reject a code whose time step was already consumed (replay protection).
        afterTimeStep: secrets.lastTwoFactorTimeStep ?? undefined,
      })
      if (!result.valid) {
        res.status(400).json({
          error: t('user.error.invalidTwoFactorToken', undefined, {
            defaultValue: 'That code is not valid — wait for the next one and try again.',
          }),
        })
        return
      }

      // Promote pending → active and persist the consumed time step so the
      // enabling code can't be replayed (single-use).
      await updateById('usersSecrets', userId, {
        twoFactorSecret: secrets.pendingTwoFactorSecret,
        pendingTwoFactorSecret: null,
        ...(result.timeStep !== undefined ? { lastTwoFactorTimeStep: result.timeStep } : {}),
      })
      await updateById('users', userId, {
        twoFactorEnabled: true,
        updatedAt: new Date().toISOString(),
      })

      res.json({ twoFactorEnabled: true })
      return
    }

    if (!secrets.twoFactorSecret) {
      res.status(400).json({
        error: t('user.error.twoFactorNotEnabled', undefined, {
          defaultValue: 'Two-factor authentication is not enabled.',
        }),
      })
      return
    }

    const result = await verify({
      secret: secrets.twoFactorSecret,
      token,
      afterTimeStep: secrets.lastTwoFactorTimeStep ?? undefined,
    })
    if (!result.valid) {
      res.status(400).json({
        error: t('user.error.invalidTwoFactorToken', undefined, {
          defaultValue: 'That code is not valid — wait for the next one and try again.',
        }),
      })
      return
    }

    // Clear the credential and the flag together so login (which reads the
    // secret) and the Settings switch (which reads the flag) stay in step.
    await updateById('usersSecrets', userId, {
      twoFactorSecret: null,
      pendingTwoFactorSecret: null,
      ...(result.timeStep !== undefined ? { lastTwoFactorTimeStep: result.timeStep } : {}),
    })
    await updateById('users', userId, {
      twoFactorEnabled: false,
      updatedAt: new Date().toISOString(),
    })

    res.json({ twoFactorEnabled: false })
  } catch (error) {
    logger.error('users-2fa toggle failed', error)
    res.status(500).json({
      error: t('user.error.twoFactorOperationFailed', undefined, {
        defaultValue: 'Two-factor operation failed.',
      }),
    })
  }
})

export default router
