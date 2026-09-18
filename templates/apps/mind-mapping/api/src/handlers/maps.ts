/**
 * Map handlers — owner-scoped CRUD + share/restore/trash for `maps`.
 *
 * Listing returns the user's maps + maps shared with them via
 * `map_collaborators` (accepted only). Reads honour `is_public` so the
 * anonymous public-link UX works without authentication. Writes always
 * require ownership OR an editor-role collaborator.
 */

import { randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  create,
  deleteById,
  findMany,
  findOne,
  query,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  findMap,
  internalError,
  type MapCollaboratorRow,
  type MapRow,
  requireOwnedMap,
  requireReadableMap,
  requireUser,
  requireWritableMap,
  validationError,
} from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

// Public-share slug — a bearer secret: it's the ONLY thing gating an anonymous
// reader's access to an otherwise-PRIVATE map (the share UX needs no signup, and
// GET /maps/public/:slug resolves it without auth). Math.random is a
// non-cryptographic PRNG (V8 xorshift128+) whose internal state is recoverable
// from a few of its own outputs, making slugs predictable/enumerable — so a
// CSPRNG is required to keep the link un-brute-forceable. [L2-1]
export function generatePublicSlug(): string {
  return randomBytes(16).toString('base64url')
}

const listSchema = z.object({
  include_trashed: z.string().optional(),
  scope: z.enum(['mine', 'shared', 'all']).optional(),
})

const createSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(4000).optional(),
  theme: z.string().max(64).optional(),
  is_template: z.boolean().optional(),
})

const updateSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(4000).optional(),
  theme: z.string().max(64).optional(),
  root_node_id: z.string().uuid().nullable().optional(),
  is_template: z.boolean().optional(),
  is_public: z.boolean().optional(),
  public_slug: z.string().min(1).max(64).nullable().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = listSchema.safeParse(req.query)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const scope = parsed.data.scope ?? 'all'
    const includeTrashed = parsed.data.include_trashed === 'true'

    const owned: MapRow[] =
      scope === 'shared'
        ? []
        : await findMany<MapRow>('maps', {
            where: buildOwnerWhere(ownerId, includeTrashed),
            orderBy: [{ field: 'updated_at', direction: 'desc' }],
            limit: 200,
          })

    let shared: MapRow[] = []
    if (scope !== 'mine') {
      const memberships = await findMany<MapCollaboratorRow>('map_collaborators', {
        where: [
          { field: 'user_id', operator: '=', value: ownerId },
          { field: 'accepted_at', operator: 'is_not_null' },
        ],
      })
      const ids = memberships.map((m) => m.map_id).filter((id) => !!id)
      if (ids.length > 0) {
        shared = await findMany<MapRow>('maps', {
          where: includeTrashed
            ? [{ field: 'id', operator: 'in', value: ids }]
            : [
                { field: 'id', operator: 'in', value: ids },
                { field: 'trashed_at', operator: 'is_null' },
              ],
          orderBy: [{ field: 'updated_at', direction: 'desc' }],
          limit: 200,
        })
      }
    }

    // Dedup (rare: owner could also be a collaborator on their own map).
    const seen = new Set<string>()
    const merged: MapRow[] = []
    for (const m of [...owned, ...shared]) {
      if (!seen.has(m.id)) {
        seen.add(m.id)
        merged.push(m)
      }
    }
    // Augment each row with node_count + an `is_shared` flag so the
    // frontend tile can render the badge and the filter can distinguish
    // owned from collaborator-shared maps.
    const counts = await nodeCountsByMap(merged.map((m) => m.id))
    const sharedIds = new Set(shared.map((m) => m.id))
    const enriched = merged.map((m) => ({
      ...m,
      node_count: counts.get(m.id) ?? 0,
      is_shared: sharedIds.has(m.id) && m.owner_id !== ownerId,
    }))
    res.json(enriched)
  } catch (error) {
    logger.error('maps.list', error)
    internalError(res)
  }
})

/**
 * Aggregate node counts in a single round-trip rather than per-map; mirrors
 * the pattern used by the reporting bond's findManyWithCounts helper but
 * inlined here because we don't want a hard dependency on that bond.
 */
async function nodeCountsByMap(mapIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (mapIds.length === 0) return out
  const result = await query<{ map_id: string; node_count: string }>(
    `select map_id, count(*)::text as node_count from nodes where map_id = any($1::uuid[]) group by map_id`,
    [mapIds],
  )
  for (const row of result.rows) {
    out.set(row.map_id, parseInt(row.node_count, 10) || 0)
  }
  return out
}

