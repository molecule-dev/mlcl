/**
 * Document templates handler — system + user-owned templates that seed
 * a new document with starter copy and placeholder vars. System-owned
 * rows (user_id IS NULL, is_system=true) are world-readable; user-owned
 * rows are owner-scoped.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const placeholderVars = z.array(z.string()).default([])

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  category: z.string().default('general'),
  body_template: z.string().default(''),
  placeholder_vars: placeholderVars,
})

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  body_template: z.string().optional(),
  placeholder_vars: placeholderVars.optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    // Show user-owned and system rows.
    const userTemplates = await findMany('document_templates', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    const systemTemplates = await findMany('document_templates', {
      where: [{ field: 'is_system', operator: '=', value: true }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json([...systemTemplates, ...userTemplates])
  } catch (error) {
    logger.error('templates.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const tpl = await findById<Record<string, unknown>>('document_templates', id)
    if (!tpl) {
      res
        .status(404)
        .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    const isSystem = tpl.is_system === true
    if (!isSystem && tpl.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    res.json(tpl)
  } catch (error) {
    logger.error('templates.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createTemplateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createTemplateSchema>
    const result = await create('document_templates', {
      user_id: userId,
      name: body.name,
      description: body.description,
      category: body.category,
      body_template: body.body_template,
      placeholder_vars: JSON.stringify(body.placeholder_vars),
      is_system: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('templates.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateTemplateSchema),
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
      const existing = await findById<Record<string, unknown>>('document_templates', id)
      if (!existing || existing.user_id !== userId || existing.is_system === true) {
        res
          .status(404)
          .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
        return
      }
      const body = req.body as z.infer<typeof updateTemplateSchema>
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (body.name !== undefined) updates.name = body.name
      if (body.description !== undefined) updates.description = body.description
      if (body.category !== undefined) updates.category = body.category
      if (body.body_template !== undefined) updates.body_template = body.body_template
      if (body.placeholder_vars !== undefined)
        updates.placeholder_vars = JSON.stringify(body.placeholder_vars)
      const result = await updateById('document_templates', id, updates)
      res.json(result.data)
    } catch (error) {
      logger.error('templates.update', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('document_templates', id)
    if (!existing || existing.user_id !== userId || existing.is_system === true) {
      res
        .status(404)
        .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    await deleteById('document_templates', id)
    res.status(204).end()
  } catch (error) {
    logger.error('templates.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

const instantiateSchema = z.object({
  document_title: z.string().optional(),
  variables: z.record(z.string(), z.string()).default({}),
})

router.post(
  '/:id/instantiate',
  validateParams(idParamSchema),
  validateBody(instantiateSchema),
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
      const tpl = await findById<Record<string, unknown>>('document_templates', id)
      if (!tpl) {
        res
          .status(404)
          .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
        return
      }
      const isSystem = tpl.is_system === true
      if (!isSystem && tpl.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
        return
      }
      const body = req.body as z.infer<typeof instantiateSchema>
      let content = String(tpl.body_template ?? '')
      for (const [key, value] of Object.entries(body.variables)) {
        const re = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
        content = content.replace(re, value)
      }
      const wordCount = content.split(/\s+/).filter(Boolean).length
      const docResult = await create('documents', {
        user_id: userId,
        title:
          body.document_title ||
          String(tpl.name) ||
          t('documents.untitled', {}, { defaultValue: 'Untitled Document' }),
        content,
        format: 'markdown',
        status: 'draft',
        word_count: wordCount,
        reading_minutes: Math.max(1, Math.ceil(wordCount / 200)),
        last_edited_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(docResult.data)
    } catch (error) {
      logger.error('templates.instantiate', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
