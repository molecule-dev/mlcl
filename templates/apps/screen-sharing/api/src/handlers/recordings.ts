/**
 * Recordings handler — list/read/create/update/delete + share + public read.
 *
 * Authorization: owner-scoped writes (owner_id = session.userId). Reads
 * cover the owner OR workspace members when visibility allows; the
 * `/shared/:token` endpoint is intentionally public so unauthenticated
 * viewers can resolve a share link.
 */

import { randomBytes } from 'node:crypto'

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { requireRecordingAccess, requireRecordingOwner } from '../lib/authz.js'

const createSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2_000).optional(),
  workspace_id: z.string().min(1).optional(),
  folder_id: z.string().min(1).optional(),
  video_url: z.string().min(1).max(2_000),
  thumbnail_url: z.string().max(2_000).optional(),
  gif_url: z.string().max(2_000).optional(),
  duration_ms: z.number().int().min(0).optional().default(0),
  size_bytes: z.number().int().min(0).optional().default(0),
  visibility: z.enum(['private', 'workspace', 'public', 'password']).optional().default('private'),
})

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2_000).optional(),
  folder_id: z.string().min(1).nullable().optional(),
  visibility: z.enum(['private', 'workspace', 'public', 'password']).optional(),
  comments_allowed: z.boolean().optional(),
  allow_download: z.boolean().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  max_views: z.number().int().min(1).nullable().optional(),
  share_password_hash: z.string().nullable().optional(),
})

const shareSchema = z.object({
  emails: z.array(z.string().email()).max(50).optional(),
  from_email: z.string().email().optional(),
})

const router = Router()

// Share tokens are bearer secrets for an UNauthenticated public route, so they must be
// unguessable. Math.random() is a non-cryptographic PRNG (V8 xorshift128+) whose state a
// caller can recover from a few of its own tokens to predict others' — use a CSPRNG. [L2-1]
const generateToken = (): string => randomBytes(32).toString('base64url')

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const where: Array<{ field: string; operator: '='; value: unknown }> = [
      { field: 'owner_id', operator: '=', value: userId },
    ]
    if (req.query.folder_id) {
      where.push({ field: 'folder_id', operator: '=', value: String(req.query.folder_id) })
    }
    if (req.query.workspace_id) {
      where.push({ field: 'workspace_id', operator: '=', value: String(req.query.workspace_id) })
    }
    const recordings = await findMany('recordings', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(recordings)
  } catch (error) {
    logger.error('recordings.list', error)
    res.status(500).json({
      error: t('recordings.listError', undefined, { defaultValue: 'Failed to list recordings' }),
    })
  }
})

/**
 * Returns recordings shared with the caller via workspace membership or
 * public visibility, excluding their own. Powers the "Shared with me"
 * page which would otherwise have nothing to show.
 */