router.get('/public/:slug', async (req: Request, res: Response) => {
  // Anonymous public-link path. NO `requireUser` — explicit by design.
  const slugSchema = z.object({ slug: z.string().min(1).max(64) })
  const parsed = slugSchema.safeParse(req.params)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const map = await findOne<MapRow>('maps', [
      { field: 'public_slug', operator: '=', value: parsed.data.slug },
      { field: 'is_public', operator: '=', value: true },
      { field: 'trashed_at', operator: 'is_null' },
    ])
    if (!map) {
      res.status(404).json({ error: t('map.notFound', {}, { defaultValue: 'Map not found' }) })
      return
    }
    // Hydrate the same shape as authenticated GET /maps/:id so the public
    // viewer can render the canvas without a second request — the share
    // link is supposed to show the map, not just the metadata.
    const nodes = await findMany('nodes', {
      where: [{ field: 'map_id', operator: '=', value: map.id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    const connections = await findMany('connections', {
      where: [{ field: 'map_id', operator: '=', value: map.id }],
    })
    res.json({ ...map, nodes, connections })
  } catch (error) {
    logger.error('maps.publicGet', error)
    internalError(res)
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
    const map = await requireReadableMap(id.data.id, ownerId)
    if (!map) {
      res.status(404).json({ error: t('map.notFound', {}, { defaultValue: 'Map not found' }) })
      return
    }
    const nodes = await findMany('nodes', {
      where: [{ field: 'map_id', operator: '=', value: map.id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    const connections = await findMany('connections', {
      where: [{ field: 'map_id', operator: '=', value: map.id }],
    })
    res.json({ ...map, nodes, connections })
  } catch (error) {
    logger.error('maps.get', error)
    internalError(res)
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const result = await create<MapRow>('maps', {
      owner_id: ownerId,
      title: parsed.data.title ?? t('map.untitled', {}, { defaultValue: 'Untitled mind map' }),
      description: parsed.data.description ?? '',
      theme: parsed.data.theme ?? 'default',
      root_node_id: null,
      is_template: parsed.data.is_template ?? false,
      is_public: false,
      public_slug: null,
      trashed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('maps.create', error)
    internalError(res)
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
    const map = await requireWritableMap(id.data.id, ownerId)
    if (!map) {
      res.status(404).json({ error: t('map.notFound', {}, { defaultValue: 'Map not found' }) })
      return
    }
    // Only the owner may flip is_public / set a public_slug; collaborators
    // can edit content but not change the map's visibility.
    const patch: Record<string, unknown> = { ...body.data, updated_at: new Date() }
    if (
      (body.data.is_public !== undefined || body.data.public_slug !== undefined) &&
      map.owner_id !== ownerId
    ) {
      delete patch.is_public
      delete patch.public_slug
    }
    // Auto-mint a `public_slug` when the owner flips `is_public` to true and
    // hasn't set one explicitly. Without this, GET /maps/public/:slug can never
    // resolve the freshly-public map (the slug column stays null), which makes
    // the share link the editor surfaces a 404 — the entire public-share flow
    // looks like it works (PATCH 200) but the artefact never appears.
    if (
      patch.is_public === true &&
      (patch.public_slug === undefined || patch.public_slug === null) &&
      !map.public_slug
    ) {
      patch.public_slug = generatePublicSlug()
    }
    if (patch.is_public === false && patch.public_slug === undefined) {
      patch.public_slug = null
    }
    const result = await updateById<MapRow>('maps', id.data.id, patch)
    res.json(result.data)
  } catch (error) {
    logger.error('maps.patch', error)
    internalError(res)
  }
})

router.post('/:id/trash', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    // Only the owner can trash a map (collaborators cannot delete).
    const map = await requireOwnedMap(id.data.id, ownerId)
    if (!map) {
      res.status(404).json({ error: t('map.notFound', {}, { defaultValue: 'Map not found' }) })
      return
    }
    const result = await updateById<MapRow>('maps', id.data.id, {
      trashed_at: new Date(),
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('maps.trash', error)
    internalError(res)
  }
})

router.post('/:id/restore', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    // findMap (not requireReadableMap) — restoring out of trash should still
    // be allowed when the trashed_at flag would otherwise hide the map.
    const map = await findMap(id.data.id)
    if (!map || map.owner_id !== ownerId) {
      res.status(404).json({ error: t('map.notFound', {}, { defaultValue: 'Map not found' }) })
      return
    }
    const result = await updateById<MapRow>('maps', id.data.id, {
      trashed_at: null,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('maps.restore', error)
    internalError(res)
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
    const map = await findMap(id.data.id)
    if (!map || map.owner_id !== ownerId) {
      res.status(404).json({ error: t('map.notFound', {}, { defaultValue: 'Map not found' }) })
      return
    }
    // CASCADE on nodes/connections/versions/collaborators handles cleanup.
    await deleteById('maps', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('maps.delete', error)
    internalError(res)
  }
})

function buildOwnerWhere(ownerId: string, includeTrashed: boolean): WhereCondition[] {
  const w: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: ownerId }]
  if (!includeTrashed) w.push({ field: 'trashed_at', operator: 'is_null' })
  return w
}

export default router
