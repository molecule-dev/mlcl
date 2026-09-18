/**
 * Workspaces handler — workspace creation + read for video-conferencing.
 *
 * Owner becomes a member with the `owner` role automatically. Workspace
 * access is gated by membership in `requireWorkspaceMember`.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { requireWorkspaceAdmin, requireWorkspaceMember } from '../lib/authz.js'

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'workspace'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(60).optional(),
  seat_limit: z.number().int().min(1).max(1_000).optional().default(5),
})

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  seat_limit: z.number().int().min(1).max(1_000).optional(),
})

const router = Router()

router.use(requireAuth)

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const memberships = await findMany<{ workspace_id: string }>('workspace_members', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const ids = memberships.map((m) => m.workspace_id).filter(Boolean)
    if (ids.length === 0) {
      res.json([])
      return
    }
    const workspaces = await findMany('workspaces', {
      where: [{ field: 'id', operator: 'in', value: ids }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
      limit: 50,
    })
    res.json(workspaces)
  } catch (error) {
    logger.error('workspaces.list', error)
    res.status(500).json({
      error: t('workspaces.listError', undefined, { defaultValue: 'Failed to list workspaces' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireWorkspaceMember(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('workspaces.notFound', undefined, { defaultValue: 'Workspace not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (error) {
    logger.error('workspaces.read', error)
    res.status(500).json({
      error: t('workspaces.readError', undefined, { defaultValue: 'Failed to read workspace' }),
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
    const slug = parsed.data.slug ?? `${slugify(parsed.data.name)}-${Date.now().toString(36)}`
    const result = await create('workspaces', {
      owner_id: userId,
      name: parsed.data.name,
      slug,
      plan_key: 'free',
      seat_limit: parsed.data.seat_limit ?? 5,
      created_at: new Date().toISOString(),
    })
    const ws = result.data as { id?: string } | undefined
    if (!ws?.id) {
      res.status(500).json({
        error: t('workspaces.createError', undefined, {
          defaultValue: 'Failed to create workspace',
        }),
      })
      return
    }
    // Owner is also a member so subsequent membership checks see them.
    try {
      await create('workspace_members', {
        workspace_id: ws.id,
        user_id: userId,
        role: 'owner',
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
    } catch (_error) {
      // unique-membership conflict is non-fatal — owner already a member
    }
    res.status(201).json(ws)
  } catch (error) {
    logger.error('workspaces.create', error)
    res.status(500).json({
      error: t('workspaces.createError', undefined, { defaultValue: 'Failed to create workspace' }),
    })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
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
    const check = await requireWorkspaceAdmin(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('workspaces.notFound', undefined, { defaultValue: 'Workspace not found' }),
      })
      return
    }
    const result = await updateById('workspaces', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('workspaces.update', error)
    res.status(500).json({
      error: t('workspaces.updateError', undefined, { defaultValue: 'Failed to update workspace' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireWorkspaceAdmin(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('workspaces.notFound', undefined, { defaultValue: 'Workspace not found' }),
      })
      return
    }
    await deleteById('workspaces', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('workspaces.delete', error)
    res.status(500).json({
      error: t('workspaces.deleteError', undefined, { defaultValue: 'Failed to delete workspace' }),
    })
  }
})

export default router
