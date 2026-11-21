import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import { handlers, resource } from '@molecule/api-resource-user'

const router = Router()
const verifyTwoFactor = handlers.verifyTwoFactor(resource)

async function changeTwoFactor(
  req: Request,
  res: Response,
  action: 'setup' | 'enable' | 'disable' | undefined,
  token?: string,
): Promise<void> {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }),
    })
    return
  }
  if (!action) {
    res.status(400).json({
      error: t('user.error.noUpdatableFields', undefined, {
        defaultValue: 'No updatable fields were provided.',
      }),
    })
    return
  }

  // Only the session can name the account. The user resource handles enrollment,
  // token verification, replay checks and credential updates.
  const answer = await verifyTwoFactor({
    ...req,
    params: { id: userId },
    body: { action, token },
  })
  res.status(answer.statusCode === 403 ? 400 : answer.statusCode).json(answer.body)
}

router.post('/me/two-factor/setup', async (req, res): Promise<void> => {
  await changeTwoFactor(req, res, 'setup')
})

router.patch('/me/two-factor', async (req, res): Promise<void> => {
  const { enabled, token } = req.body ?? {}
  const action = typeof enabled === 'boolean' ? (enabled ? 'enable' : 'disable') : undefined
  const code = typeof token === 'string' ? token.replace(/\s+/g, '') : ''
  await changeTwoFactor(req, res, action, /^\d{6}$/.test(code) ? code : '')
})

export default router
