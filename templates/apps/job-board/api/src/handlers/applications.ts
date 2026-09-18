import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { JobBoardLimits } from '../tiers.js'

const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`

const router = Router()

const applicationStatusSchema = z.enum([
  'submitted',
  'reviewed',
  'interview',
  'offered',
  'rejected',
  'withdrawn',
])

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: applicationStatusSchema.optional(),
  job_id: z.string().uuid().optional(),
  applicant_id: z.string().uuid().optional(),
})

const createApplicationSchema = z.object({
  job_id: z.string().uuid(),
  cover_letter: z.string().default(''),
  resume_url: z.string().url().nullable().optional(),
})

const updateApplicationSchema = z.object({
  cover_letter: z.string().optional(),
  resume_url: z.string().url().nullable().optional(),
})

const updateStatusSchema = z.object({
  status: applicationStatusSchema,
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { page, limit, status, job_id, applicant_id } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >

    // Per-INVENTORY authorization rule: applicants can only list their own
    // applications; company owners can list applications for jobs they own.
    // Reject any cross-user list attempt up front to prevent IDOR.
    if (applicant_id && applicant_id !== userId) {
      res.status(403).json({
        error: t(
          'applications.notOwner',
          {},
          { defaultValue: 'You can only list your own applications' },
        ),
      })
      return
    }

    const where = []
    if (status) where.push({ field: 'status', operator: '=' as const, value: status })
    if (applicant_id) {
      where.push({ field: 'applicant_id', operator: '=' as const, value: applicant_id })
    } else if (job_id) {
      // Listing for a specific job — must be the company owner.
      const job = await findById<Record<string, unknown>>('jobs', job_id)
      if (!job) {
        res.status(404).json({ error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }) })
        return
      }
      const company = await findById<Record<string, unknown>>('companies', String(job.company_id))
      if (company?.owner_id !== userId) {
        res.status(403).json({
          error: t(
            'applications.notOwner',
            {},
            { defaultValue: 'Only the company owner can view applications for this job' },
          ),
        })
        return
      }
      where.push({ field: 'job_id', operator: '=' as const, value: job_id })
    } else {
      // Default: scope to current user's own applications.
      where.push({ field: 'applicant_id', operator: '=' as const, value: userId })
    }

    const applications = await findMany<Record<string, unknown>>('applications', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })

    // Enrich with related data the UI needs to render rows without a
    // second roundtrip per row. Employer views need applicant identity;
    // applicant views need the job title + company name. We hydrate both
    // sides here so a single `/api/applications` GET drives both screens.
    const jobIds = new Set<string>()
    const userIds = new Set<string>()
    for (const a of applications) {
      if (a.job_id) jobIds.add(String(a.job_id))
      if (a.applicant_id) userIds.add(String(a.applicant_id))
    }
    const jobsById = new Map<string, Record<string, unknown>>()
    const usersById = new Map<string, Record<string, unknown>>()
    const companiesById = new Map<string, Record<string, unknown>>()
    await Promise.all([
      ...Array.from(jobIds).map(async (jid) => {
        const j = await findById<Record<string, unknown>>('jobs', jid)
        if (j) {
          jobsById.set(jid, j)
          if (j.company_id) {
            const c = await findById<Record<string, unknown>>('companies', String(j.company_id))
            if (c) companiesById.set(String(j.company_id), c)
          }
        }
      }),
      ...Array.from(userIds).map(async (uid) => {
        const u = await findById<Record<string, unknown>>('users', uid)
        if (u) usersById.set(uid, u)
      }),
    ])

    const enriched = applications.map((a) => {
      const job = a.job_id ? jobsById.get(String(a.job_id)) : null
      const company = job?.company_id ? companiesById.get(String(job.company_id)) : null
      const applicant = a.applicant_id ? usersById.get(String(a.applicant_id)) : null
      return {
        ...a,
        job: job
          ? {
              id: job.id,
              title: job.title,
              company_id: job.company_id,
              company_name: company?.name ?? null,
            }
          : null,
        applicant_name: applicant?.name ?? null,
        applicant_email: applicant?.email ?? null,
      }
    })

    res.json(enriched)
  } catch (err) {
    console.error('[applications] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const application = await findById<Record<string, unknown>>('applications', id)
    if (!application) {
      res
        .status(404)
        .json({ error: t('applications.notFound', {}, { defaultValue: 'Application not found' }) })
      return
    }

    const isApplicant = application.applicant_id === userId
    let isCompanyOwner = false
    const job = await findById<Record<string, unknown>>('jobs', String(application.job_id))
    if (job) {
      const company = await findById<Record<string, unknown>>('companies', String(job.company_id))
      isCompanyOwner = company?.owner_id === userId
    }
    if (!isApplicant && !isCompanyOwner) {
      res.status(403).json({
        error: t(
          'applications.notOwner',
          {},
          { defaultValue: 'You do not have access to this application' },
        ),
      })
      return
    }

    const applicant = await findById('users', String(application.applicant_id))
    res.json({ ...application, job, applicant })
  } catch (err) {
    console.error('[applications] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<JobBoardLimits>({
    limitType: 'maxApplications',
    getLimit: (limits) => limits.maxApplications,
    getCurrent: async (userId) =>
      count('applications', [{ field: 'applicant_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createApplicationSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const { job_id, cover_letter, resume_url } = req.body as z.infer<
        typeof createApplicationSchema
      >

      const job = await findById<Record<string, unknown>>('jobs', job_id)
      if (!job) {
        res.status(404).json({ error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }) })
        return
      }

      if (job.status !== 'published') {
        res.status(400).json({
          error: t(
            'applications.jobNotAccepting',
            {},
            { defaultValue: 'This job is not accepting applications' },
          ),
        })
        return
      }

      const existing = await findOne<Record<string, unknown>>('applications', [
        { field: 'job_id', operator: '=', value: job_id },
        { field: 'applicant_id', operator: '=', value: userId },
      ])
      if (existing) {
        res.status(409).json({
          error: t(
            'applications.alreadyApplied',
            {},
            { defaultValue: 'You have already applied to this job' },
          ),
        })
        return
      }

      const result = await create('applications', {
        job_id,
        applicant_id: userId,
        cover_letter: cover_letter || '',
        resume_url: resume_url ?? null,
        status: 'submitted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const company = await findById<Record<string, unknown>>('companies', String(job.company_id))
      if (company && company.contact_email) {
        try {
          await sendMail({
            from: FROM_ADDRESS,
            to: String(company.contact_email),
            subject: t(
              'applications.newApplicationSubject',
              { title: String(job.title) },
              { defaultValue: 'New application for {{title}}' },
            ),
            text: t(
              'applications.newApplicationBody',
              { title: String(job.title) },
              { defaultValue: 'A new application has been submitted for the position: {{title}}' },
            ),
          })
        } catch (_error) {
          // Email delivery failure must not break the application submission.
        }
      }

      res.status(201).json(result.data)
    } catch (err) {
      console.error('[applications] handler failed:', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id/status', validateBody(updateStatusSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const { status } = req.body as z.infer<typeof updateStatusSchema>

    const application = await findById<Record<string, unknown>>('applications', id)
    if (!application) {
      res
        .status(404)
        .json({ error: t('applications.notFound', {}, { defaultValue: 'Application not found' }) })
      return
    }

    // Status updates may be done by the company owner (review path) or by
    // the applicant (only `withdrawn`).
    const job = await findById<Record<string, unknown>>('jobs', String(application.job_id))
    const company = job
      ? await findById<Record<string, unknown>>('companies', String(job.company_id))
      : null
    const isCompanyOwner = company?.owner_id === userId
    const isApplicant = application.applicant_id === userId
    if (!isCompanyOwner && !(isApplicant && status === 'withdrawn')) {
      res.status(403).json({
        error: t(
          'applications.notOwner',
          {},
          { defaultValue: 'You cannot update this application' },
        ),
      })
      return
    }

    const result = await updateById('applications', id, {
      status,
      updated_at: new Date().toISOString(),
    })

    const applicant = await findById<Record<string, unknown>>(
      'users',
      String(application.applicant_id),
    )
    // Honor the applicant's "Email me on application updates" toggle (Settings →
    // oauthData.settings.applicationUpdates, default on). It was stored but the status-change email
    // was sent unconditionally, so turning it off did nothing. The in-app bell below is a separate
    // channel the email toggle doesn't govern.
    const applicantSettings = (((applicant?.oauthData ?? {}) as Record<string, unknown>).settings ??
      {}) as { applicationUpdates?: boolean }
    const wantsStatusEmail = applicantSettings.applicationUpdates !== false
    if (applicant && applicant.email && isCompanyOwner && wantsStatusEmail) {
      try {
        await sendMail({
          from: FROM_ADDRESS,
          to: String(applicant.email),
          subject: t(
            'applications.statusUpdateSubject',
            { title: String(job?.title || '') },
            { defaultValue: 'Application update for {{title}}' },
          ),
          text: t(
            'applications.statusUpdateBody',
            { status },
            { defaultValue: 'Your application status has been updated to: {{status}}' },
          ),
        })
      } catch (_error) {
        // Email failure must not break the status update.
      }
    }

    // Mirror the email in the in-app notifications bell. The notifications table, list
    // endpoint and UI already exist, but nothing ever created a row — so the bell was
    // always empty. Only the employer's review moves an application (skip the applicant's
    // own `withdrawn`). Best-effort: a failure here must not break the status update.
    if (isCompanyOwner) {
      try {
        const jobTitle = String(job?.title ?? 'a job')
        await create('notifications', {
          user_id: String(application.applicant_id),
          kind: 'application_status',
          body: t(
            'notifications.applicationStatus',
            { title: jobTitle, status },
            { defaultValue: `Your application for "${jobTitle}" is now ${status}.` },
          ),
          link: `/jobs/${String(application.job_id)}`,
          read: false,
        })
      } catch (_error) {
        // Notification failure must not break the status update.
      }
    }

    res.json(result.data)
  } catch (err) {
    console.error('[applications] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateApplicationSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('applications', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('applications.notFound', {}, { defaultValue: 'Application not found' }) })
      return
    }
    if (existing.applicant_id !== userId) {
      res.status(403).json({
        error: t(
          'applications.notOwner',
          {},
          { defaultValue: 'Only the applicant can update this application' },
        ),
      })
      return
    }

    const result = await updateById('applications', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('[applications] handler failed:', err)
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
    const application = await findById<Record<string, unknown>>('applications', id)
    if (!application) {
      res
        .status(404)
        .json({ error: t('applications.notFound', {}, { defaultValue: 'Application not found' }) })
      return
    }
    if (application.applicant_id !== userId) {
      res.status(403).json({
        error: t(
          'applications.notOwner',
          {},
          { defaultValue: 'Only the applicant can withdraw this application' },
        ),
      })
      return
    }

    await deleteById('applications', id)
    res.status(204).end()
  } catch (err) {
    console.error('[applications] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
