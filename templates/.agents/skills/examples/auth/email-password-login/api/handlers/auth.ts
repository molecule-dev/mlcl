/**
 * Email + password auth — wired via the molecule user resource.
 *
 * The @molecule/api-resource-user package ships pre-built handlers for
 * signup (POST /users), login (POST /users/log-in), and forgot-password
 * (POST /users/forgot-password). Mount them with
 * mountDefaultUserAuthRoutes from @molecule/api-bonds-default-express
 * rather than re-implementing them here.
 *
 * This file shows only the reset-password endpoint, which the resource
 * does NOT ship as a standalone handler — every app that wants it must
 * wire it explicitly. The pattern mirrors the flagship templates.
 *
 * In your App/router.ts wire the full set like this:
 *
 *   import {
 *     mountDefaultUserAuthRoutes,
 *     mountDefaultUserResetPasswordRoute,
 *     mountDefaultUserCrudRoutes,
 *     userRequestHandlerMap as User,
 *     userAuthorization,
 *   } from '@molecule/api-bonds-default-express'
 *
 *   router.use(userAuthorization.verifyMiddleware())
 *   mountDefaultUserAuthRoutes(router, User)          // POST /users, /users/log-in, /users/forgot-password
 *   mountDefaultUserResetPasswordRoute(router, User)  // POST /users/reset-password (if the resource ships it)
 *   mountDefaultUserCrudRoutes(router, User)          // GET/PATCH/DELETE /users/:id
 *
 * The custom handler below covers the token-redeeming reset step that
 * the molecule resource leaves to each app (by design — apps may want
 * different TTLs, extra validation, or notification logic).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { hash } from '@molecule/api-password'

const router = Router()

/** Token lifetime — 1 hour, matching the molecule resource's forgotPassword window. */
const TOKEN_TTL_MS = 60 * 60 * 1000

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(1024),
})

interface UserSecretsRow {
  id: string
  passwordResetToken: string | null
  passwordResetTokenAt: string | null
}

/**
 * POST /users/reset-password
 *
 * Accepts the token emailed by POST /users/forgot-password and
 * replaces the stored password hash. Mount this before the
 * verifyMiddleware() guard — it is intentionally unauthenticated.
 */
router.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  async (req: Request, res: Response) => {
    const { token, password } = req.body as z.infer<typeof resetPasswordSchema>

    const row = await findOne<UserSecretsRow>('usersSecrets', [
      { field: 'passwordResetToken', operator: '=', value: token },
    ])

    if (!row || !row.passwordResetTokenAt) {
      res.status(400).json({
        error: t(
          'auth.resetPassword.invalidToken',
          {},
          { defaultValue: 'Invalid or expired reset token' },
        ),
        errorKey: 'auth.resetPassword.invalidToken',
      })
      return
    }

    const issued = Date.parse(row.passwordResetTokenAt)
    if (!Number.isFinite(issued) || Date.now() - issued > TOKEN_TTL_MS) {
      res.status(400).json({
        error: t(
          'auth.resetPassword.invalidToken',
          {},
          { defaultValue: 'Invalid or expired reset token' },
        ),
        errorKey: 'auth.resetPassword.invalidToken',
      })
      return
    }

    const passwordHash = await hash(password)
    await updateById('usersSecrets', row.id, {
      passwordHash,
      passwordResetToken: null,
      passwordResetTokenAt: null,
    })

    res.status(200).json({ success: true })
  },
)

export default router
