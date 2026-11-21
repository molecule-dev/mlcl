import { Router } from 'express'
import { z } from 'zod'

import { t } from '@molecule/api-i18n'
import { createRequestHandler } from '@molecule/api-resource'
import { handlers, resource } from '@molecule/api-resource-user'

const router = Router()
const resetInput = z.object({ token: z.string().min(10), password: z.string().min(8).max(1024) })

// The account service verifies and consumes the reset token, updates the
// credential and invalidates the user's previous sessions.
router.post(
  '/',
  createRequestHandler(handlers.resetPassword(resource), {
    mapRequest: (req) => {
      const parsed = resetInput.safeParse(req.body)
      if (parsed.success) return { body: parsed.data }
      return {
        response: {
          statusCode: 400,
          body: {
            error: t(
              'user.error.resetPasswordInvalid',
              {},
              { defaultValue: 'Invalid reset request' },
            ),
          },
        },
      }
    },
    mapResponse: (result) => (result.statusCode === 401 ? { ...result, statusCode: 400 } : result),
  }),
)

export default router
