/**
 * Subs (subreddits / topical communities) — public read, authenticated
 * create. Owner-only update/delete (IDOR scope marker `requireOwner` +
 * `user_id`). Self-managed memberships.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const slugRegex = /^[a-z0-9](?:[a-z0-9_-]{0,38})$/i

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sort: z.enum(['popular', 'new']).default('popular'),
  // Free-text filter used by the Search page (`/api/subs?search=q`).
  search: z.string().optional(),
})

const createSubSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().regex(slugRegex, 'invalid slug'),
  description: z.string().max(2_000).optional(),
})

const updateSubSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(2_000).optional(),
})

const slugParamSchema = z.object({ slug: z.string().min(1) })

function getSession(res: Response): { userId?: string } | undefined {
  return res.locals.session as { userId?: string } | undefined
}

function requireSession(res: Response): string | null {
  const userId = getSession(res)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
    })
    return null
  }
  return userId
}

function requireOwner<T extends Record<string, unknown>>(
  res: Response,
  resource: T | null,
  ownerField: keyof T = 'owner_id' as keyof T,
): string | null {
  if (!resource) {
    res.status(404).json({
      error: t('subs.notFound', {}, { defaultValue: 'Sub not found' }),
    })
    return null
  }
  const userId = requireSession(res)
  if (!userId) return null
  const owner = String(resource[ownerField] ?? '')
  if (owner !== userId) {
    res.status(403).json({
      error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }),
    })
    return null
  }
  return userId
}

/**
 * Decorate sub records with `joined` for the session user. Cheap (1 query
 * regardless of result-set size).
 */
