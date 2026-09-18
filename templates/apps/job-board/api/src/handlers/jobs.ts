import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { index, search } from '@molecule/api-search'

import type { JobBoardLimits } from '../tiers.js'

const router = Router()

/**
 * Structured filters shared by BOTH public-board paths — plain browse
 * (`/published`) and text search (`/search`). Every public listing is
 * gated to `status = 'published'` plus the optional type/location/category
 * filters. The text-search path previously passed ONLY the query text,
 * silently dropping every one of these filters AND surfacing draft/closed
 * jobs (the index holds all statuses).
 */
export function buildPublicJobFilters(q: {
  type?: string
  location?: string
  category_id?: string
}): WhereCondition[] {
  const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'published' }]
  if (q.type) where.push({ field: 'type', operator: '=', value: q.type })
  if (q.location) where.push({ field: 'location', operator: '=', value: q.location })
  if (q.category_id) where.push({ field: 'category_id', operator: '=', value: q.category_id })
  return where
}

/**
 * Salary is stored as a min/max range, so it can't be an equality filter —
 * apply it in JS after the DB fetch. Shared by both public-board paths.
 */
export function applySalaryFilter<T extends Record<string, unknown>>(
  jobs: T[],
  salaryMin?: number,
  salaryMax?: number,
): T[] {
  let filtered = jobs
  if (typeof salaryMin === 'number') {
    filtered = filtered.filter((j) => Number(j.salary_max ?? 0) >= salaryMin)
  }
  if (typeof salaryMax === 'number') {
    filtered = filtered.filter((j) => Number(j.salary_min ?? 0) <= salaryMax)
  }
  return filtered
}

/**
 * Best-effort search indexing — Meilisearch may be unavailable in dev /
 * placeholder-creds environments and must never break the primary
 * write. Search-index drift is recovered by the periodic reindex job.
 */
async function tryIndex(name: string, id: string, doc: Record<string, unknown>): Promise<void> {
  try {
    await index(name, id, doc)
  } catch (_error) {
    // swallow — search index is eventually consistent.
  }
}

const jobTypeSchema = z.enum(['full_time', 'part_time', 'contract', 'internship'])

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  type: jobTypeSchema.optional(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
  location: z.string().optional(),
  company_id: z.string().uuid().optional(),
})

const publishedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  type: jobTypeSchema.optional(),
  location: z.string().optional(),
  salary_min: z.coerce.number().nonnegative().optional(),
  salary_max: z.coerce.number().nonnegative().optional(),
  category_id: z.string().uuid().optional(),
})

const searchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  // Same structured filters the plain browse path (/published) accepts — the
  // search path must apply them too, not just the free-text query.
  type: jobTypeSchema.optional(),
  location: z.string().optional(),
  salary_min: z.coerce.number().nonnegative().optional(),
  salary_max: z.coerce.number().nonnegative().optional(),
  category_id: z.string().uuid().optional(),
})

const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  company_id: z.string().uuid(),
  description: z.string().default(''),
  location: z.string().nullable().optional(),
  salary_min: z.number().nonnegative().nullable().optional(),
  salary_max: z.number().nonnegative().nullable().optional(),
  type: jobTypeSchema.default('full_time'),
  category_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).default([]),
})

