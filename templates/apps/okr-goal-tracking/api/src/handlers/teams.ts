/**
 * Team handlers — owner-scoped CRUD for the team-tree visible on /team.
 *
 * Roll-up read is naive in v1: it sums KR progress across every objective
 * the caller owns whose team_id matches the requested team.
 *
 * Uses the abstract DataStore from @molecule/api-database (no raw SQL).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser, validationError } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findMany,
  findOne,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const teamCreateSchema = z.object({
  name: z.string().min(1).max(255),
  parent_id: z.string().uuid().nullable().optional(),
  lead_user_id: z.string().uuid().nullable().optional(),
})

const teamUpdateSchema = teamCreateSchema.partial()

const idParam = z.object({ id: z.string().uuid() })

interface TeamRow {
  id: string
  owner_id: string
  name: string
  parent_id: string | null
  lead_user_id: string | null
  created_at: string
  updated_at: string
}

interface KeyResultRow {
  id: string
  objective_id: string
  progress: number
}

interface ObjectiveRow {
  id: string
  team_id: string | null
  progress: number
}

router.get('/', async (_req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  try {
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: owner }]
    const items = await findMany<TeamRow>('teams', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('teams.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const item = await findOne<TeamRow>('teams', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!item) {
      res.status(404).json({ error: t('team.notFound', {}, { defaultValue: 'Team not found' }) })
      return
    }
    res.json(item)
  } catch (error) {
    logger.error('teams.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id/rollup', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const team = await findOne<TeamRow>('teams', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!team) {
      res.status(404).json({ error: t('team.notFound', {}, { defaultValue: 'Team not found' }) })
      return
    }
    const objectives = await findMany<ObjectiveRow>('objectives', {
      where: [
        { field: 'owner_id', operator: '=', value: owner },
        { field: 'team_id', operator: '=', value: id.data.id },
      ],
    })
    const objectiveIds = objectives.map((o) => o.id)
    let krAvg = 0
    if (objectiveIds.length > 0) {
      const krs = await findMany<KeyResultRow>('key_results', {
        where: [
          { field: 'owner_id', operator: '=', value: owner },
          { field: 'objective_id', operator: 'in', value: objectiveIds },
        ],
      })
      if (krs.length > 0) {
        krAvg = Math.round(krs.reduce((sum, k) => sum + Number(k.progress), 0) / krs.length)
      }
    }
    res.json({
      teamId: id.data.id,
      objectives: objectives.length,
      averageKeyResultProgress: krAvg,
    })
  } catch (error) {
    logger.error('teams.rollup', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const parsed = teamCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const result = await create<TeamRow>('teams', {
      owner_id: owner,
      name: parsed.data.name,
      parent_id: parsed.data.parent_id ?? null,
      lead_user_id: parsed.data.lead_user_id ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('teams.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const id = idParam.safeParse(req.params)
  const body = teamUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, !id.success ? id.error.issues : body.success ? [] : body.error.issues)
    return
  }
  try {
    const existing = await findOne<TeamRow>('teams', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!existing) {
      res.status(404).json({ error: t('team.notFound', {}, { defaultValue: 'Team not found' }) })
      return
    }
    const result = await updateById<TeamRow>('teams', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('teams.update', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const existing = await findOne<TeamRow>('teams', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!existing) {
      res.status(404).json({ error: t('team.notFound', {}, { defaultValue: 'Team not found' }) })
      return
    }
    await deleteById('teams', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('teams.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
