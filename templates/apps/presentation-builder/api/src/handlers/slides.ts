import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

async function userOwnsPresentation(presentationId: string, userId: string): Promise<boolean> {
  const presentation = await findById<Record<string, unknown>>('presentations', presentationId)
  if (!presentation) return false
  if (presentation.owner_id === userId) return true
  const share = await findOne<Record<string, unknown>>('presentation_shares', [
    { field: 'presentation_id', operator: '=', value: presentationId },
    { field: 'shared_with_user_id', operator: '=', value: userId },
  ])
  return !!share
}

async function userCanEditPresentation(presentationId: string, userId: string): Promise<boolean> {
  const presentation = await findById<Record<string, unknown>>('presentations', presentationId)
  if (!presentation) return false
  if (presentation.owner_id === userId) return true
  const share = await findOne<Record<string, unknown>>('presentation_shares', [
    { field: 'presentation_id', operator: '=', value: presentationId },
    { field: 'shared_with_user_id', operator: '=', value: userId },
  ])
  return share?.role === 'editor'
}

const listSlidesQuerySchema = z.object({
  presentationId: z.string().min(1),
})

const createSlideSchema = z.object({
  presentationId: z.string().min(1),
  layout: z.string().optional(),
  content: z.unknown().optional(),
  speakerNotes: z.string().optional(),
  position: z.number().optional(),
})

const updateSlideSchema = z.object({
  layout: z.string().optional(),
  content: z.unknown().optional(),
  speakerNotes: z.string().optional(),
  background: z.string().nullable().optional(),
  transition: z.string().optional(),
  position: z.number().optional(),
})

router.get('/slides', validateQuery(listSlidesQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const presentationId = req.query.presentationId as string
    if (!(await userOwnsPresentation(presentationId, userId))) {
      return res.status(404).json({
        error: t('presentations.notFound', undefined, { defaultValue: 'Presentation not found' }),
      })
    }
    const slides = await findMany('slides', {
      where: [{ field: 'presentation_id', operator: '=', value: presentationId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(slides)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/slides/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const slide = await findById<Record<string, unknown>>('slides', id)
    if (!slide || !(await userOwnsPresentation(slide.presentation_id as string, userId))) {
      return res.status(404).json({
        error: t('slides.notFound', undefined, { defaultValue: 'Slide not found' }),
      })
    }
    res.json(slide)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/slides', validateBody(createSlideSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const { presentationId, layout, content, speakerNotes, position } = req.body as z.infer<
      typeof createSlideSchema
    >
    if (!(await userCanEditPresentation(presentationId, userId))) {
      return res.status(404).json({
        error: t('presentations.notFound', undefined, { defaultValue: 'Presentation not found' }),
      })
    }
    const existing = await findMany<Record<string, unknown>>('slides', {
      where: [{ field: 'presentation_id', operator: '=', value: presentationId }],
      orderBy: [{ field: 'position', direction: 'desc' }],
      limit: 1,
    })
    const nextPosition =
      position ?? (existing.length > 0 ? (existing[0].position as number) + 1 : 0)

    const result = await create('slides', {
      presentation_id: presentationId,
      layout: layout ?? 'blank',
      content: content ? JSON.stringify(content) : JSON.stringify({ elements: [] }),
      speaker_notes: speakerNotes ?? '',
      background: null,
      transition: 'none',
      position: nextPosition,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/slides/:id', validateBody(updateSlideSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const slide = await findById<Record<string, unknown>>('slides', id)
    if (!slide || !(await userCanEditPresentation(slide.presentation_id as string, userId))) {
      return res.status(404).json({
        error: t('slides.notFound', undefined, { defaultValue: 'Slide not found' }),
      })
    }
    const body = req.body as z.infer<typeof updateSlideSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.layout !== undefined) updates.layout = body.layout
    if (body.content !== undefined) updates.content = JSON.stringify(body.content)
    if (body.speakerNotes !== undefined) updates.speaker_notes = body.speakerNotes
    if (body.background !== undefined) updates.background = body.background
    if (body.transition !== undefined) updates.transition = body.transition
    if (body.position !== undefined) updates.position = body.position

    const result = await updateById('slides', id, updates)
    res.json(result.data)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/slides/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const slide = await findById<Record<string, unknown>>('slides', id)
    if (!slide || !(await userCanEditPresentation(slide.presentation_id as string, userId))) {
      return res.status(404).json({
        error: t('slides.notFound', undefined, { defaultValue: 'Slide not found' }),
      })
    }
    await deleteById('slides', id)
    res.status(204).end()
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