async function hydrateJoined(
  subs: Array<Record<string, unknown>>,
  sessionUserId: string | undefined,
): Promise<Array<Record<string, unknown>>> {
  if (!sessionUserId || subs.length === 0) {
    return subs.map((s) => ({ ...s, joined: Boolean(s.joined) }))
  }
  const ids = subs.map((s) => String(s.id ?? '')).filter(Boolean)
  if (ids.length === 0) return subs
  const memberships = await findMany<Record<string, unknown>>('sub_memberships', {
    where: [
      { field: 'sub_id', operator: 'in', value: ids },
      { field: 'user_id', operator: '=', value: sessionUserId },
    ],
  })
  const joined = new Set(memberships.map((m) => String(m.sub_id ?? '')))
  return subs.map((s) => ({ ...s, joined: joined.has(String(s.id ?? '')) }))
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const sessionUserId = getSession(res)?.userId
    const { page, limit, sort, search } = req.query as unknown as z.infer<typeof listQuerySchema>
    const orderBy: Array<{ field: string; direction: 'asc' | 'desc' }> =
      sort === 'new'
        ? [{ field: 'created_at', direction: 'desc' }]
        : [{ field: 'member_count', direction: 'desc' }]
    let subs = await findMany<Record<string, unknown>>('subs', {
      // Substring search needs a post-filter (the structured `where`
      // builder has no `ilike`), so fetch unpaged and page after filtering.
      limit: search ? undefined : limit,
      offset: search ? undefined : (page - 1) * limit,
      orderBy,
    })
    if (search) {
      const q = String(search).toLowerCase()
      subs = subs
        .filter((s) =>
          [s.name, s.slug, s.description].some(
            (field) => typeof field === 'string' && field.toLowerCase().includes(q),
          ),
        )
        .slice((page - 1) * limit, (page - 1) * limit + limit)
    }
    const data = await hydrateJoined(subs, sessionUserId)
    res.json({ data, page, limit })
  } catch (error) {
    logger.error('subs.list', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:slug', validateParams(slugParamSchema), async (req: Request, res: Response) => {
  try {
    const sessionUserId = getSession(res)?.userId
    const slug = String(req.params.slug)
    const found = await findMany<Record<string, unknown>>('subs', {
      where: [{ field: 'slug', operator: '=', value: slug }],
      limit: 1,
    })
    const sub = found[0]
    if (!sub) {
      res.status(404).json({
        error: t('subs.notFound', {}, { defaultValue: 'Sub not found' }),
      })
      return
    }
    const [hydrated] = await hydrateJoined([sub], sessionUserId)
    res.json({ data: hydrated })
  } catch (error) {
    logger.error('subs.getBySlug', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSubSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireSession(res)
    if (!userId) return
    const { name, slug, description } = req.body as z.infer<typeof createSubSchema>

    const dupes = await findMany<Record<string, unknown>>('subs', {
      where: [{ field: 'slug', operator: '=', value: slug }],
      limit: 1,
    })
    if (dupes[0]) {
      res.status(409).json({
        error: t('subs.duplicate', {}, { defaultValue: 'A sub with this slug already exists.' }),
      })
      return
    }

    const created = await create<Record<string, unknown>>('subs', {
      name,
      slug,
      description: description ?? null,
      owner_id: userId,
      member_count: 1,
      created_at: new Date().toISOString(),
    })
    const sub = created.data
    if (!sub) {
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
      return
    }

    // Owner is automatically a member.
    await create('sub_memberships', {
      sub_id: sub.id,
      user_id: userId,
      joined_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })

    res.status(201).json(sub)
  } catch (error) {
    logger.error('subs.create', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateSubSchema), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const existing = await findById('subs', id)
    const userId = requireOwner(res, existing as Record<string, unknown> | null)
    if (!userId) return
    const updates = { ...req.body, updated_at: new Date().toISOString() }
    const result = await updateById('subs', id, updates)
    res.json(result.data ?? null)
  } catch (error) {
    logger.error('subs.update', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const existing = await findById('subs', id)
    const userId = requireOwner(res, existing as Record<string, unknown> | null)
    if (!userId) return
    await deleteById('subs', id)
    res.status(204).end()
  } catch (error) {
    logger.error('subs.delete', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

/**
 * Resolve `:id` from the URL — accepts either a UUID (id) or a slug. The
 * UI calls join/leave with the slug it already knows, so going slug-first
 * keeps the user-visible URL stable across renames.
 */
async function resolveSub(idOrSlug: string): Promise<Record<string, unknown> | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug)
  if (isUuid) {
    const sub = await findById('subs', idOrSlug)
    if (sub) return sub as Record<string, unknown>
  }
  const matches = await findMany<Record<string, unknown>>('subs', {
    where: [{ field: 'slug', operator: '=', value: idOrSlug }],
    limit: 1,
  })
  return matches[0] ?? null
}

router.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const userId = requireSession(res)
    if (!userId) return
    const sub = await resolveSub(String(req.params.id))
    if (!sub) {
      res.status(404).json({
        error: t('subs.notFound', {}, { defaultValue: 'Sub not found' }),
      })
      return
    }
    const id = String(sub.id)
    const existing = await findMany<Record<string, unknown>>('sub_memberships', {
      where: [
        { field: 'sub_id', operator: '=', value: id },
        { field: 'user_id', operator: '=', value: userId },
      ],
      limit: 1,
    })
    if (existing[0]) {
      res.json({ joined: true, member_count: sub.member_count ?? 0 })
      return
    }
    await create('sub_memberships', {
      sub_id: id,
      user_id: userId,
      joined_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
    const newCount = ((sub.member_count as number | undefined) ?? 0) + 1
    await updateById('subs', id, { member_count: newCount })
    res.json({ joined: true, member_count: newCount })
  } catch (error) {
    logger.error('subs.join', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/leave', async (req: Request, res: Response) => {
  try {
    const userId = requireSession(res)
    if (!userId) return
    const sub = await resolveSub(String(req.params.id))
    if (!sub) {
      res.status(404).json({
        error: t('subs.notFound', {}, { defaultValue: 'Sub not found' }),
      })
      return
    }
    const id = String(sub.id)
    const existing = await findMany<Record<string, unknown>>('sub_memberships', {
      where: [
        { field: 'sub_id', operator: '=', value: id },
        { field: 'user_id', operator: '=', value: userId },
      ],
      limit: 1,
    })
    if (!existing[0]) {
      res.json({ joined: false, member_count: sub.member_count ?? 0 })
      return
    }
    await deleteById('sub_memberships', String(existing[0].id ?? ''))
    const newCount = Math.max(0, ((sub.member_count as number | undefined) ?? 0) - 1)
    await updateById('subs', id, { member_count: newCount })
    res.json({ joined: false, member_count: newCount })
  } catch (error) {
    logger.error('subs.leave', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
