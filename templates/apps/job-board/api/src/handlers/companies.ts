import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { JobBoardLimits } from '../tiers.js'

const router = Router()

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  owner_id: z.string().uuid().optional(),
  // `?mine=true` is a convenience for the authenticated user — filters
  // companies down to ones they own without requiring the client to know
  // its own user id.
  mine: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
})

const createCompanySchema = z.object({
  name: z.string().min(1).max(200),
  logo_url: z.string().url().nullable().optional(),
  description: z.string().default(''),
  website: z.string().url().nullable().optional(),
  employee_count: z.number().int().nonnegative().nullable().optional(),
  contact_email: z.email().nullable().optional(),
  location: z.string().nullable().optional(),
})

const updateCompanySchema = createCompanySchema.partial()

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit, owner_id, mine } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where = []
    if (mine) {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      where.push({ field: 'owner_id', operator: '=' as const, value: userId })
    } else if (owner_id) {
      where.push({ field: 'owner_id', operator: '=' as const, value: owner_id })
    }
    const companies = await findMany('companies', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(companies)
  } catch (err) {
    console.error('[companies] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const company = await findById<Record<string, unknown>>('companies', id)
    if (!company) {
      res
        .status(404)
        .json({ error: t('companies.notFound', {}, { defaultValue: 'Company not found' }) })
      return
    }

    const activeJobs = await findMany('jobs', {
      where: [
        { field: 'company_id', operator: '=', value: id },
        { field: 'status', operator: '=', value: 'published' },
      ],
    })

    res.json({ ...company, active_job_count: activeJobs.length })
  } catch (err) {
    console.error('[companies] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<JobBoardLimits>({
    limitType: 'maxCompanies',
    getLimit: (limits) => limits.maxCompanies,
    getCurrent: async (userId) =>
      count('companies', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createCompanySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }

      const result = await create('companies', {
        owner_id: userId,
        ...req.body,
        logo_url: req.body.logo_url ?? null,
        website: req.body.website ?? null,
        employee_count: req.body.employee_count ?? null,
        contact_email: req.body.contact_email ?? null,
        location: req.body.location ?? null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      console.error('[companies] handler failed:', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updateCompanySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('companies', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('companies.notFound', {}, { defaultValue: 'Company not found' }) })
      return
    }
    if (existing.owner_id !== userId) {
      res.status(403).json({
        error: t(
          'companies.notOwner',
          {},
          { defaultValue: 'Only the company owner can edit this company' },
        ),
      })
      return
    }

    const result = await updateById('companies', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('[companies] handler failed:', err)
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
    const company = await findById<Record<string, unknown>>('companies', id)
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
          { defaultValue: 'Only the company owner can edit this company' },
        ),
      })
      return
    }

    const jobs = await findMany('jobs', {
      where: [{ field: 'company_id', operator: '=', value: id }],
      limit: 1,
    })
    if (jobs.length > 0) {
      res.status(409).json({
        error: t(
          'companies.hasJobs',
          {},
          { defaultValue: 'Cannot delete a company with existing job postings' },
        ),
      })
      return
    }

    await deleteById('companies', id)
    res.status(204).end()
  } catch (err) {
    console.error('[companies] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
