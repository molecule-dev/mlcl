import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { render } from '@molecule/api-templating'

import type { AiEmailComposerLimits } from '../tiers.js'

const router = Router()

function handleError(res: Response, err: unknown, where: string): void {
  console.error(`[templates:${where}]`, err)
  res.status(500).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}

const variablesSchema = z.array(z.string()).default([])

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  subject: z.string().default(''),
  body: z.string().default(''),
  variables: variablesSchema,
  category: z.string().default('general'),
})

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  variables: variablesSchema.optional(),
  category: z.string().optional(),
})

const renderTemplateSchema = z.object({
  variables: z.record(z.string(), z.unknown()).default({}),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const templates = await findMany('email_templates', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(templates)
  } catch (err) {
    handleError(res, err, 'templates')
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const template = await findById<Record<string, unknown>>('email_templates', id)
    if (!template || template.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    res.json(template)
  } catch (err) {
    handleError(res, err, 'templates')
  }
})

router.post(
  '/',
  enforceLimit<AiEmailComposerLimits>({
    limitType: 'maxTemplates',
    getLimit: (limits) => limits.maxTemplates,
    getCurrent: async (userId) =>
      count('email_templates', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createTemplateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof createTemplateSchema>
      const result = await create('email_templates', {
        user_id: userId,
        name: body.name,
        description: body.description,
        subject: body.subject,
        body: body.body,
        variables: JSON.stringify(body.variables),
        category: body.category,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      handleError(res, err, 'templates')
    }
  },
)

router.put('/:id', validateBody(updateTemplateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('email_templates', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateTemplateSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.subject !== undefined) updates.subject = body.subject
    if (body.body !== undefined) updates.body = body.body
    if (body.variables !== undefined) updates.variables = JSON.stringify(body.variables)
    if (body.category !== undefined) updates.category = body.category
    const result = await updateById('email_templates', id, updates)
    res.json(result.data)
  } catch (err) {
    handleError(res, err, 'templates')
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('email_templates', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    await deleteById('email_templates', id)
    res.status(204).end()
  } catch (err) {
    handleError(res, err, 'templates')
  }
})

router.post(
  '/:id/render',
  validateBody(renderTemplateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const id = getParamId(req)
      const template = await findById<Record<string, unknown>>('email_templates', id)
      if (!template || template.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
        return
      }
      const { variables } = req.body as z.infer<typeof renderTemplateSchema>
      const [renderedSubject, renderedBody] = await Promise.all([
        render(template.subject as string, variables),
        render(template.body as string, variables),
      ])
      await updateById('email_templates', id, {
        last_used_at: new Date(),
        updated_at: new Date(),
      })
      res.json({
        subject: renderedSubject,
        body: renderedBody,
        templateId: template.id,
        templateName: template.name,
      })
    } catch (err) {
      handleError(res, err, 'templates')
    }
  },
)

export default router
