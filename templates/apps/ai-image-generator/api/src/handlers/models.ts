/**
 * Models handler — exposes the catalogue of diffusion models available
 * to the authed user. The catalogue is currently a static manifest
 * derived from the `@molecule/api-ai-image-generation` provider tier
 * registry (image providers, capabilities, vendor names). Each user can
 * activate one model — the active selection is persisted in their
 * profile (the `oauthData.activeModel` jsonb slot on users).
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const activateSchema = z.object({ id: z.string().min(1) })

const CATALOG = [
  {
    id: 'reverie-xl-v3',
    name: 'Reverie XL v3',
    vendor: 'Reverie Labs',
    description: 'Flagship diffusion model — best for portraiture and editorial work.',
    capabilities: ['Photoreal', 'Portrait', 'Long-form prompts'],
  },
  {
    id: 'reverie-flash',
    name: 'Reverie Flash',
    vendor: 'Reverie Labs',
    description: 'Sub-second drafts — ideal for ideation and live exploration.',
    capabilities: ['Fast', 'Iterative', 'Sketch'],
  },
  {
    id: 'reverie-print',
    name: 'Reverie Print',
    vendor: 'Reverie Labs',
    description: 'High-resolution print-ready output for posters and packaging.',
    capabilities: ['Print', '300 DPI', 'CMYK aware'],
  },
  {
    id: 'helio-realtime',
    name: 'Helio Realtime',
    vendor: 'Helio Open',
    description: 'Open-source realtime diffusion — community fine-tunes welcome.',
    capabilities: ['Realtime', 'Open source'],
  },
] as const

interface UserRow {
  id: string
  oauthData?: { activeModel?: string } | null
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const user = await findById<UserRow>('users', userId)
    const activeId = user?.oauthData?.activeModel ?? CATALOG[0].id
    res.json(
      CATALOG.map((m) => ({
        ...m,
        active: m.id === activeId,
      })),
    )
  } catch (error) {
    logger.error('models.list', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/active', validateBody(activateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const body = req.body as z.infer<typeof activateSchema>
    if (!CATALOG.some((m) => m.id === body.id)) {
      return res.status(404).json({
        error: t('models.notFound', {}, { defaultValue: 'Model not found' }),
      })
    }
    const user = await findById<UserRow>('users', userId)
    const oauthData = { ...(user?.oauthData ?? {}), activeModel: body.id }
    await updateById('users', userId, { oauthData, updatedAt: new Date() })
    res.json({ activeModel: body.id })
  } catch (error) {
    logger.error('models.setActive', error)
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
    if (!CATALOG.some((m) => m.id === id)) {
      return res.status(404).json({
        error: t('models.notFound', {}, { defaultValue: 'Model not found' }),
      })
    }
    const user = await findById<UserRow>('users', userId)
    const oauthData = { ...(user?.oauthData ?? {}), activeModel: id }
    await updateById('users', userId, { oauthData, updatedAt: new Date() })
    res.json({ activeModel: id })
  } catch (error) {
    logger.error('models.activate', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