router.get('/feed', requireAuth, async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const memberships = await findMany<{ workspace_id: string }>('workspace_members', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const workspaceIds = memberships.map((m) => m.workspace_id).filter(Boolean)
    const collected: Record<string, unknown>[] = []
    if (workspaceIds.length > 0) {
      const wsRecs = await findMany<Record<string, unknown>>('recordings', {
        where: [
          { field: 'workspace_id', operator: 'in', value: workspaceIds },
          { field: 'visibility', operator: 'in', value: ['workspace', 'public'] },
        ],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 200,
      })
      collected.push(...wsRecs)
    }
    const publicRecs = await findMany<Record<string, unknown>>('recordings', {
      where: [{ field: 'visibility', operator: '=', value: 'public' }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    collected.push(...publicRecs)
    const seen = new Set<string>()
    const visible = collected.filter((rec) => {
      const id = String(rec.id ?? '')
      if (!id || seen.has(id)) return false
      seen.add(id)
      return String(rec.owner_id ?? '') !== userId
    })
    res.json(visible)
  } catch (error) {
    logger.error('recordings.feed', error)
    res.status(500).json({
      error: t('recordings.feedError', undefined, {
        defaultValue: 'Failed to list shared recordings',
      }),
    })
  }
})

router.get('/shared/:token', async (req: Request, res: Response) => {
  try {
    const matches = await findMany<Record<string, unknown>>('recordings', {
      where: [{ field: 'share_token', operator: '=', value: req.params.token }],
      limit: 1,
    })
    const recording = matches[0]
    if (!recording) {
      res.status(404).json({
        error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
      })
      return
    }
    const expires = recording.expires_at as string | null | undefined
    if (expires && new Date(expires).getTime() < Date.now()) {
      res.status(410).json({
        error: t('recordings.expired', undefined, { defaultValue: 'Share link has expired' }),
      })
      return
    }
    // Enforce the recording's view cap (max_views) against its live view_count — the same gate the
    // sibling share_links.resolve applies. This path checked expires + password but never max_views,
    // so a recording capped at N views served unlimited views.
    if (recording.max_views && Number(recording.view_count ?? 0) >= Number(recording.max_views)) {
      res.status(410).json({
        error: t('recordings.viewsDepleted', undefined, {
          defaultValue: 'This recording has reached its view limit',
        }),
      })
      return
    }
    if (recording.share_password_hash) {
      const provided = String(req.query.password ?? req.headers['x-share-password'] ?? '')
      if (!provided || provided !== recording.share_password_hash) {
        res.status(401).json({
          error: t('recordings.passwordRequired', undefined, {
            defaultValue: 'Password required',
          }),
        })
        return
      }
    }
    res.json(recording)
  } catch (error) {
    logger.error('recordings.readShared', error)
    res.status(500).json({
      error: t('recordings.readError', undefined, { defaultValue: 'Failed to read recording' }),
    })
  }
})

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireRecordingAccess(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (error) {
    logger.error('recordings.read', error)
    res.status(500).json({
      error: t('recordings.readError', undefined, { defaultValue: 'Failed to read recording' }),
    })
  }
})

router.post('/', requireAuth, async (req: Request, res: Response) => {
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
    const result = await create('recordings', {
      owner_id: userId,
      workspace_id: parsed.data.workspace_id ?? null,
      folder_id: parsed.data.folder_id ?? null,
      title:
        parsed.data.title ??
        t('recordings.untitled', undefined, { defaultValue: 'Untitled Recording' }),
      description: parsed.data.description ?? null,
      video_url: parsed.data.video_url,
      thumbnail_url: parsed.data.thumbnail_url ?? null,
      gif_url: parsed.data.gif_url ?? null,
      duration_ms: parsed.data.duration_ms ?? 0,
      size_bytes: parsed.data.size_bytes ?? 0,
      status: 'ready',
      visibility: parsed.data.visibility ?? 'private',
      share_token: generateToken(),
      view_count: 0,
      comment_count: 0,
      reaction_count: 0,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('recordings.create', error)
    res.status(500).json({
      error: t('recordings.createError', undefined, { defaultValue: 'Failed to create recording' }),
    })
  }
})

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireRecordingOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
      })
      return
    }
    const result = await updateById('recordings', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('recordings.update', error)
    res.status(500).json({
      error: t('recordings.updateError', undefined, { defaultValue: 'Failed to update recording' }),
    })
  }
})

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireRecordingOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
      })
      return
    }
    await deleteById('recordings', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('recordings.delete', error)
    res.status(500).json({
      error: t('recordings.deleteError', undefined, { defaultValue: 'Failed to delete recording' }),
    })
  }
})

router.post('/:id/share', requireAuth, async (req: Request, res: Response) => {
  const parsed = shareSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireRecordingOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
      })
      return
    }
    const recording = check.row
    if (parsed.data.emails?.length) {
      for (const email of parsed.data.emails) {
        try {
          await sendMail({
            from:
              parsed.data.from_email ??
              process.env.EMAIL_FROM ??
              `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
            to: email,
            subject: t(
              'recordings.shareSubject',
              { title: String(recording.title) },
              { defaultValue: `${String(recording.title)} — shared with you` },
            ),
            text: t(
              'recordings.shareBody',
              { token: String(recording.share_token) },
              { defaultValue: `Watch recording: ${String(recording.share_token)}` },
            ),
          })
        } catch (_error) {
          // delivery failures non-fatal in test envs — log at warn level
          logger.warn('recordings.share.email', String(_error))
        }
      }
    }
    res.json({ share_token: String(recording.share_token), recording_id: String(recording.id) })
  } catch (error) {
    logger.error('recordings.share', error)
    res.status(500).json({
      error: t('recordings.shareError', undefined, { defaultValue: 'Failed to share recording' }),
    })
  }
})

export default router
