/**
 * The caller's wedding — single-wedding app, so routes are singular.
 *
 * GET  /            the caller's wedding (seeds the starter kit on first call)
 * PUT  /            update couple names / date / venue / plus-one policy
 * PUT  /regenerate-code  mint a fresh RSVP code (invalidates the old link)
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { generateRsvpCode } from '../lib/wedding.js'
import { findWeddingForUser, seedDemoForUser } from './_seed.js'

const router = Router()

const updateWeddingSchema = z.object({
  partner_a_name: z.string().min(1).max(120).optional(),
  partner_b_name: z.string().min(1).max(120).optional(),
  wedding_date: z.string().min(1).optional(),
  venue: z.string().max(200).optional(),
  plus_ones_allowed: z.boolean().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    // First call provisions the starter wedding kit (idempotent per user).
    await seedDemoForUser(userId)
    const wedding = await findWeddingForUser(userId)
    if (!wedding) {
      return res
        .status(404)
        .json({ error: t('wedding.notFound', {}, { defaultValue: 'Wedding not found' }) })
    }
    res.json(wedding)
  } catch (err) {
    logger.error('wedding GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/', validateBody(updateWeddingSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const wedding = await findWeddingForUser(userId)
    if (!wedding) {
      return res
        .status(404)
        .json({ error: t('wedding.notFound', {}, { defaultValue: 'Wedding not found' }) })
    }
    const writes: Record<string, unknown> = { ...req.body, updated_at: new Date().toISOString() }
    if (typeof req.body.wedding_date === 'string') {
      writes.wedding_date = new Date(req.body.wedding_date).toISOString()
    }
    const result = await updateById('weddings', String(wedding.id), writes)
    res.json(result.data)
  } catch (err) {
    logger.error('wedding PUT failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/regenerate-code', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const wedding = await findWeddingForUser(userId)
    if (!wedding) {
      return res
        .status(404)
        .json({ error: t('wedding.notFound', {}, { defaultValue: 'Wedding not found' }) })
    }
    // Loop-guard: UNIQUE(rsvp_code) collisions are astronomically unlikely
    // (~2^50 combinations); retry a handful of times rather than surfacing
    // a driver error to the couple.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateRsvpCode()
      try {
        const result = await updateById('weddings', String(wedding.id), {
          rsvp_code: code,
          updated_at: new Date().toISOString(),
        })
        return res.json(result.data)
      } catch (err) {
        if (attempt === 4) throw err
      }
    }
  } catch (err) {
    logger.error('wedding PUT regenerate-code failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
