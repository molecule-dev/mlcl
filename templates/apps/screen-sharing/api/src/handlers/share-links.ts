/**
 * Share links handler — owner-only create + revoke + public token resolve.
 *
 * The recording itself carries a primary share_token (created at recording
 * creation time); these per-recording link rows let an owner mint
 * additional revocable, password-protected, expiring tokens.
 */

import { randomBytes } from 'node:crypto'

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { requireRecordingOwner } from '../lib/authz.js'

// Public share tokens are bearer secrets — use a CSPRNG, not predictable Math.random. [L2-1]
const generateToken = (): string => randomBytes(32).toString('base64url')

const createSchema = z.object({
  recording_id: z.string().min(1),
  password_hash: z.string().min(1).optional(),
  expires_at: z.string().datetime().optional(),
  max_views: z.number().int().min(1).optional(),
  allow_download: z.boolean().optional().default(false),
})

const router = Router()

router.get('/resolve/:token', async (req: Request, res: Response) => {
  try {
    const matches = await findMany<Record<string, unknown>>('share_links', {
      where: [{ field: 'token', operator: '=', value: req.params.token }],
      limit: 1,
    })
    const link = matches[0]
    if (!link) {
      res.status(404).json({
        error: t('shareLinks.notFound', undefined, { defaultValue: 'Share link not found' }),
      })
      return
    }
    const expires = link.expires_at as string | null | undefined
    if (expires && new Date(expires).getTime() < Date.now()) {
      res.status(410).json({
        error: t('shareLinks.expired', undefined, { defaultValue: 'Share link has expired' }),
      })
      return
    }
    if (link.max_views && Number(link.view_count ?? 0) >= Number(link.max_views)) {
      res.status(410).json({
        error: t('shareLinks.maxedOut', undefined, { defaultValue: 'Share link is depleted' }),
      })
      return
    }
    if (link.password_hash) {
      const provided = String(req.query.password ?? req.headers['x-share-password'] ?? '')
      if (!provided || provided !== link.password_hash) {
        res.status(401).json({
          error: t('shareLinks.passwordRequired', undefined, {
            defaultValue: 'Password required',
          }),
        })
        return
      }
    }
    res.json({ recording_id: String(link.recording_id), allow_download: !!link.allow_download })
  } catch (error) {
    logger.error('shareLinks.resolve', error)
    res.status(500).json({
      error: t('shareLinks.resolveError', undefined, {
        defaultValue: 'Failed to resolve share link',
      }),
    })
  }
})

router.use(requireAuth)

router.get('/recording/:recordingId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireRecordingOwner(req.params.recordingId as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
      })
      return
    }
    const links = await findMany('share_links', {
      where: [{ field: 'recording_id', operator: '=', value: req.params.recordingId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 100,
    })
    res.json(links)
  } catch (error) {
    logger.error('shareLinks.list', error)
    res.status(500).json({
      error: t('shareLinks.listError', undefined, { defaultValue: 'Failed to list share links' }),
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireRecordingOwner(parsed.data.recording_id, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
      })
      return
    }
    const result = await create('share_links', {
      recording_id: parsed.data.recording_id,
      owner_id: userId,
      token: generateToken(),
      password_hash: parsed.data.password_hash ?? null,
      expires_at: parsed.data.expires_at ?? null,
      max_views: parsed.data.max_views ?? null,
      allow_download: parsed.data.allow_download ?? false,
      view_count: 0,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('shareLinks.create', error)
    res.status(500).json({
      error: t('shareLinks.createError', undefined, {
        defaultValue: 'Failed to create share link',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const link = await findById<Record<string, unknown>>('share_links', req.params.id as string)
    if (!link || String(link.owner_id) !== String(userId)) {
      res.status(404).json({
        error: t('shareLinks.notFound', undefined, { defaultValue: 'Share link not found' }),
      })
      return
    }
    await deleteById('share_links', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('shareLinks.delete', error)
    res.status(500).json({
      error: t('shareLinks.deleteError', undefined, {
        defaultValue: 'Failed to delete share link',
      }),
    })
  }
})

export default router
