import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const useTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const templates = await findMany('templates', {
      where: [{ field: 'is_public', operator: '=', value: true }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(templates)
  } catch (error) {
    logger.error('templates.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const template = await findById<Record<string, unknown>>('templates', id)
    if (!template || template.is_public !== true) {
      return res
        .status(404)
        .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
    }
    res.json(template)
  } catch (error) {
    logger.error('templates.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/use', validateBody(useTemplateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const template = await findById<Record<string, unknown>>('templates', id)
    if (!template || template.is_public !== true) {
      return res
        .status(404)
        .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
    }

    const { name } = req.body as { name?: string }
    const project = await create('projects', {
      user_id: userId,
      team_id: null,
      name: name ?? `${template.name as string}`,
      width: 1920,
      height: 1080,
      canvas_data: template.canvas_data ?? {},
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(project.data)
  } catch (error) {
    logger.error('templates.use', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
