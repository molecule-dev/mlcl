import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit, getEffectiveTier } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { AnimationToolLimits } from '../tiers.js'

const router = Router()

// --- Schemas ---

const listQuerySchema = z.object({
  projectId: z.string().min(1),
})

// We deliberately constrain to formats we can actually render in-process
// from the project's keyframes/layers data. mp4/gif require a real video/
// raster render pipeline (ffmpeg / sharp animated output) which is not
// wired yet — exposing them here would just produce empty downloads,
// which is the failure pattern the production-ready contract is meant to
// catch. See `mlcl/templates/apps/animation-tool/app/src/pages/Export.tsx`
// for the matching UI restriction.
const ALLOWED_FORMATS = ['lottie', 'svg', 'css'] as const
const ALLOWED_QUALITY = ['low', 'medium', 'high'] as const

const createExportSchema = z.object({
  projectId: z.string().min(1),
  format: z.enum(ALLOWED_FORMATS).optional(),
  quality: z.enum(ALLOWED_QUALITY).optional(),
})

// --- Helpers ---

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ProjectRow {
  id: string
  owner_id: string
  name: string
  width?: number
  height?: number
  fps?: number
  duration?: number | string
}

interface KeyframeRow {
  id: string
  project_id: string
  layer_id: string | null
  time: number | string
  property: string
  value: unknown
  easing: string
}

interface LayerRow {
  id: string
  project_id: string
  name: string
  type: string
  z_index: number
  transform: unknown
}

async function projectIfOwned(projectId: string, userId: string): Promise<ProjectRow | null> {
  if (!UUID_RX.test(projectId)) return null
  try {
    const project = await findById<ProjectRow>('animation_projects', projectId)
    if (!project || project.owner_id !== userId) return null
    return project
  } catch (_error) {
    // DB lookup failed; caller treats null as "not found / not owned"
    return null
  }
}

function parseValue(raw: unknown): unknown {
  if (raw == null) return null
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch (_error) {
    // Invalid JSON — return the raw string as the fallback value
    return raw
  }
}

interface RenderResult {
  body: string
  contentType: string
  filename: string
}

const safeNameFor = (project: ProjectRow): string =>
  project.name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 64) || 'project'

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => {
    if (c === '<') return '&lt;'
    if (c === '>') return '&gt;'
    if (c === '&') return '&amp;'
    if (c === '"') return '&quot;'
    return '&#39;'
  })
}

