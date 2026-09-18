/**
 * Profile handler — returns the authenticated user's writing profile:
 * basic identity (name/email derived from `users`), aggregate counts
 * (published, drafts), and a list of published documents the user has
 * authored. No PII other than email; no follower/following data unless
 * the underlying datastore exposes it.
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface UserRow {
  id: string
  email: string | null
  name: string | null
  username: string | null
}

interface DocumentRow {
  id: string
  title: string
  summary?: string | null
  status: string
  word_count: number
  reading_minutes: number
  seo_score?: number | null
  updated_at: string | Date
  last_edited_at?: string | Date | null
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const user = await findById<UserRow>('users', userId)
    if (!user) {
      res
        .status(404)
        .json({ error: t('profile.notFound', {}, { defaultValue: 'Profile not found' }) })
      return
    }
    const [publishedRows, draftCount, totalCount] = await Promise.all([
      findMany<DocumentRow>('documents', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'status', operator: '=', value: 'published' },
        ],
        orderBy: [{ field: 'updated_at', direction: 'desc' }],
        limit: 12,
      }),
      count('documents', [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'draft' },
      ]),
      count('documents', [{ field: 'user_id', operator: '=', value: userId }]),
    ])

    const handle =
      user.username ??
      (user.email
        ? '@' + String(user.email).split('@')[0].toLowerCase()
        : '@' + String(user.id).slice(0, 8))

    const displayName =
      user.name && user.name.trim().length > 0
        ? user.name
        : user.email
          ? String(user.email).split('@')[0]
          : t('profile.anonymous', {}, { defaultValue: 'Anonymous writer' })

    const published = (publishedRows as DocumentRow[]).map((d) => ({
      id: String(d.id),
      title: String(d.title),
      excerpt: d.summary ?? '',
      status: String(d.status),
      wordCount: Number(d.word_count ?? 0),
      readingMinutes: Number(d.reading_minutes ?? 0),
      seoScore: d.seo_score == null ? null : Number(d.seo_score),
      updatedAt: d.last_edited_at ?? d.updated_at,
    }))

    res.json({
      name: displayName,
      handle,
      email: user.email ?? '',
      stats: {
        published: (publishedRows as DocumentRow[]).length,
        drafts: draftCount,
        total: totalCount,
      },
      published,
    })
  } catch (error) {
    logger.error('profile.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
