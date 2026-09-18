/**
 * Space handlers — owner-scoped CRUD over `spaces`.
 *
 * Each user creates one or more spaces; every other knowledge-base entity
 * (articles, attachments, ai_summaries, comments, etc.) hangs off a space
 * whose `created_by_user_id` is the owning user (with `space_members`
 * augmenting access). Space ownership is the root of every authz check.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { findOne } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import {
  internalError,
  requireSpaceAdminAccess,
  requireSpaceMembership,
  requireUser,
  type SpaceRow,
  validationError,
} from '../lib/authz.js'
import type { InternalKnowledgeBaseLimits } from '../tiers.js'

const router = Router()

const idParam = z.object({ id: z.string().min(1) })

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Resolve a space identifier — accepting either a UUID `id` or the
 * human-readable `key` slug. The frontend routes by slug for UX, but
 * authz / writes use the UUID; this helper bridges both.
 */
async function resolveSpaceId(idOrKey: string): Promise<string | null> {
  if (UUID_RE.test(idOrKey)) return idOrKey
  const space = await findOne<SpaceRow>('spaces', [{ field: 'key', operator: '=', value: idOrKey }])
  return space?.id ?? null
}

const createSchema = z.object({
  key: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  icon: z.string().max(64).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  icon: z.string().max(64).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  try {
    const items = await findMany<SpaceRow>('spaces', {
      where: [{ field: 'created_by_user_id', operator: '=', value: uid }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    internalError(res, error)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const resolved = await resolveSpaceId(id.data.id)
    if (!resolved) {
      res.status(404).json({ error: t('space.notFound', {}, { defaultValue: 'Space not found' }) })
      return
    }
    const space = await requireSpaceMembership(resolved, uid)
    if (!space) {
      res.status(404).json({ error: t('space.notFound', {}, { defaultValue: 'Space not found' }) })
      return
    }
    res.json(space)
  } catch (error) {
    internalError(res, error)
  }
})

// Enforce the per-tier space cap (tiers.ts maxSpaces) — defined + advertised in Pricing but
// enforceLimit was never called, so any tier could create unlimited spaces.
const enforceSpaceLimit = enforceLimit<InternalKnowledgeBaseLimits>({
  limitType: 'maxSpaces',
  getLimit: (limits) => limits.maxSpaces,
  getCurrent: async (userId) =>
    count('spaces', [{ field: 'created_by_user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceSpaceLimit, async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const result = await create<SpaceRow>('spaces', {
      created_by_user_id: uid,
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description ?? '',
      icon: parsed.data.icon ?? null,
      color: parsed.data.color ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const resolved = await resolveSpaceId(id.data.id)
    if (!resolved) {
      res.status(404).json({ error: t('space.notFound', {}, { defaultValue: 'Space not found' }) })
      return
    }
    const space = await requireSpaceAdminAccess(resolved, uid)
    if (!space) {
      res.status(404).json({ error: t('space.notFound', {}, { defaultValue: 'Space not found' }) })
      return
    }
    const result = await updateById<SpaceRow>('spaces', resolved, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const resolved = await resolveSpaceId(id.data.id)
    if (!resolved) {
      res.status(404).json({ error: t('space.notFound', {}, { defaultValue: 'Space not found' }) })
      return
    }
    const space = await requireSpaceAdminAccess(resolved, uid)
    if (!space) {
      res.status(404).json({ error: t('space.notFound', {}, { defaultValue: 'Space not found' }) })
      return
    }
    await deleteById('spaces', resolved)
    res.status(204).end()
  } catch (error) {
    internalError(res, error)
  }
})

export default router
