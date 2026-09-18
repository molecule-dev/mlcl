/**
 * Certificates handler — owner-only listing + create-on-completion + PDF
 * download.
 *
 * Authorization model from INVENTORY.md:
 *   - read (list / detail): owner-only — every endpoint scopes by `userId`.
 *   - create: requires the caller's enrollment row in the course to have
 *     `completed_at != null`. The certificate row carries `user_id` and
 *     the `enrollment_id` for downstream auditing.
 *   - download: owner-only; returns the cached PDF if `pdf_url` is already
 *     populated, otherwise renders inline via `@molecule/api-pdf`.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  findById,
  findMany,
  findOne,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'
import { fromHTML, hasProvider as hasPdfProvider } from '@molecule/api-pdf'

import { decorateCertificate } from './_decorate.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const courseIdParamSchema = z.object({ courseId: z.string().uuid() })

const createCertificateSchema = z.object({
  course_id: z.string().uuid(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const certificates = await findMany<Record<string, unknown>>('certificates', {
      where,
      orderBy: [{ field: 'issued_at', direction: 'desc' }],
      limit: 100,
    })
    const decorated = await Promise.all(certificates.map((c) => decorateCertificate(c)))
    res.json(decorated)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get(
  '/course/:courseId',
  validateParams(courseIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const cert = await findOne<Record<string, unknown>>('certificates', [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'course_id', operator: '=', value: String(req.params.courseId) },
      ])
      if (!cert) {
        res.status(404).json({
          error: t('certificates.notFound', undefined, { defaultValue: 'Certificate not found' }),
        })
        return
      }
      res.json(await decorateCertificate(cert))
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post('/', validateBody(createCertificateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createCertificateSchema>
    const enrollment = await findOne<Record<string, unknown>>('enrollments', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'course_id', operator: '=', value: body.course_id },
    ])
    if (!enrollment) {
      res.status(404).json({
        error: t('enrollments.notFound', undefined, { defaultValue: 'Enrollment not found' }),
      })
      return
    }
    if (!enrollment.completed_at) {
      res.status(400).json({
        error: t('certificates.notCompleted', undefined, {
          defaultValue: 'Course not completed yet',
        }),
      })
      return
    }
    // Idempotent: one certificate per (user, course).
    const existing = await findOne<Record<string, unknown>>('certificates', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'course_id', operator: '=', value: body.course_id },
    ])
    if (existing) {
      res.status(200).json(existing)
      return
    }
    const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
    const result = await create('certificates', {
      user_id: userId,
      course_id: body.course_id,
      enrollment_id: enrollment.id,
      certificate_number: certificateNumber,
      pdf_url: null,
      issued_at: new Date(),
      created_at: new Date(),
    })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/download', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const certificate = await findById<Record<string, unknown>>('certificates', idOf(req))
    if (!certificate || certificate.user_id !== userId) {
      res.status(404).json({
        error: t('certificates.notFound', undefined, { defaultValue: 'Certificate not found' }),
      })
      return
    }
    const course = await findById<Record<string, unknown>>('courses', String(certificate.course_id))
    const user = await findById<Record<string, unknown>>('users', userId)

    if (!hasPdfProvider()) {
      res.status(503).json({
        error: t('certificates.providerUnavailable', undefined, {
          defaultValue: 'PDF provider not configured',
        }),
      })
      return
    }
    const studentName = String(user?.name ?? user?.email ?? 'Student')
    const courseTitle = String(course?.title ?? '')
    const issuedAt = new Date(String(certificate.issued_at)).toISOString().slice(0, 10)
    const heading = t('certificates.heading', undefined, {
      defaultValue: 'Certificate of Completion',
    })
    const awardedTo = t('certificates.awardedTo', undefined, { defaultValue: 'Awarded to' })
    const forCompleting = t('certificates.forCourse', undefined, {
      defaultValue: 'For completing',
    })
    const numberLabel = t('certificates.number', undefined, {
      defaultValue: 'Certificate number',
    })
    const issuedAtLabel = t('certificates.issuedAt', undefined, { defaultValue: 'Issued at' })
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${heading}</title></head><body>
<h1>${heading}</h1>
<p>${awardedTo}: <strong>${studentName}</strong></p>
<p>${forCompleting}: <strong>${courseTitle}</strong></p>
<p>${numberLabel}: ${certificate.certificate_number}</p>
<p>${issuedAtLabel}: ${issuedAt}</p>
</body></html>`
    const pdfBuffer = await fromHTML(html)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename="certificate-${certificate.certificate_number}.pdf"`,
    )
    res.send(pdfBuffer)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/:id/regenerate',
  validateParams(idParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const certificate = await findById<Record<string, unknown>>('certificates', idOf(req))
      if (!certificate || certificate.user_id !== userId) {
        res.status(404).json({
          error: t('certificates.notFound', undefined, { defaultValue: 'Certificate not found' }),
        })
        return
      }
      // Mark the cached pdf_url as null so the next /download regenerates
      // — useful when a course title or instructor name changes.
      const result = await updateById('certificates', idOf(req), { pdf_url: null })
      res.json(result.data ?? result)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
