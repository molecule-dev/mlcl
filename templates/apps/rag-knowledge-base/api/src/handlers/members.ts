import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const ALLOWED_ROLES = ['admin', 'member', 'viewer'] as const

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(ALLOWED_ROLES).default('member'),
})

const updateMemberSchema = z.object({
  role: z.enum(ALLOWED_ROLES).optional(),
  joined: z.boolean().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const members = await findMany('org_members', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'invited_at', direction: 'asc' }],
    })
    res.json(members)
  } catch (error) {
    logger.error('members.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/', validateBody(inviteMemberSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const body = req.body as z.infer<typeof inviteMemberSchema>
    const result = await create('org_members', {
      user_id: userId,
      invitee_email: body.email,
      role: body.role,
      invited_at: new Date(),
      created_at: new Date(),
    })
    res.status(201).json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('members.invite', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.put('/:id', validateBody(updateMemberSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('org_members', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('members.notFound', undefined, { defaultValue: 'Member not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateMemberSchema>
    const updates: Record<string, unknown> = {}
    if (body.role !== undefined) updates.role = body.role
    if (body.joined === true) updates.joined_at = new Date()
    const result = await updateById('org_members', id, updates)
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('members.update', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('org_members', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('members.notFound', undefined, { defaultValue: 'Member not found.' }),
      })
    }
    await deleteById('org_members', id)
    res.status(204).end()
  } catch (error) {
    logger.error('members.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
