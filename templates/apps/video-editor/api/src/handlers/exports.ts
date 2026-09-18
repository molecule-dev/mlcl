/**
 * Video exports handler — queue server-side renders, list status, fetch
 * a single export.
 *
 * Authorization: every export is owner-scoped via the parent project. The
 * actual ffmpeg render is currently a stub job — it returns the first clip's
 * `source_url` as the "rendered" output and immediately marks status `done`.
 *
 * BLOCKED: ffmpeg-bond pending — when @molecule/api-video-render lands, the
 * stub finalisation below should hand off to the queue worker. See
 * docs/flagship-rollout/packages-proposed/api-video-render.md.
 */

import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { count, create, findMany, updateById } from '@molecule/api-database'
import { enforceLimit, getEffectiveTier } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { requireExportOwner, requireProjectOwner } from '../lib/authz.js'
import type { VideoEditorLimits } from '../tiers.js'

const createSchema = z.object({
  project_id: z.string().min(1),
  format: z.enum(['mp4', 'webm', 'gif']).optional().default('mp4'),
  quality: z.enum(['low', 'medium', 'high']).optional().default('high'),
  resolution: z.enum(['480p', '720p', '1080p', '4k']).optional().default('1080p'),
})

const router = Router()

router.use(requireAuth)

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const projectId = String(req.query.projectId ?? req.query.project_id ?? '')
    const where: Array<{ field: string; operator: '='; value: unknown }> = [
      { field: 'owner_id', operator: '=', value: userId },
    ]
    if (projectId) {
      const check = await requireProjectOwner(projectId, userId)
      if (!check.ok) {
        res.status(check.status).json({
          error: t('projects.notFound', undefined, { defaultValue: 'Project not found' }),
        })
        return
      }
      where.push({ field: 'project_id', operator: '=', value: projectId })
    }
    const exports = await findMany('video_exports', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(exports)
  } catch (error) {
    logger.error('exports.list', error)
    res.status(500).json({
      error: t('exports.listError', undefined, { defaultValue: 'Failed to list exports' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireExportOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('exports.notFound', undefined, { defaultValue: 'Export not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (error) {
    logger.error('exports.read', error)
    res.status(500).json({
      error: t('exports.readError', undefined, { defaultValue: 'Failed to read export' }),
    })
  }
})

// Free-tier export cap — defined in tiers.ts + advertised, but never enforced (entitlements were
// wired at boot yet read by no handler). Cap the export count and, above it, gate on canExport.
const enforceExportLimit = enforceLimit<VideoEditorLimits>({
  limitType: 'maxExports',
  getLimit: (limits) => limits.maxExports,
  getCurrent: async (userId) =>
    count('video_exports', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceExportLimit, async (req: Request, res: Response) => {
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
    // Exporting is a paid capability: the Free plan has canExport=false, but the export route ran
    // for everyone. Gate it on the effective tier.
    const tier = await getEffectiveTier<VideoEditorLimits>(res)
    if (!tier.limits.canExport) {
      res.status(402).json({
        error: t('exports.requiresPaidPlan', undefined, {
          defaultValue: 'Exporting is a paid feature. Upgrade your plan to export your video.',
        }),
        limitType: 'canExport',
      })
      return
    }
    const projectCheck = await requireProjectOwner(parsed.data.project_id, userId)
    if (!projectCheck.ok) {
      res.status(projectCheck.status).json({
        error: t('projects.notFound', undefined, { defaultValue: 'Project not found' }),
      })
      return
    }
    const created = await create('video_exports', {
      project_id: parsed.data.project_id,
      owner_id: userId,
      format: parsed.data.format ?? 'mp4',
      quality: parsed.data.quality ?? 'high',
      resolution: parsed.data.resolution ?? '1080p',
      status: 'pending',
      progress: 0,
      output_url: null,
      created_at: new Date().toISOString(),
    })
    const exportRow = created.data as { id?: string } | undefined
    // Stub finalisation: synchronous render fake. When the ffmpeg bond ships
    // this becomes an asynchronous queue dispatch; for v1 we mark the export
    // as done immediately so the UI can complete the "render → download"
    // flow end-to-end without an external worker.
    if (exportRow?.id) {
      try {
        const firstClip = await findMany<{ source_url: string }>('clips', {
          where: [{ field: 'project_id', operator: '=', value: parsed.data.project_id }],
          orderBy: [{ field: 'position', direction: 'asc' }],
          limit: 1,
        })
        const stubUrl = firstClip[0]?.source_url ?? null
        const finalised = await updateById('video_exports', exportRow.id, {
          status: 'done',
          progress: 100,
          output_url: stubUrl,
          finished_at: new Date().toISOString(),
        })
        res.status(201).json(finalised.data)
        return
      } catch (_error) {
        // non-fatal — stub finalisation failure still surfaces the queued row
      }
    }
    res.status(201).json(created.data)
  } catch (error) {
    logger.error('exports.create', error)
    res.status(500).json({
      error: t('exports.createError', undefined, { defaultValue: 'Failed to queue export' }),
    })
  }
})

export default router
