/**
 * Resume upload and download. POST /resume accepts multipart/form-data with
 * a single `file` field, stores it with the `@molecule/api-uploads` provider
 * and returns its serve URL (`/api/uploads/resume/<id>`); the URL is also
 * persisted to the caller's `user_profiles.resume_url` so subsequent
 * applications can default to it.
 *
 * The stored object is private (an S3 bucket's raw URL answers 403), so
 * GET /resume/:fileId streams it back: to the applicant whose profile or
 * application names it, and to the owner of a company the application was
 * sent to.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany, findOne, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import {
  discardUploads,
  getProvider as getUploadProvider,
  getUploads,
  receiveUploads,
  sendUpload,
} from '@molecule/api-uploads'

const MAX_RESUME_BYTES = 10 * 1024 * 1024

const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
]

/** The serve path a stored resume is saved under; GET /resume/:fileId streams it. */
export const RESUME_ROUTE = '/api/uploads/resume/'
const resumePath = (fileId: string): string => `${RESUME_ROUTE}${encodeURIComponent(fileId)}`

/**
 * A resume link a profile or application may hold: an uploaded resume's serve path,
 * or an absolute URL the applicant entered (a portfolio, a shared document).
 */
export const resumeUrlSchema = z
  .string()
  .url()
  // `.url()` alone accepts `javascript:` and `data:` links, which an employer would click.
  .regex(/^https?:\/\//i)
  .or(z.string().regex(/^\/api\/uploads\/resume\/(?:[\w.!~*'()-]|%[\da-fA-F]{2})+$/))

/** Filters legacy resume URLs through the same rules used for new links. */
export function safeResumeUrl(value: unknown): string | null {
  const parsed = resumeUrlSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

/** Keeps legacy values with unsupported protocols out of profile and application links. */
export const withSafeResumeUrl = (
  row: Record<string, unknown> | null,
): Record<string, unknown> | null => row && { ...row, resume_url: safeResumeUrl(row.resume_url) }

/**
 * Only an uploader can add a reference to one of the app's private resume files.
 *
 * @param userId - The applicant making the write.
 * @param url - A validated resume URL or an omitted or cleared value.
 * @returns Whether the profile or application may be saved with this value.
 */
export const canReferenceResume = async (
  userId: string,
  url: string | null | undefined,
): Promise<boolean> => {
  if (!url?.startsWith(RESUME_ROUTE)) return true
  const profile = await findOne('user_profiles', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'resume_url', operator: '=', value: url },
  ])
  if (profile) return true
  // An earlier application may still hold the applicant's resume after their profile changes.
  return !!(await findOne('applications', [
    { field: 'applicant_id', operator: '=', value: userId },
    { field: 'resume_url', operator: '=', value: url },
  ]))
}

/** The same response for a missing resume and an unauthorized reference. */
export const resumeNotFound = (res: Response): void => {
  res
    .status(404)
    .json({ error: t('uploads.error.notFound', {}, { defaultValue: 'Resume not found.' }) })
}

const router = Router()

const requireUser: RequestHandler = (_req, res, next) => {
  if (!getUserId(res)) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
    return
  }
  next()
}

// receiveUploads refuses a type outside ALLOWED_MIME (415), a file over
// MAX_RESUME_BYTES (413) and a request without a `file` (400) before this runs.
router.post(
  '/resume',
  requireUser,
  receiveUploads({
    field: 'file',
    maxFileBytes: MAX_RESUME_BYTES,
    types: ALLOWED_MIME,
    maxFields: 5,
  }),
  async (req: Request, res: Response) => {
    const userId = String(getUserId(res))
    const [file] = getUploads(req, 'file')
    // A serve URL, never `file.location`: the stored object is private.
    const location = resumePath(file.id)
    try {
      const existing = await findOne<Record<string, unknown>>('user_profiles', [
        { field: 'user_id', operator: '=', value: userId },
      ])
      const now = new Date().toISOString()
      const result = existing
        ? await updateMany('user_profiles', [{ field: 'user_id', operator: '=', value: userId }], {
            resume_url: location,
            updated_at: now,
          })
        : await create('user_profiles', {
            user_id: userId,
            resume_url: location,
            skills: JSON.stringify([]),
            willing_to_relocate: false,
            created_at: now,
            updated_at: now,
          })
      if (result.affected !== 1) throw new Error('Resume profile write affected no row')
    } catch (err) {
      console.error('[uploads.resume] profile update failed', err)
      await discardUploads(req)
      res.status(500).json({
        error: t('uploads.saveFailed', {}, { defaultValue: 'Could not save the resume.' }),
      })
      return
    }
    res.status(201).json({
      url: location,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    })
  },
)

/**
 * Whether a user may read the resume behind a serve URL: it is on their profile or on an
 * application they sent, or on an application sent to a company they own.
 *
 * @param userId - The signed-in user.
 * @param url - The resume's serve URL.
 * @returns True when they may read it.
 */
const canReadResume = async (userId: string, url: string): Promise<boolean> => {
  if (await canReferenceResume(userId, url)) return true
  const companies = await findMany<{ id: string }>('companies', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
    select: ['id'],
  })
  if (!companies.length) return false
  const jobs = await findMany<{ id: string }>('jobs', {
    where: [{ field: 'company_id', operator: 'in', value: companies.map((row) => row.id) }],
    select: ['id'],
  })
  if (!jobs.length) return false
  return !!(await findOne('applications', [
    { field: 'job_id', operator: 'in', value: jobs.map((row) => row.id) },
    { field: 'resume_url', operator: '=', value: url },
  ]))
}

// GET /resume/:fileId — stream a stored resume to someone allowed to read it (see
// canReadResume). Anyone else gets the same 404 as a missing file, so file ids cannot be probed.
router.get('/resume/:fileId', requireUser, async (req: Request, res: Response) => {
  const userId = String(getUserId(res))
  const fileId = String(req.params.fileId)
  if (!(await canReadResume(userId, resumePath(fileId)))) {
    resumeNotFound(res)
    return
  }
  const stream = await getUploadProvider().getFile?.(fileId)
  if (!stream) {
    resumeNotFound(res)
    return
  }
  res.setHeader('Cache-Control', 'private, no-store')
  await sendUpload(res, stream, { filename: 'resume' })
})

export default router
