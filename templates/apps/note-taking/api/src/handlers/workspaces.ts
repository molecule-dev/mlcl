/**
 * Workspace handlers — owner-scoped CRUD over `workspaces`.
 *
 * Each user owns one or more workspaces and every other note-taking entity
 * (pages / blocks / databases / templates) hangs off a workspace, so
 * workspace ownership is the root of every authorization check.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import {
  internalError,
  requireUser,
  requireWorkspace,
  validationError,
  type WorkspaceRow,
} from '../lib/authz.js'
import type { NoteTakingLimits } from '../tiers.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const createSchema = z.object({
  name: z.string().min(1).max(255),
  icon: z.string().max(64).nullable().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  icon: z.string().max(64).nullable().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const items = await findMany<WorkspaceRow>('workspaces', {
      where: [{ field: 'owner_id', operator: '=', value: ownerId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    internalError(res, error)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const ws = await requireWorkspace(id.data.id, ownerId)
    if (!ws) {
      res
        .status(404)
        .json({ error: t('workspace.notFound', {}, { defaultValue: 'Workspace not found' }) })
      return
    }
    res.json(ws)
  } catch (error) {
    internalError(res, error)
  }
})

// Enforce the per-tier workspace cap (tiers.ts maxWorkspaces) — defined + shown on Pricing but
// enforceLimit was never called anywhere, so any tier could create unlimited workspaces.
const enforceWorkspaceLimit = enforceLimit<NoteTakingLimits>({
  limitType: 'maxWorkspaces',
  getLimit: (limits) => limits.maxWorkspaces,
  getCurrent: async (userId) =>
    count('workspaces', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceWorkspaceLimit, async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const result = await create<WorkspaceRow>('workspaces', {
      name: parsed.data.name,
      icon: parsed.data.icon ?? null,
      owner_id: ownerId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const ws = await requireWorkspace(id.data.id, ownerId)
    if (!ws) {
      res
        .status(404)
        .json({ error: t('workspace.notFound', {}, { defaultValue: 'Workspace not found' }) })
      return
    }
    const result = await updateById<WorkspaceRow>('workspaces', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const ws = await requireWorkspace(id.data.id, ownerId)
    if (!ws) {
      res
        .status(404)
        .json({ error: t('workspace.notFound', {}, { defaultValue: 'Workspace not found' }) })
      return
    }
    await deleteById('workspaces', id.data.id)
    res.status(204).end()
  } catch (error) {
    internalError(res, error)
  }
})

export default router
