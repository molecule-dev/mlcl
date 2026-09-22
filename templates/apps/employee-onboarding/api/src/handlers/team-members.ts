import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getLogger } from '@molecule/api-bond'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { seedDefaultOnboardingIfMissing } from '../seedDefaultOnboarding.js'

const router = Router()

const logger = getLogger()

const createMemberSchema = z.object({
  name: z.string().min(1),
  role: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  manager_user_id: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  slack_handle: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  start_date: z.string().nullable().optional(),
})

const updateMemberSchema = createMemberSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    await seedDefaultOnboardingIfMissing(userId)

    const items = await findMany('team_members', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(items)
  } catch (_err) {
    logger.error('team_members.list', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const item = await findById<Record<string, unknown>>('team_members', id)
    if (!item || item.user_id !== userId) {
      return res.status(404).json({
        error: t('teamMembers.notFound', undefined, { defaultValue: 'Team member not found' }),
      })
    }
    res.json(item)
  } catch (_err) {
    logger.error('team_members.read', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createMemberSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const body = req.body as z.infer<typeof createMemberSchema>
    const result = await create('team_members', {
      user_id: userId,
      name: body.name,
      role: body.role ?? null,
      department: body.department ?? null,
      manager_user_id: body.manager_user_id ?? null,
      bio: body.bio ?? null,
      slack_handle: body.slack_handle ?? null,
      photo_url: body.photo_url ?? null,
      email: body.email ?? null,
      start_date: body.start_date ? new Date(body.start_date) : null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (_err) {
    logger.error('team_members.create', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateMemberSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('team_members', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('teamMembers.notFound', undefined, { defaultValue: 'Team member not found' }),
      })
    }
    const body = req.body as z.infer<typeof updateMemberSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    for (const k of [
      'name',
      'role',
      'department',
      'manager_user_id',
      'bio',
      'slack_handle',
      'photo_url',
      'email',
    ] as const) {
      if (body[k] !== undefined) updates[k] = body[k]
    }
    if (body.start_date !== undefined)
      updates.start_date = body.start_date ? new Date(body.start_date) : null

    const result = await updateById('team_members', id, updates)
    res.json(result.data)
  } catch (_err) {
    logger.error('team_members.update', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('team_members', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('teamMembers.notFound', undefined, { defaultValue: 'Team member not found' }),
      })
    }
    await deleteById('team_members', id)
    res.status(204).end()
  } catch (_err) {
    logger.error('team_members.delete', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
