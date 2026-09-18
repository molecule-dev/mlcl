/**
 * Team membership handler — owner-scoped CRUD over `team_members`. The
 * authenticated user is the team owner; members are referenced by email
 * (resolved to `member_user_id` once the invitee signs up). Roles:
 * `admin` / `translator` / `reviewer`.
 *
 * Per INVENTORY's "deferred" list, real invitation email + member-side
 * acceptance flow is v2; v1 lets the owner add a member by email and
 * link them once a `users` row exists.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const roleEnum = z.enum(['admin', 'translator', 'reviewer'])

const inviteSchema = z.object({
  email: z.string().email(),
  role: roleEnum.default('translator'),
})

const updateSchema = z.object({
  role: roleEnum,
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const rows = await findMany('team_members', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('team.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const member = await findById<Record<string, unknown>>('team_members', id)
    if (!member || member.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('team.notFound', {}, { defaultValue: 'Team member not found' }) })
      return
    }
    res.json(member)
  } catch (error) {
    logger.error('team.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(inviteSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof inviteSchema>
    const memberUser = await findOne<Record<string, unknown>>('users', [
      { field: 'email', operator: '=', value: body.email.toLowerCase() },
    ])
    const result = await create('team_members', {
      user_id: userId,
      member_user_id: memberUser?.id ?? null,
      email: body.email.toLowerCase(),
      role: body.role,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('team.invite', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateParams(idParamSchema), validateBody(updateSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('team_members', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('team.notFound', {}, { defaultValue: 'Team member not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateSchema>
    const result = await updateById('team_members', id, { role: body.role })
    res.json(result.data)
  } catch (error) {
    logger.error('team.update', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('team_members', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('team.notFound', {}, { defaultValue: 'Team member not found' }) })
      return
    }
    await deleteById('team_members', id)
    res.status(204).end()
  } catch (error) {
    logger.error('team.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
