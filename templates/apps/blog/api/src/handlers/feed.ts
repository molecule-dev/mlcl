import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { get } from '@molecule/api-config'
import { findMany } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

import { promoteDueScheduledPosts } from './_scheduled.js'

const router = Router()

const feedQuerySchema = z.object({
  limit: z
    .preprocess(
      (v) => (v == null || v === '' ? undefined : Number(v)),
      z.number().int().min(1).max(200),
    )
    .optional(),
})

// RSS feed
router.get('/rss', validateQuery(feedQuerySchema), async (req: Request, res: Response) => {
  try {
    await promoteDueScheduledPosts()
    const appName = get('APP_NAME', 'WriteFlow') ?? 'WriteFlow'
    const baseUrl = get('BASE_URL', 'http://localhost:3000') ?? 'http://localhost:3000'
    const limit = (req.query.limit as unknown as number) ?? 50

    const posts = await findMany<Record<string, unknown>>('posts', {
      where: [{ field: 'status', operator: '=', value: 'published' }],
      limit,
      orderBy: [{ field: 'published_at', direction: 'desc' }],
    })

    const items = posts
      .map(
        (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/post/${post.id}</link>
      <guid>${baseUrl}/post/${post.id}</guid>
      <description><![CDATA[${post.excerpt || ''}]]></description>
      <pubDate>${new Date(post.published_at as string).toUTCString()}</pubDate>
    </item>`,
      )
      .join('')

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${appName}</title>
    <link>${baseUrl}</link>
    <description>${appName} RSS Feed</description>
    <atom:link href="${baseUrl}/api/feed/rss" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

    res.set('Content-Type', 'application/rss+xml')
    res.send(rss)
  } catch (error) {
    logger.error('feed.rss failed', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// JSON feed (JSON Feed 1.1)
router.get('/json', validateQuery(feedQuerySchema), async (req: Request, res: Response) => {
  try {
    await promoteDueScheduledPosts()
    const appName = get('APP_NAME', 'WriteFlow') ?? 'WriteFlow'
    const baseUrl = get('BASE_URL', 'http://localhost:3000') ?? 'http://localhost:3000'
    const limit = (req.query.limit as unknown as number) ?? 50

    const posts = await findMany<Record<string, unknown>>('posts', {
      where: [{ field: 'status', operator: '=', value: 'published' }],
      limit,
      orderBy: [{ field: 'published_at', direction: 'desc' }],
    })

    const feed = {
      version: 'https://jsonfeed.org/version/1.1',
      title: appName,
      home_page_url: baseUrl,
      feed_url: `${baseUrl}/api/feed/json`,
      items: posts.map((post) => ({
        id: post.id,
        url: `${baseUrl}/post/${post.id}`,
        title: post.title,
        content_text: post.excerpt,
        date_published: post.published_at,
        tags: post.tags,
      })),
    }

    res.json(feed)
  } catch (error) {
    logger.error('feed.json failed', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
