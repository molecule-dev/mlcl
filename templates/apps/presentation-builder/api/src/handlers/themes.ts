import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { PresentationBuilderLimits } from '../tiers.js'

const router = Router()

const createThemeSchema = z.object({
  name: z.string().min(1),
  colors: z.record(z.string(), z.unknown()).optional(),
  fonts: z.record(z.string(), z.unknown()).optional(),
  backgroundImage: z.string().nullable().optional(),
})

router.get('/themes', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const themes = await findMany('presentation_themes', {
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    // Filter to system themes plus user-owned themes.
    const visible = (themes as Array<Record<string, unknown>>).filter(
      (theme) => theme.is_system === true || theme.owner_id === userId,
    )
    res.json(visible)
  } catch (err) {
    logger.error('theme.list_failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/themes/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const theme = await findById<Record<string, unknown>>('presentation_themes', id)
    if (!theme || (theme.is_system !== true && theme.owner_id !== userId)) {
      return res.status(404).json({
        error: t('themes.notFound', undefined, { defaultValue: 'Theme not found' }),
      })
    }
    res.json(theme)
  } catch (err) {
    logger.error('theme.read_failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/themes',
  enforceLimit<PresentationBuilderLimits>({
    limitType: 'maxThemes',
    getLimit: (limits) => limits.maxThemes,
    getCurrent: async (userId) =>
      // Count only user-owned themes (system themes do not consume a quota slot).
      (
        await findMany('presentation_themes', {
          where: [{ field: 'owner_id', operator: '=', value: userId }],
        })
      ).length,
  }) as unknown as RequestHandler,
  validateBody(createThemeSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
      }
      const { name, colors, fonts, backgroundImage } = req.body as z.infer<typeof createThemeSchema>
      const result = await create('presentation_themes', {
        owner_id: userId,
        name,
        colors: colors ? JSON.stringify(colors) : '{}',
        fonts: fonts ? JSON.stringify(fonts) : '{}',
        background_image: backgroundImage ?? null,
        is_system: false,
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      logger.error('theme.create_failed', err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/themes/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const theme = await findById<Record<string, unknown>>('presentation_themes', id)
    if (!theme || theme.owner_id !== userId) {
      return res.status(404).json({
        error: t('themes.notFound', undefined, { defaultValue: 'Theme not found' }),
      })
    }
    await deleteById('presentation_themes', id)
    res.status(204).end()
  } catch (err) {
    logger.error('theme.delete_failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
