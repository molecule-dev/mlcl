import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import {
  hasProvider as hasSummarizer,
  requireProvider as getSummarizer,
} from '@molecule/api-ai-summarization'
import { getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import {
  hasProvider as hasSearch,
  index as indexDoc,
  search as searchDocs,
} from '@molecule/api-search'

import type { WikiLimits } from '../tiers.js'

const router = Router()

const getParam = (req: Request, key: string): string => {
  const v = req.params[key]
  return Array.isArray(v) ? String(v[0]) : String(v ?? '')
}

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

interface SpaceRow {
  owner_id: string
  is_public?: boolean
  visibility?: string
}

interface PageRow {
  id: string
  space_id: string
  parent_id: string | null
  title: string
  slug: string
  content: string
  summary: string | null
  is_template: boolean
  position: number | null
  trashed_at: string | null
  tags: unknown
  author_id: string | null
  last_editor_id: string | null
  version: number
  sort_order: number
  created_at: string
  updated_at: string
}

const ensureSpaceAccess = async (
  spaceId: string,
  userId: string,
  options: { write?: boolean } = {},
): Promise<{ ok: true; space: SpaceRow } | { ok: false; status: number; message: string }> => {
  const space = await findById<SpaceRow>('wiki_spaces', spaceId)
  if (!space) {
    return {
      ok: false,
      status: 404,
      message: t('pages.notFound', {}, { defaultValue: 'Page not found' }),
    }
  }
  if (space.owner_id === userId) return { ok: true, space }

  const member = await findOne<{ role?: string }>('wiki_space_members', [
    { field: 'space_id', operator: '=', value: spaceId },
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (member) {
    if (options.write && member.role === 'viewer') {
      return {
        ok: false,
        status: 403,
        message: t('pages.forbidden', {}, { defaultValue: 'Forbidden' }),
      }
    }
    return { ok: true, space }
  }

  if (!options.write && (space.is_public === true || space.visibility === 'public')) {
    return { ok: true, space }
  }
  return {
    ok: false,
    status: 404,
    message: t('pages.notFound', {}, { defaultValue: 'Page not found' }),
  }
}

/**
 * Returns the set of space ids the caller is allowed to read: spaces they own,
 * spaces they are a member of, and public spaces (`is_public` true or
 * `visibility = 'public'`). Used to scope cross-space search so an
 * authenticated user can never read another tenant's private pages when no
 * `space_id` is supplied. Mirrors the read access granted by
 * `ensureSpaceAccess`.
 */
const getAccessibleSpaceIds = async (userId: string): Promise<string[]> => {
  const ids = new Set<string>()
  const owned = await findMany<{ id: string }>('wiki_spaces', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
  })
  for (const s of owned) ids.add(s.id)
  const memberships = await findMany<{ space_id: string }>('wiki_space_members', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  })
  for (const m of memberships) ids.add(m.space_id)
  const publicByFlag = await findMany<{ id: string }>('wiki_spaces', {
    where: [{ field: 'is_public', operator: '=', value: true }],
  })
  for (const s of publicByFlag) ids.add(s.id)
  const publicByVisibility = await findMany<{ id: string }>('wiki_spaces', {
    where: [{ field: 'visibility', operator: '=', value: 'public' }],
  })
  for (const s of publicByVisibility) ids.add(s.id)
  return [...ids]
}

const listQuerySchema = z.object({
  space_id: z.string().optional(),
  parent_id: z.string().optional(),
  trashed: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  sort: z.enum(['updated_at', 'created_at', 'title', 'sort_order']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const { space_id, parent_id, trashed, limit, sort, order } = req.query as {
      space_id?: string
      parent_id?: string
      trashed?: 'true' | 'false'
      limit?: string
      sort?: 'updated_at' | 'created_at' | 'title' | 'sort_order'
      order?: 'asc' | 'desc'
    }

    if (space_id) {
      const access = await ensureSpaceAccess(space_id, userId)
      if (!access.ok) return res.status(access.status).json({ error: access.message })
    }

    type Cond = { field: string; operator: '=' | 'is_null' | 'is_not_null'; value: unknown }
    const where: Cond[] = []
    if (space_id) where.push({ field: 'space_id', operator: '=', value: space_id })
    if (parent_id) where.push({ field: 'parent_id', operator: '=', value: parent_id })
    if (!space_id) where.push({ field: 'author_id', operator: '=', value: userId })
    if (trashed === 'true') {
      where.push({ field: 'trashed_at', operator: 'is_not_null', value: null })
    } else {
      where.push({ field: 'trashed_at', operator: 'is_null', value: null })
    }

    const sortField = sort ?? 'sort_order'
    const direction = (order ?? (sort && sort !== 'sort_order' ? 'desc' : 'asc')) as 'asc' | 'desc'

    const pages = await findMany('wiki_pages', {
      where,
      orderBy: [{ field: sortField, direction }],
      limit: limit ? Number(limit) : undefined,
    })
    res.json(pages)
  } catch (err) {
    console.error('[pages.list]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

const searchQuerySchema = z.object({
  q: z.string().min(1),
  space_id: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const q = String(req.query.q ?? '')
    const spaceId = req.query.space_id ? String(req.query.space_id) : undefined
    const page = Number(req.query.page ?? 1)
    const limit = Number(req.query.limit ?? 20)

    if (spaceId) {
      const access = await ensureSpaceAccess(spaceId, userId)
      if (!access.ok) return res.status(access.status).json({ error: access.message })
    }

    // When no space_id is supplied, scope the search to the spaces the caller
    // may actually read. Without this, both the Meilisearch and the Postgres
    // branches returned EVERY tenant's pages — a cross-tenant read. When a
    // space_id IS supplied, the ensureSpaceAccess check above already guards it.
    const accessibleSpaceIds = spaceId ? null : await getAccessibleSpaceIds(userId)
    if (accessibleSpaceIds && accessibleSpaceIds.length === 0) {
      // The caller can read no spaces → there is nothing to search. Fail closed.
      res.json({ hits: [], total: 0, page, perPage: limit, processingTimeMs: 0 })
      return
    }

    if (hasSearch()) {
      try {
        const results = await searchDocs('wiki_pages', {
          text: q,
          page,
          perPage: limit,
          filters: spaceId ? { space_id: spaceId } : undefined,
        })
        if (accessibleSpaceIds) {
          // The search bond's filter syntax only expresses single-value
          // equality, so an IN(<accessibleSpaceIds>) filter cannot be pushed
          // down for the multi-space case. Scope the returned hits to the
          // caller's accessible spaces in-handler so no other tenant's pages
          // leak through.
          const allowed = new Set(accessibleSpaceIds)
          const hits = (results.hits ?? []).filter((hit) =>
            allowed.has(String((hit.document as { space_id?: unknown }).space_id ?? '')),
          )
          res.json({ ...results, hits, total: hits.length })
          return
        }
        res.json(results)
        return
      } catch (_error) {
        // Search provider (Meilisearch) is bonded but unreachable / misconfigured.
        // Fall through to the Postgres ILIKE fallback so search remains usable.
      }
    }

    // Postgres fallback when no Meilisearch is configured (or bond errored). The
    // `ilike` operator in @molecule/api-database/postgresql wraps the value with
    // `%…%` itself (and escapes `%`/`_`), so we pass the bare query string here.
    const where: { field: string; operator: '=' | 'ilike' | 'in'; value: unknown }[] = [
      { field: 'title', operator: 'ilike', value: q },
    ]
    if (spaceId) {
      where.push({ field: 'space_id', operator: '=', value: spaceId })
    } else if (accessibleSpaceIds) {
      // Guaranteed non-empty here (the empty case fails closed above).
      where.push({ field: 'space_id', operator: 'in', value: accessibleSpaceIds })
    }
    const rows = await findMany('wiki_pages', {
      where,
      limit,
      offset: (page - 1) * limit,
    })
    res.json({ hits: rows, total: rows.length, page, perPage: limit, processingTimeMs: 0 })
  } catch (err) {
    console.error('[pages.get /search]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/by-slug/:slug', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const spaceId = typeof req.query.spaceId === 'string' ? req.query.spaceId : undefined
    const slug = getParam(req, 'slug')
    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'slug', operator: '=', value: slug },
    ]
    if (spaceId) where.push({ field: 'space_id', operator: '=', value: spaceId })

    const page = await findOne<PageRow>('wiki_pages', where)
    if (!page) {
      return res
        .status(404)
        .json({ error: t('pages.notFound', {}, { defaultValue: 'Page not found' }) })
    }
    const access = await ensureSpaceAccess(page.space_id, userId)
    if (!access.ok) return res.status(access.status).json({ error: access.message })
    res.json(page)
  } catch (err) {
    console.error('[pages.get /by-slug/:slug]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParam(req, 'id')
    const page = await findById<PageRow>('wiki_pages', id)
    if (!page) {
      return res
        .status(404)
        .json({ error: t('pages.notFound', {}, { defaultValue: 'Page not found' }) })
    }
    const access = await ensureSpaceAccess(page.space_id, userId)
    if (!access.ok) return res.status(access.status).json({ error: access.message })
    res.json(page)
  } catch (err) {
    console.error('[pages.get /:id]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParam(req, 'id')
    const page = await findById<PageRow>('wiki_pages', id)
    if (!page) {
      return res
        .status(404)
        .json({ error: t('pages.notFound', {}, { defaultValue: 'Page not found' }) })
    }
    const access = await ensureSpaceAccess(page.space_id, userId)
    if (!access.ok) return res.status(access.status).json({ error: access.message })

    const versions = await findMany('wiki_page_versions', {
      where: [{ field: 'page_id', operator: '=', value: id }],
      orderBy: [{ field: 'version', direction: 'desc' }],
      limit: 50,
    })
    res.json(versions)
  } catch (err) {
    console.error('[pages.get /:id/versions]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id/versions/:version', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParam(req, 'id')
    const page = await findById<PageRow>('wiki_pages', id)
    if (!page) {
      return res
        .status(404)
        .json({ error: t('pages.notFound', {}, { defaultValue: 'Page not found' }) })
    }
    const access = await ensureSpaceAccess(page.space_id, userId)
    if (!access.ok) return res.status(access.status).json({ error: access.message })

    const version = await findOne('wiki_page_versions', [
      { field: 'page_id', operator: '=', value: id },
      { field: 'version', operator: '=', value: Number(getParam(req, 'version')) },
    ])
    if (!version) {
      return res
        .status(404)
        .json({ error: t('pages.versionNotFound', {}, { defaultValue: 'Version not found' }) })
    }
    res.json(version)
  } catch (err) {
    console.error('[pages.get /:id/versions/:version]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

const createPageSchema = z.object({
  title: z.string().min(1).max(240),
  content: z.string().default(''),
  space_id: z.string().min(1),
  parent_id: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  is_template: z.boolean().optional(),
})

// Enforce the per-tier page cap (tiers.ts maxPages) — defined + shown on Pricing but enforceLimit was
// never called, so any tier could create unlimited pages. Pages are owned by author_id.
const enforcePageLimit = enforceLimit<WikiLimits>({
  limitType: 'maxPages',
  getLimit: (limits) => limits.maxPages,
  getCurrent: async (userId) =>
    count('wiki_pages', [{ field: 'author_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforcePageLimit,
  validateBody(createPageSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

      const body = req.body as z.infer<typeof createPageSchema>
      const access = await ensureSpaceAccess(body.space_id, userId, { write: true })
      if (!access.ok) return res.status(access.status).json({ error: access.message })

      const baseSlug = slugify(body.title) || `page-${Date.now()}`
      let slug = baseSlug
      let suffix = 1
      while (
        await findOne('wiki_pages', [
          { field: 'space_id', operator: '=', value: body.space_id },
          { field: 'slug', operator: '=', value: slug },
        ])
      ) {
        slug = `${baseSlug}-${suffix++}`
      }

      const result = await create<PageRow>('wiki_pages', {
        space_id: body.space_id,
        parent_id: body.parent_id ?? null,
        title: body.title,
        slug,
        content: body.content ?? '',
        summary: null,
        is_template: body.is_template ?? false,
        position: null,
        trashed_at: null,
        tags: JSON.stringify(body.tags ?? []),
        author_id: userId,
        last_editor_id: userId,
        version: 1,
        sort_order: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })

      const created = result.data as PageRow
      if (created) {
        await create('wiki_page_versions', {
          page_id: created.id,
          title: body.title,
          content: body.content ?? '',
          version: 1,
          editor_id: userId,
          created_at: new Date(),
        })

        if (hasSearch() && created.id) {
          try {
            await indexDoc('wiki_pages', created.id, {
              id: created.id,
              title: body.title,
              content: body.content ?? '',
              space_id: body.space_id,
            })
          } catch (_error) {
            // best-effort; search down should not break page create
          }
        }
      }
      res.status(201).json(created)
    } catch (err) {
      console.error('[pages.post /]', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

const updatePageSchema = z.object({
  title: z.string().min(1).max(240).optional(),
  content: z.string().optional(),
  parent_id: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  change_summary: z.string().max(500).optional(),
})

router.put('/:id', validateBody(updatePageSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParam(req, 'id')
    const existing = await findById<PageRow>('wiki_pages', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('pages.notFound', {}, { defaultValue: 'Page not found' }) })
    }
    const access = await ensureSpaceAccess(existing.space_id, userId, { write: true })
    if (!access.ok) return res.status(access.status).json({ error: access.message })

    const body = req.body as z.infer<typeof updatePageSchema>
    const newVersion = existing.version + 1
    const updates: Record<string, unknown> = {
      last_editor_id: userId,
      version: newVersion,
      updated_at: new Date(),
    }
    if (body.title !== undefined) {
      updates.title = body.title
      updates.slug = slugify(body.title)
    }
    if (body.content !== undefined) updates.content = body.content
    if (body.parent_id !== undefined) updates.parent_id = body.parent_id
    if (body.tags !== undefined) updates.tags = JSON.stringify(body.tags)

    const result = await updateById<PageRow>('wiki_pages', id, updates)
    const updated = result.data as PageRow

    await create('wiki_page_versions', {
      page_id: id,
      title: (updates.title as string | undefined) ?? existing.title,
      content: (updates.content as string | undefined) ?? existing.content,
      version: newVersion,
      change_summary: body.change_summary ?? null,
      editor_id: userId,
      created_at: new Date(),
    })

    if (hasSearch() && updated?.id) {
      try {
        await indexDoc('wiki_pages', updated.id, {
          id: updated.id,
          title: updated.title,
          content: updated.content,
          space_id: updated.space_id,
        })
      } catch (_error) {
        // best-effort; search index update failure should not break page update
      }
    }
    res.json(updated)
  } catch (err) {
    console.error('[pages.put /:id]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/restore/:version', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParam(req, 'id')
    const versionParam = getParam(req, 'version')
    const existing = await findById<PageRow>('wiki_pages', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('pages.notFound', {}, { defaultValue: 'Page not found' }) })
    }
    const access = await ensureSpaceAccess(existing.space_id, userId, { write: true })
    if (!access.ok) return res.status(access.status).json({ error: access.message })

    const version = await findOne<{ title: string; content: string }>('wiki_page_versions', [
      { field: 'page_id', operator: '=', value: id },
      { field: 'version', operator: '=', value: Number(versionParam) },
    ])
    if (!version) {
      return res
        .status(404)
        .json({ error: t('pages.versionNotFound', {}, { defaultValue: 'Version not found' }) })
    }

    const newVersion = existing.version + 1
    const result = await updateById<PageRow>('wiki_pages', id, {
      title: version.title,
      content: version.content,
      version: newVersion,
      last_editor_id: userId,
      updated_at: new Date(),
    })

    await create('wiki_page_versions', {
      page_id: id,
      title: version.title,
      content: version.content,
      version: newVersion,
      change_summary: `Restored from v${versionParam}`,
      editor_id: userId,
      created_at: new Date(),
    })

    res.json(result.data)
  } catch (err) {
    console.error('[pages.post /:id/restore/:version]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

const summarizeBodySchema = z.object({}).optional()

router.post(
  '/:id/summarize',
  validateBody(summarizeBodySchema as unknown as z.ZodTypeAny),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

      const id = getParam(req, 'id')
      const page = await findById<PageRow>('wiki_pages', id)
      if (!page) {
        return res
          .status(404)
          .json({ error: t('pages.notFound', {}, { defaultValue: 'Page not found' }) })
      }
      const access = await ensureSpaceAccess(page.space_id, userId)
      if (!access.ok) return res.status(access.status).json({ error: access.message })

      if (page.summary) {
        res.json({ summary: page.summary, cached: true })
        return
      }
      if (!hasSummarizer()) {
        return res.status(503).json({
          error: t(
            'pages.summarizerUnavailable',
            {},
            { defaultValue: 'AI summarization not configured' },
          ),
        })
      }
      const { summary } = await getSummarizer().summarize({ text: page.content })
      await updateById('wiki_pages', id, { summary, updated_at: new Date() })
      res.json({ summary, cached: false })
    } catch (err) {
      console.error('[pages.post /:id/summarize]', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParam(req, 'id')
    const existing = await findById<PageRow>('wiki_pages', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('pages.notFound', {}, { defaultValue: 'Page not found' }) })
    }
    const access = await ensureSpaceAccess(existing.space_id, userId, { write: true })
    if (!access.ok) return res.status(access.status).json({ error: access.message })

    // ?permanent=true → hard delete (Trash "Purge"); otherwise soft delete via trashed_at.
    const permanent = String(req.query.permanent ?? '') === 'true'
    if (permanent) {
      const versions = await findMany<{ id: string }>('wiki_page_versions', {
        where: [{ field: 'page_id', operator: '=', value: id }],
      })
      for (const v of versions) {
        await deleteById('wiki_page_versions', v.id)
      }
      await deleteById('wiki_pages', id)
    } else {
      await updateById('wiki_pages', id, { trashed_at: new Date(), updated_at: new Date() })
    }
    res.status(204).end()
  } catch (err) {
    console.error('[pages.delete]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParam(req, 'id')
    const existing = await findById<PageRow>('wiki_pages', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('pages.notFound', {}, { defaultValue: 'Page not found' }) })
    }
    const access = await ensureSpaceAccess(existing.space_id, userId, { write: true })
    if (!access.ok) return res.status(access.status).json({ error: access.message })

    const result = await updateById('wiki_pages', id, { trashed_at: null, updated_at: new Date() })
    res.json(result.data)
  } catch (err) {
    console.error('[pages.post /:id/restore]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Stable count helper: total pages a user authored (for dashboards / limits).
router.get('/stats/count', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const total = await count('wiki_pages', [{ field: 'author_id', operator: '=', value: userId }])
    res.json({ count: total })
  } catch (err) {
    console.error('[pages.get /stats/count]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
