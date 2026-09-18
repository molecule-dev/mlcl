/**
 * Styles handler — owns user-curated style presets that bundle a model,
 * sampler, prompt scaffold and visual chips. Backed by `public.style_presets`.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1).max(120),
  prompt_modifier: z.string().max(2000).optional(),
  negative_modifier: z.string().max(2000).optional(),
  description: z.string().max(2000).optional(),
})

interface UserActiveStyleRow {
  id: string
  oauthData?: { activeStyleId?: string } | null
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    // User presets + global presets (where user_id IS NULL).
    const userPresets = await findMany<Record<string, unknown>>('style_presets', {
      where: [{ field: 'user_id', operator: '=', value: userId }] as WhereCondition[],
      orderBy: [{ field: 'created_at', direction: 'asc' }] as OrderBy[],
    })
    const user = await findById<UserActiveStyleRow>('users', userId)
    const activeStyleId = user?.oauthData?.activeStyleId ?? null
    res.json(userPresets.map((p) => ({ ...p, active: p.id === activeStyleId })))
  } catch (error) {
    logger.error('styles.list', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const body = req.body as z.infer<typeof createSchema>
    const created = await create('style_presets', {
      user_id: userId,
      name: body.name,
      prompt_modifier: body.prompt_modifier ?? '',
      negative_modifier: body.negative_modifier ?? null,
      description: body.description ?? null,
      sample_image_url: null,
    })
    res.status(201).json(created.data)
  } catch (error) {
    logger.error('styles.create', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/activate', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const id = String(req.params.id)
    const found = await findById<Record<string, unknown>>('style_presets', id)
    if (!found || (found.user_id !== userId && found.user_id !== null)) {
      return res.status(404).json({
        error: t('styles.notFound', {}, { defaultValue: 'Style not found' }),
      })
    }
    // Touch updated_at so client can observe the activation request.
    const updated = await updateById('style_presets', id, {
      updated_at: new Date(),
    })
    // Persist the active selection on the user so subsequent /styles
    // listings reflect which preset is currently active.
    const user = await findById<UserActiveStyleRow>('users', userId)
    const oauthData = { ...(user?.oauthData ?? {}), activeStyleId: id }
    await updateById('users', userId, { oauthData, updatedAt: new Date() })
    res.json({ ...updated.data, active: true })
  } catch (error) {
    logger.error('styles.activate', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const id = String(req.params.id)
    const found = await findById<Record<string, unknown>>('style_presets', id)
    if (!found || found.user_id !== userId) {
      return res.status(404).json({
        error: t('styles.notFound', {}, { defaultValue: 'Style not found' }),
      })
    }
    await deleteById('style_presets', id)
    res.status(204).end()
  } catch (error) {
    logger.error('styles.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