function renderExport(
  format: 'lottie' | 'svg' | 'css',
  project: ProjectRow,
  layers: LayerRow[],
  keyframes: KeyframeRow[],
): RenderResult {
  const fps = Number(project.fps ?? 60) || 60
  const width = Number(project.width ?? 800) || 800
  const height = Number(project.height ?? 600) || 600
  const duration =
    Number(project.duration ?? 0) || Math.max(1, Math.ceil(keyframes.length / Math.max(1, fps)))
  const safeName = safeNameFor(project)

  if (format === 'lottie') {
    const lottie = {
      v: '5.7.4',
      fr: fps,
      ip: 0,
      op: Math.max(1, Math.round(duration * fps)),
      w: width,
      h: height,
      nm: project.name,
      ddd: 0,
      assets: [],
      layers: layers.map((layer, idx) => {
        const layerKeyframes = keyframes
          .filter((kf) => kf.layer_id === layer.id)
          .sort((a, b) => Number(a.time) - Number(b.time))
        const opacityFrames = layerKeyframes.filter((kf) => kf.property === 'opacity')
        return {
          ddd: 0,
          ind: idx + 1,
          ty: layer.type === 'text' ? 5 : 4,
          nm: layer.name,
          ks: {
            o:
              opacityFrames.length === 0
                ? { a: 0, k: 100 }
                : {
                    a: 1,
                    k: opacityFrames.map((kf) => ({
                      t: Math.round(Number(kf.time) * fps),
                      s: [Number(parseValue(kf.value) ?? 100)],
                    })),
                  },
            r: { a: 0, k: 0 },
            p: { a: 0, k: [width / 2, height / 2, 0] },
            a: { a: 0, k: [0, 0, 0] },
            s: { a: 0, k: [100, 100, 100] },
          },
          shapes: [],
          ip: 0,
          op: Math.max(1, Math.round(duration * fps)),
          st: 0,
        }
      }),
      meta: {
        g: 'animation-tool',
        a: 'animation-tool-export',
        k: keyframes.length,
        l: layers.length,
      },
    }
    return {
      body: JSON.stringify(lottie),
      contentType: 'application/json',
      filename: `${safeName}.json`,
    }
  }

  if (format === 'svg') {
    const layersSvg = layers
      .map((layer, idx) => {
        const layerKeyframes = keyframes
          .filter((kf) => kf.layer_id === layer.id)
          .sort((a, b) => Number(a.time) - Number(b.time))
        const opacityFrames = layerKeyframes.filter((kf) => kf.property === 'opacity')
        const animations =
          opacityFrames.length > 0
            ? `<animate attributeName="opacity" values="${opacityFrames
                .map((kf) => Number(parseValue(kf.value) ?? 1))
                .join(';')}" keyTimes="${opacityFrames
                .map((kf) => (Number(kf.time) / Math.max(0.001, duration)).toFixed(4))
                .join(';')}" dur="${duration}s" repeatCount="indefinite"/>`
            : ''
        const x = (idx % 4) * (width / 4)
        const y = Math.floor(idx / 4) * (height / 4)
        const w = width / 4 - 8
        const h = height / 4 - 8
        return `<g id="${escapeXml(layer.id)}" data-name="${escapeXml(layer.name)}" data-type="${escapeXml(layer.type)}"><rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="hsl(${(idx * 47) % 360}, 70%, 60%)" rx="6">${animations}</rect><text x="${(x + 8).toFixed(2)}" y="${(y + 22).toFixed(2)}" font-family="Inter, sans-serif" font-size="12" fill="white">${escapeXml(layer.name)}</text></g>`
      })
      .join('\n  ')
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-fps="${fps}" data-keyframes="${keyframes.length}" data-layers="${layers.length}">\n  <title>${escapeXml(project.name)}</title>\n  ${layersSvg || `<rect width="${width}" height="${height}" fill="#16162a"/>`}\n</svg>\n`
    return {
      body,
      contentType: 'image/svg+xml',
      filename: `${safeName}.svg`,
    }
  }

  // css
  const layerCss = layers
    .map((layer) => {
      const layerKeyframes = keyframes
        .filter((kf) => kf.layer_id === layer.id)
        .sort((a, b) => Number(a.time) - Number(b.time))
      if (layerKeyframes.length === 0) {
        return `/* layer ${layer.name}: no keyframes */`
      }
      const safeId = layer.id.replace(/[^A-Za-z0-9_-]+/g, '_')
      const stops = layerKeyframes
        .map((kf) => {
          const pct = ((Number(kf.time) / Math.max(0.001, duration)) * 100).toFixed(2)
          const value = parseValue(kf.value)
          const property = kf.property
          const cssValue = property === 'opacity' ? String(value ?? 1) : `var(--${property})`
          return `  ${pct}% { ${property}: ${cssValue}; animation-timing-function: ${kf.easing || 'linear'}; }`
        })
        .join('\n')
      return `@keyframes anim_${safeId} {\n${stops}\n}\n.anim-${safeId} { animation: anim_${safeId} ${duration}s infinite; }`
    })
    .join('\n\n')
  const header = `/* ${project.name} — ${layers.length} layer(s), ${keyframes.length} keyframe(s) @ ${fps}fps */`
  return {
    body: `${header}\n\n${layerCss || '/* No layers yet — add layers and keyframes in the editor. */'}\n`,
    contentType: 'text/css',
    filename: `${safeName}.css`,
  }
}

// --- Routes ---

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { projectId } = req.query as unknown as z.infer<typeof listQuerySchema>
    const project = await projectIfOwned(projectId, userId)
    if (!project) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    const exportsList = await findMany<Record<string, unknown>>('animation_exports', {
      where: [{ field: 'project_id', operator: '=', value: projectId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const stripped = (exportsList ?? []).map(({ artifact_data: _drop, ...rest }) => rest)
    res.json(stripped)
  } catch (error) {
    logger.error('GET /api/exports failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

const enforceExportLimit = enforceLimit<AnimationToolLimits>({
  limitType: 'maxExports',
  getLimit: (limits) => limits.maxExports,
  // animation_exports has no user_id — ownership runs through the project. This
  // filtered on a column that has never existed, so every POST /api/exports
  // died in the limit check with `column "user_id" does not exist` (500), taking
  // the export flow and its three e2e tests with it. Adding the column would not
  // have helped: the insert below never sets one, so the count would read 0 and
  // the limit would never fire.
  getCurrent: async (userId) => {
    const owned = await findMany<{ id: string }>('animation_projects', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const projectIds = (owned ?? []).map((p) => p.id)
    if (projectIds.length === 0) return 0
    return count('animation_exports', [{ field: 'project_id', operator: 'in', value: projectIds }])
  },
}) as unknown as RequestHandler

router.post(
  '/',
  enforceExportLimit,
  validateBody(createExportSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const { projectId, format, quality } = req.body as z.infer<typeof createExportSchema>
      const project = await projectIfOwned(projectId, userId)
      if (!project) {
        res
          .status(404)
          .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
        return
      }
      // Exporting is a paid-plan feature (AnimationToolLimits.canExport). The
      // maxExports COUNT gate alone still let a free user (canExport:false) export
      // up to the cap — gate on the flag too.
      const tier = await getEffectiveTier<AnimationToolLimits>(res)
      if (!tier.limits.canExport) {
        res.status(402).json({
          error: t(
            'plan.exportRequiresUpgrade',
            {},
            { defaultValue: 'Exporting requires a paid plan' },
          ),
        })
        return
      }
      const chosenFormat = format ?? 'lottie'

      const layers =
        (await findMany<LayerRow>('layers', {
          where: [{ field: 'project_id', operator: '=', value: projectId }],
          orderBy: [{ field: 'z_index', direction: 'asc' }],
        })) ?? []
      const keyframes =
        (await findMany<KeyframeRow>('keyframes', {
          where: [{ field: 'project_id', operator: '=', value: projectId }],
          orderBy: [{ field: 'time', direction: 'asc' }],
        })) ?? []

      const created = await create('animation_exports', {
        project_id: projectId,
        format: chosenFormat,
        quality: quality ?? 'high',
        status: 'rendering',
        created_at: new Date().toISOString(),
      })
      const newId = (created.data as { id?: string } | undefined)?.id
      if (!newId) {
        res
          .status(500)
          .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
        return
      }

      let rendered: RenderResult
      try {
        rendered = renderExport(chosenFormat, project, layers, keyframes)
      } catch (err) {
        logger.error('export render failed', err)
        await updateById('animation_exports', newId, { status: 'failed' })
        res
          .status(500)
          .json({ error: t('export.renderFailed', {}, { defaultValue: 'Render failed.' }) })
        return
      }

      const downloadUrl = `/api/exports/${newId}/download`
      const updated = await updateById('animation_exports', newId, {
        status: 'completed',
        output_url: downloadUrl,
        content_type: rendered.contentType,
        artifact_data: rendered.body,
      })
      const finalRow = { ...((updated.data ?? {}) as Record<string, unknown>) }
      delete finalRow.artifact_data
      const payload = finalRow
      res.status(201).json(payload)
    } catch (error) {
      logger.error('POST /api/exports failed', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    if (!UUID_RX.test(id)) {
      res
        .status(404)
        .json({ error: t('export.notFound', {}, { defaultValue: 'Export not found.' }) })
      return
    }
    const exportRow = await findById<Record<string, unknown>>('animation_exports', id)
    if (!exportRow) {
      res
        .status(404)
        .json({ error: t('export.notFound', {}, { defaultValue: 'Export not found.' }) })
      return
    }
    const project = await projectIfOwned(String(exportRow.project_id), userId)
    if (!project) {
      res
        .status(404)
        .json({ error: t('export.notFound', {}, { defaultValue: 'Export not found.' }) })
      return
    }
    const data = exportRow.artifact_data
    if (typeof data !== 'string' || data.length === 0) {
      res
        .status(409)
        .json({ error: t('export.notReady', {}, { defaultValue: 'Export is not ready yet.' }) })
      return
    }
    const format = String(exportRow.format ?? 'lottie')
    const ext = format === 'lottie' ? 'json' : format
    const safeName = safeNameFor(project)
    res.setHeader('Content-Type', String(exportRow.content_type ?? 'application/octet-stream'))
    res.setHeader('Content-Length', String(Buffer.byteLength(data, 'utf8')))
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.${ext}"`)
    res.send(data)
  } catch (error) {
    logger.error('GET /api/exports/:id/download failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