const updateJobSchema = createJobSchema.partial()

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit, type, status, location, company_id } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const where = []
    if (type) where.push({ field: 'type', operator: '=' as const, value: type })
    if (status) where.push({ field: 'status', operator: '=' as const, value: status })
    if (location) where.push({ field: 'location', operator: '=' as const, value: location })
    if (company_id) where.push({ field: 'company_id', operator: '=' as const, value: company_id })

    const jobs = await findMany('jobs', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(jobs)
  } catch (err) {
    console.error('[jobs] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, page, limit, type, location, salary_min, salary_max, category_id } =
      req.query as unknown as z.infer<typeof searchQuerySchema>

    // Text-match first (the search index is text/equality-only), then apply the
    // SAME structured filters + published-only gate the browse path applies,
    // restricted to the matched ids. Previously this passed only the text —
    // dropping every filter and surfacing unpublished jobs.
    const results = await search('jobs', { text: q, page: 1, perPage: 1000 })
    const ids = results.hits
      .map((h) => String((h.document as { id?: unknown }).id ?? ''))
      .filter(Boolean)
    if (ids.length === 0) {
      res.json([])
      return
    }

    const where: WhereCondition[] = [
      { field: 'id', operator: 'in', value: ids },
      ...buildPublicJobFilters({ type, location, category_id }),
    ]
    const jobs = await findMany<Record<string, unknown>>('jobs', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(applySalaryFilter(jobs, salary_min, salary_max))
  } catch (err) {
    console.error('[jobs] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get(
  '/published',
  validateQuery(publishedQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const { page, limit, type, location, salary_min, salary_max, category_id } =
        req.query as unknown as z.infer<typeof publishedQuerySchema>

      const jobs = await findMany<Record<string, unknown>>('jobs', {
        where: buildPublicJobFilters({ type, location, category_id }),
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      })

      res.json(applySalaryFilter(jobs, salary_min, salary_max))
    } catch (err) {
      console.error('[jobs] handler failed:', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const job = await findById<Record<string, unknown>>('jobs', id)
    if (!job) {
      res.status(404).json({ error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }) })
      return
    }

    const company = await findById('companies', String(job.company_id))
    const applicationCount = await count('applications', [
      { field: 'job_id', operator: '=', value: id },
    ])

    res.json({ ...job, company, application_count: applicationCount })
  } catch (err) {
    console.error('[jobs] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<JobBoardLimits>({
    limitType: 'maxJobs',
    getLimit: (limits) => limits.maxJobs,
    getCurrent: async (userId) =>
      count('jobs', [{ field: 'posted_by', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createJobSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }

      const company = await findById<Record<string, unknown>>('companies', req.body.company_id)
      if (!company) {
        res
          .status(404)
          .json({ error: t('companies.notFound', {}, { defaultValue: 'Company not found' }) })
        return
      }
      if (company.owner_id !== userId) {
        res.status(403).json({
          error: t(
            'companies.notOwner',
            {},
            { defaultValue: 'Only the company owner can post jobs for this company' },
          ),
        })
        return
      }

      const result = await create('jobs', {
        posted_by: userId,
        ...req.body,
        location: req.body.location ?? null,
        salary_min: req.body.salary_min ?? null,
        salary_max: req.body.salary_max ?? null,
        category_id: req.body.category_id ?? null,
        // tags is a jsonb column; pg-driver would coerce a JS array to a
        // PG `text[]` literal (`{a,b}`) which jsonb parses as an OBJECT,
        // not the array we asked for. Pre-stringify so jsonb stores the
        // actual JSON array.
        tags: JSON.stringify(req.body.tags ?? []),
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const created = result.data as Record<string, unknown>
      await tryIndex('jobs', String(created.id), created)
      res.status(201).json(created)
    } catch (err) {
      console.error('[jobs.POST /] failed:', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updateJobSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('jobs', id)
    if (!existing) {
      res.status(404).json({ error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }) })
      return
    }
    if (existing.posted_by !== userId) {
      const company = await findById<Record<string, unknown>>(
        'companies',
        String(existing.company_id),
      )
      if (company?.owner_id !== userId) {
        res.status(403).json({
          error: t('jobs.notOwner', {}, { defaultValue: 'Only the job owner can edit this job' }),
        })
        return
      }
    }

    const updates: Record<string, unknown> = {
      ...req.body,
      updated_at: new Date().toISOString(),
    }
    // jsonb columns: stringify arrays so pg-driver doesn't coerce them
    // to a `text[]` literal (`{a,b}`) which jsonb interprets as object.
    if (Array.isArray(updates.tags)) {
      updates.tags = JSON.stringify(updates.tags)
    }
    const result = await updateById('jobs', id, updates)
    const updated = result.data as Record<string, unknown>
    await tryIndex('jobs', String(updated.id), updated)
    res.json(updated)
  } catch (err) {
    console.error('[jobs.PUT /:id] failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const job = await findById<Record<string, unknown>>('jobs', id)
    if (!job) {
      res.status(404).json({ error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }) })
      return
    }
    if (job.posted_by !== userId) {
      res.status(403).json({
        error: t('jobs.notOwner', {}, { defaultValue: 'Only the job owner can publish this job' }),
      })
      return
    }
    if (job.status === 'closed') {
      res.status(400).json({
        error: t(
          'jobs.cannotPublishClosed',
          {},
          { defaultValue: 'Cannot publish a closed job posting' },
        ),
      })
      return
    }

    const result = await updateById('jobs', id, {
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const published = result.data as Record<string, unknown>
    await tryIndex('jobs', String(published.id), published)
    res.json(published)
  } catch (err) {
    console.error('[jobs] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/close', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const job = await findById<Record<string, unknown>>('jobs', id)
    if (!job) {
      res.status(404).json({ error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }) })
      return
    }
    if (job.posted_by !== userId) {
      res.status(403).json({
        error: t('jobs.notOwner', {}, { defaultValue: 'Only the job owner can close this job' }),
      })
      return
    }

    const result = await updateById('jobs', id, {
      status: 'closed',
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const closed = result.data as Record<string, unknown>
    await tryIndex('jobs', String(closed.id), closed)
    res.json(closed)
  } catch (err) {
    console.error('[jobs] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const job = await findById<Record<string, unknown>>('jobs', id)
    if (!job) {
      res.status(404).json({ error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }) })
      return
    }
    if (job.posted_by !== userId) {
      res.status(403).json({
        error: t('jobs.notOwner', {}, { defaultValue: 'Only the job owner can delete this job' }),
      })
      return
    }

    const applications = await findMany('applications', {
      where: [{ field: 'job_id', operator: '=', value: id }],
      limit: 1,
    })
    if (applications.length > 0) {
      res.status(409).json({
        error: t(
          'jobs.hasApplications',
          {},
          { defaultValue: 'Cannot delete a job with existing applications' },
        ),
      })
      return
    }

    await deleteById('jobs', id)
    res.status(204).end()
  } catch (err) {
    console.error('[jobs] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
