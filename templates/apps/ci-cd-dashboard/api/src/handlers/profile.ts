/**
 * Profile handler — `GET /me` returns the current authenticated user's
 * editable profile fields (name, email, plan key); `PUT /me` updates
 * name + (optionally) email. Used by Settings → Account so the page can
 * load real user data instead of the previous placeholder strings.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(1023).optional(),
  username: z.string().min(1).max(255).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const user = await findById<Record<string, unknown>>('users', userId)
    if (!user) {
      return res
        .status(404)
        .json({ error: t('users.notFound', {}, { defaultValue: 'User not found' }) })
    }
    res.json({
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      username: user.username ?? null,
      planKey: user.planKey ?? 'free',
      planExpiresAt: user.planExpiresAt ?? null,
      planAutoRenews: user.planAutoRenews ?? false,
    })
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const updates: string[] = []
    const args: unknown[] = []
    if (body.name !== undefined) {
      args.push(body.name)
      updates.push(`name = $${args.length}`)
    }
    if (body.email !== undefined) {
      args.push(body.email)
      updates.push(`email = $${args.length}`)
    }
    if (body.username !== undefined) {
      args.push(body.username)
      updates.push(`username = $${args.length}`)
    }
    if (updates.length === 0) {
      return res
        .status(400)
        .json({ error: t('users.noFields', {}, { defaultValue: 'Nothing to update' }) })
    }
    args.push(new Date())
    updates.push(`"updatedAt" = $${args.length}`)
    args.push(userId)
    await query(`UPDATE public.users SET ${updates.join(', ')} WHERE id = $${args.length}`, args)
    const user = await findById<Record<string, unknown>>('users', userId)
    res.json({
      id: user?.id,
      name: user?.name ?? null,
      email: user?.email ?? null,
      username: user?.username ?? null,
      planKey: user?.planKey ?? 'free',
    })
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
