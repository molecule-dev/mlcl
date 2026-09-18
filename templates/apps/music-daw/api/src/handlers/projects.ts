import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { MusicDawLimits } from '../tiers.js'

const router = Router()

const createProjectSchema = z.object({
  name: z.string().min(1),
  bpm: z.number().int().min(20).max(400).optional(),
  time_signature: z.string().min(1).optional(),
  duration: z.number().nonnegative().optional(),
  is_public: z.boolean().optional(),
  is_pinned: z.boolean().optional(),
  cover_index: z.number().int().min(0).max(11).optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  bpm: z.number().int().min(20).max(400).optional(),
  time_signature: z.string().min(1).optional(),
  duration: z.number().nonnegative().optional(),
  is_public: z.boolean().optional(),
  is_pinned: z.boolean().optional(),
  cover_index: z.number().int().min(0).max(11).optional(),
})

interface ProjectRow {
  id: string
  user_id: string
  name: string
  bpm: number
  time_signature: string
  duration: string | number
  is_public: boolean
  is_pinned?: boolean
  cover_index?: number
  created_at: string | Date
  updatedAt?: string | Date | null
}

async function projectWithDerived(row: ProjectRow): Promise<Record<string, unknown>> {
  const trackCount = await count('audio_tracks', [
    { field: 'project_id', operator: '=', value: row.id },
  ])
  const duration = typeof row.duration === 'string' ? parseFloat(row.duration) : (row.duration ?? 0)
  return {
    ...row,
    duration: Number(duration),
    duration_seconds: Number(duration),
    track_count: trackCount,
    cover_index: row.cover_index ?? 0,
    is_pinned: Boolean(row.is_pinned),
  }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const projects = (await findMany('music_projects', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })) as ProjectRow[]
    const enriched = await Promise.all(projects.map(projectWithDerived))
    res.json(enriched)
  } catch (error) {
    logger.error('projects.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const project = await findById<ProjectRow>('music_projects', id)
    if (!project) {
      return res.status(404).json({
        error: t('projects.notFound', undefined, { defaultValue: 'Project not found.' }),
      })
    }

    // Owner OR public OR collaborator. Authorization is collapsed to a single
    // 404 rather than 403 so we don't leak record existence to non-owners.
    if (project.user_id !== userId && !project.is_public) {
      const collab = await findMany('collaborators', {
        where: [
          { field: 'project_id', operator: '=', value: id },
          { field: 'collaborator_user_id', operator: '=', value: userId },
        ],
      })
      if (!Array.isArray(collab) || collab.length === 0) {
        return res.status(404).json({
          error: t('projects.notFound', undefined, { defaultValue: 'Project not found.' }),
        })
      }
    }

    res.json(await projectWithDerived(project))
  } catch (error) {
    logger.error('projects.get', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

// Enforce the per-tier project cap (tiers.ts maxProjects) — defined + shown on Pricing but enforceLimit
// was never called, so any tier could create unlimited projects.
const enforceProjectLimit = enforceLimit<MusicDawLimits>({
  limitType: 'maxProjects',
  getLimit: (limits) => limits.maxProjects,
  getCurrent: async (userId) =>
    count('music_projects', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceProjectLimit,
  validateBody(createProjectSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
        })
      }

      const body = req.body as z.infer<typeof createProjectSchema>
      const result = await create<ProjectRow>('music_projects', {
        user_id: userId,
        name: body.name,
        bpm: body.bpm ?? 120,
        time_signature: body.time_signature ?? '4/4',
        duration: body.duration ?? 0,
        is_public: body.is_public ?? false,
        is_pinned: body.is_pinned ?? false,
        cover_index: body.cover_index ?? 0,
        created_at: new Date(),
      })

      if (!result.data) {
        return res.status(500).json({
          error: t('errors.internalServer', undefined, {
            defaultValue: 'Something went wrong. Please try again.',
          }),
        })
      }
      res.status(201).json(await projectWithDerived(result.data))
    } catch (error) {
      logger.error('projects.create', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      })
    }
  },
)

router.put('/:id', validateBody(updateProjectSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('music_projects', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('projects.notFound', undefined, { defaultValue: 'Project not found.' }),
      })
    }

    const body = req.body as z.infer<typeof updateProjectSchema>
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (body.name !== undefined) updates.name = body.name
    if (body.bpm !== undefined) updates.bpm = body.bpm
    if (body.time_signature !== undefined) updates.time_signature = body.time_signature
    if (body.duration !== undefined) updates.duration = body.duration
    if (body.is_public !== undefined) updates.is_public = body.is_public
    if (body.is_pinned !== undefined) updates.is_pinned = body.is_pinned
    if (body.cover_index !== undefined) updates.cover_index = body.cover_index

    const result = await updateById<ProjectRow>('music_projects', id, updates)
    if (!result.data) {
      return res.status(500).json({
        error: t('errors.internalServer', undefined, {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      })
    }
    res.json(await projectWithDerived(result.data))
  } catch (error) {
    logger.error('projects.update', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('music_projects', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('projects.notFound', undefined, { defaultValue: 'Project not found.' }),
      })
    }

    await deleteById('music_projects', id)
    res.status(204).end()
  } catch (error) {
    logger.error('projects.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
