import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const paramId = (req: Request): string => {
  const id = req.params.id
  return Array.isArray(id) ? id[0] : id
}

const ROLE = z.enum(['owner', 'admin', 'editor', 'viewer'])

const createTeamMemberSchema = z.object({
  email: z.string().email(),
  role: ROLE.default('viewer'),
  sso_group: z.string().nullable().optional(),
  vaults: z.array(z.string().uuid()).default([]),
})

const updateTeamMemberSchema = z.object({
  role: ROLE.optional(),
  sso_group: z.string().nullable().optional(),
  vaults: z.array(z.string().uuid()).optional(),
  status: z.enum(['invited', 'active', 'suspended']).optional(),
})

router.get('/team-members', async (_req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const rows = await findMany<Record<string, unknown>>('team_members', {
      where: [{ field: 'user_id', operator: '=', value: uid }],
      orderBy: [{ field: 'email', direction: 'asc' }],
    })
    res.json(rows)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/team-members/:id', async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = paramId(req)
    const row = await findById<Record<string, unknown>>('team_members', id)
    if (!row || row.user_id !== uid) {
      return res
        .status(404)
        .json({ error: t('team.notFound', undefined, { defaultValue: 'Team member not found' }) })
    }
    res.json(row)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/team-members',
  validateBody(createTeamMemberSchema),
  async (req: Request, res: Response) => {
    try {
      const uid = getUserId(res)
      if (!uid)
        return res
          .status(401)
          .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

      const body = req.body as z.infer<typeof createTeamMemberSchema>
      const result = await create<Record<string, unknown>>('team_members', {
        user_id: uid,
        email: body.email,
        role: body.role,
        sso_group: body.sso_group ?? null,
        vaults: JSON.stringify(body.vaults),
        status: 'invited',
      })
      res.status(201).json(result.data ?? {})
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put(
  '/team-members/:id',
  validateBody(updateTeamMemberSchema),
  async (req: Request, res: Response) => {
    try {
      const uid = getUserId(res)
      if (!uid)
        return res
          .status(401)
          .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

      const id = paramId(req)
      const existing = await findById<Record<string, unknown>>('team_members', id)
      if (!existing || existing.user_id !== uid) {
        return res
          .status(404)
          .json({ error: t('team.notFound', undefined, { defaultValue: 'Team member not found' }) })
      }

      const body = req.body as z.infer<typeof updateTeamMemberSchema>
      const updates: Record<string, unknown> = {}
      if (body.role !== undefined) updates.role = body.role
      if (body.sso_group !== undefined) updates.sso_group = body.sso_group
      if (body.vaults !== undefined) updates.vaults = JSON.stringify(body.vaults)
      if (body.status !== undefined) updates.status = body.status

      const result = await updateById<Record<string, unknown>>('team_members', id, updates)
      res.json(result.data ?? {})
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/team-members/:id', async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = paramId(req)
    const existing = await findById<Record<string, unknown>>('team_members', id)
    if (!existing || existing.user_id !== uid) {
      return res
        .status(404)
        .json({ error: t('team.notFound', undefined, { defaultValue: 'Team member not found' }) })
    }
    await deleteById('team_members', id)
    res.status(204).end()
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
