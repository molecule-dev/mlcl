import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createTemplateSchema = z.object({
  name: z.string().min(1),
  role_label: z.string().nullable().optional(),
  default_duration_days: z.number().int().positive().optional(),
})

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  role_label: z.string().nullable().optional(),
  default_duration_days: z.number().int().positive().optional(),
  archived_at: z.string().nullable().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const items = await findMany('onboarding_templates', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(items)
  } catch (_err) {
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
    const item = await findById<Record<string, unknown>>('onboarding_templates', id)
    if (!item || item.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('templates.notFound', undefined, { defaultValue: 'Template not found' }) })
    }
    res.json(item)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createTemplateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const body = req.body as z.infer<typeof createTemplateSchema>
    const result = await create('onboarding_templates', {
      user_id: userId,
      name: body.name,
      role_label: body.role_label ?? null,
      default_duration_days: body.default_duration_days ?? 90,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateTemplateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('onboarding_templates', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('templates.notFound', undefined, { defaultValue: 'Template not found' }) })
    }
    const body = req.body as z.infer<typeof updateTemplateSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.name !== undefined) updates.name = body.name
    if (body.role_label !== undefined) updates.role_label = body.role_label
    if (body.default_duration_days !== undefined)
      updates.default_duration_days = body.default_duration_days
    if (body.archived_at !== undefined)
      updates.archived_at = body.archived_at ? new Date(body.archived_at) : null

    const result = await updateById('onboarding_templates', id, updates)
    res.json(result.data)
  } catch (_err) {
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
    const existing = await findById<Record<string, unknown>>('onboarding_templates', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('templates.notFound', undefined, { defaultValue: 'Template not found' }) })
    }
    await deleteById('onboarding_templates', id)
    res.status(204).end()
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
