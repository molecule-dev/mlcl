/**
 * Template handlers — system templates are readable by every authed
 * user; user templates are readable only by their owner.
 *
 * Instantiating a template ALWAYS creates a new owner-scoped document
 * (a copy of the template body), so even read-only access to a system
 * template is enough to spawn an editable doc.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  type DocumentRow,
  type DocumentTemplateRow,
  internalError,
  requireReadableTemplate,
  requireUser,
  requireWritableTemplate,
  validationError,
} from '../lib/authz.js'
import { seedSystemTemplatesIfEmpty } from './_seed.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  category: z.string().max(64).optional(),
  content: z.unknown().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(64).optional(),
  content: z.unknown().optional(),
})

const instantiateSchema = z.object({
  title: z.string().max(1000).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    await seedSystemTemplatesIfEmpty()
    // System templates + this user's templates.
    const [system, userOwn] = await Promise.all([
      findMany<DocumentTemplateRow>('document_templates', {
        where: [{ field: 'is_system', operator: '=', value: true }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
      findMany<DocumentTemplateRow>('document_templates', {
        where: [{ field: 'owner_id', operator: '=', value: ownerId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
    ])
    res.json([...system, ...userOwn])
  } catch (error) {
    logger.error('templates.list', error)
    internalError(res)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const tpl = await requireReadableTemplate(id.data.id, ownerId)
    if (!tpl) {
      res
        .status(404)
        .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    res.json(tpl)
  } catch (error) {
    logger.error('templates.get', error)
    internalError(res)
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const body = createSchema.safeParse(req.body)
  if (!body.success) {
    validationError(res, body.error.issues)
    return
  }
  try {
    const result = await create<DocumentTemplateRow>('document_templates', {
      owner_id: ownerId,
      name: body.data.name,
      description: body.data.description ?? '',
      category: body.data.category ?? 'custom',
      content: (body.data.content as Record<string, unknown> | undefined) ?? {},
      is_system: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('templates.create', error)
    internalError(res)
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const tpl = await requireWritableTemplate(id.data.id, ownerId)
    if (!tpl) {
      res
        .status(404)
        .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    const result = await updateById<DocumentTemplateRow>('document_templates', id.data.id, {
      ...(body.data.name !== undefined ? { name: body.data.name } : {}),
      ...(body.data.description !== undefined ? { description: body.data.description } : {}),
      ...(body.data.category !== undefined ? { category: body.data.category } : {}),
      ...(body.data.content !== undefined
        ? { content: body.data.content as Record<string, unknown> }
        : {}),
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('templates.update', error)
    internalError(res)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const tpl = await requireWritableTemplate(id.data.id, ownerId)
    if (!tpl) {
      res
        .status(404)
        .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    await deleteById('document_templates', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('templates.delete', error)
    internalError(res)
  }
})

router.post('/:id/instantiate', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = instantiateSchema.safeParse(req.body ?? {})
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const tpl = await requireReadableTemplate(id.data.id, ownerId)
    if (!tpl) {
      res
        .status(404)
        .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    const result = await create<DocumentRow>('documents', {
      owner_id: ownerId,
      template_id: tpl.id,
      title: body.data.title ?? tpl.name,
      content: tpl.content,
      status: 'draft',
      is_template: false,
      version: 1,
      trashed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('templates.instantiate', error)
    internalError(res)
  }
})

export default router
