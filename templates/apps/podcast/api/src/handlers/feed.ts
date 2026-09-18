/**
 * Public RSS feed for a show — iTunes-namespace podcast RSS.
 *
 * No auth required. Reads only the `published` episodes for the show.
 * Validates the showId param via zod so malformed UUIDs return 400 rather
 * than fall through to a 5xx.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const showIdOf = (req: Request): string => String(req.params.showId)
const showIdParamSchema = z.object({ showId: z.string().uuid() })

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

router.get(
  '/:showId/rss',
  validateParams(showIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const matches = await findMany<Record<string, unknown>>('shows', {
        where: [{ field: 'id', operator: '=', value: showIdOf(req) }],
        limit: 1,
      })
      const show = matches[0]
      if (!show) {
        res
          .status(404)
          .json({ error: t('shows.notFound', undefined, { defaultValue: 'Show not found' }) })
        return
      }

      const baseUrl = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 4000}`
      const where: WhereCondition[] = [
        { field: 'show_id', operator: '=', value: showIdOf(req) },
        { field: 'status', operator: '=', value: 'published' },
      ]
      const episodes = await findMany<Record<string, unknown>>('episodes', {
        where,
        orderBy: [{ field: 'published_at', direction: 'desc' }],
        limit: 200,
      })

      const items = episodes
        .map((ep) => {
          const pubDate = ep.published_at ? new Date(ep.published_at as string).toUTCString() : ''
          return `
      <item>
        <title>${escapeXml(ep.title)}</title>
        <description>${escapeXml(ep.description ?? '')}</description>
        <pubDate>${pubDate}</pubDate>
        <enclosure url="${escapeXml(ep.audio_url ?? '')}" type="audio/mpeg" length="0"/>
        <guid isPermaLink="false">${escapeXml(ep.id)}</guid>
        <itunes:duration>${formatDuration(Number(ep.duration_seconds ?? 0))}</itunes:duration>
        <itunes:episode>${Number(ep.episode_number ?? 0)}</itunes:episode>
        <itunes:season>${Number(ep.season_number ?? 1)}</itunes:season>
      </item>`
        })
        .join('')

      const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(show.title)}</title>
    <description>${escapeXml(show.description ?? '')}</description>
    <link>${baseUrl}/shows/${escapeXml(show.id)}</link>
    <language>${escapeXml(show.language ?? 'en')}</language>
    <atom:link href="${baseUrl}/api/feed/${escapeXml(show.id)}/rss" rel="self" type="application/rss+xml"/>
    ${show.cover_image_url ? `<itunes:image href="${escapeXml(show.cover_image_url)}"/>` : ''}
    <itunes:author>${escapeXml(show.author_id ?? '')}</itunes:author>
    <itunes:category text="${escapeXml(show.category ?? 'Society &amp; Culture')}"/>${items}
  </channel>
</rss>`

      res.set('Content-Type', 'application/rss+xml; charset=utf-8')
      res.send(rss)
    } catch (error) {
      logger.error('feed.rss', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
