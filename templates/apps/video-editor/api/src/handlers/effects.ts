/**
 * Effects handler — per-clip LUTs / brightness / speed / reverse etc.
 *
 * Authorization: each effect belongs to a clip belongs to a project owned
 * by `owner_id`. Mutations require requireClipOwner; reads of foreign
 * effects return 404.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { requireClipOwner, requireEffectOwner } from '../lib/authz.js'

const createSchema = z.object({
  clip_id: z.string().min(1),
  kind: z.enum(['lut', 'brightness', 'contrast', 'saturation', 'speed', 'reverse', 'blur']),
  parameters: z.record(z.string(), z.unknown()).optional().default({}),
  position: z.number().int().min(0).optional().default(0),
})

const updateSchema = z.object({
  parameters: z.record(z.string(), z.unknown()).optional(),
  position: z.number().int().min(0).optional(),
})

const router = Router()

router.use(requireAuth)

router.get('/', async (req: Request, res: Response) => {
  const clipId = String(req.query.clipId ?? req.query.clip_id ?? '')
  if (!clipId) {
    res.status(400).json({
      error: t('effects.clipRequired', undefined, { defaultValue: 'Clip ID is required' }),
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireClipOwner(clipId, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('clips.notFound', undefined, { defaultValue: 'Clip not found' }),
      })
      return
    }
    const effects = await findMany('effects', {
      where: [{ field: 'clip_id', operator: '=', value: clipId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
      limit: 100,
    })
    res.json(effects)
  } catch (error) {
    logger.error('effects.list', error)
    res.status(500).json({
      error: t('effects.listError', undefined, { defaultValue: 'Failed to list effects' }),
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireClipOwner(parsed.data.clip_id, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('clips.notFound', undefined, { defaultValue: 'Clip not found' }),
      })
      return
    }
    const result = await create('effects', {
      clip_id: parsed.data.clip_id,
      project_id: String(check.row.project_id),
      owner_id: userId,
      kind: parsed.data.kind,
      parameters: parsed.data.parameters ?? {},
      position: parsed.data.position ?? 0,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('effects.create', error)
    res.status(500).json({
      error: t('effects.createError', undefined, { defaultValue: 'Failed to create effect' }),
    })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireEffectOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('effects.notFound', undefined, { defaultValue: 'Effect not found' }),
      })
      return
    }
    const result = await updateById('effects', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('effects.update', error)
    res.status(500).json({
      error: t('effects.updateError', undefined, { defaultValue: 'Failed to update effect' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireEffectOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('effects.notFound', undefined, { defaultValue: 'Effect not found' }),
      })
      return
    }
    await deleteById('effects', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('effects.delete', error)
    res.status(500).json({
      error: t('effects.deleteError', undefined, { defaultValue: 'Failed to delete effect' }),
    })
  }
})

export default router
