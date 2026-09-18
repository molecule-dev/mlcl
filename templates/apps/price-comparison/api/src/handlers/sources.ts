import { getParamId } from '@molecule/api-bonds-default-express'
import { get as rawCacheGet, set as rawCacheSet } from '@molecule/api-cache'
import { logger } from '@molecule/api-logger'

const CACHE_OP_TIMEOUT_MS = 1000
const withTimeout = async <T>(p: Promise<T>): Promise<T | null> => {
  let timer: NodeJS.Timeout | undefined
  try {
    return (await Promise.race([
      p,
      new Promise<null>((_, reject) => {
        timer = setTimeout(() => reject(new Error('cache timeout')), CACHE_OP_TIMEOUT_MS)
      }),
    ])) as T | null
  } finally {
    if (timer) clearTimeout(timer)
  }
}
const cacheGet = async (key: string): Promise<unknown> => {
  try {
    return await withTimeout(rawCacheGet(key))
  } catch (_error) {
    // cache miss or connection failure; caller treats null as a cache miss
    return null
  }
}
const cacheSet = async (key: string, value: unknown, opts?: { ttl?: number }): Promise<void> => {
  try {
    await withTimeout(rawCacheSet(key, value, opts))
  } catch (_error) {
    // non-fatal: cache write failure degrades to uncached responses
  }
}
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { schedule } from '@molecule/api-cron'
import type { WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { get as httpGet } from '@molecule/api-http'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'

const router = Router()

const createSourceSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  baseUrl: z.string().url(),
  logoUrl: z.string().url().optional(),
  fetchConfig: z.record(z.string(), z.unknown()).optional(),
})

const updateSourceSchema = z.object({
  name: z.string().min(1).optional(),
  baseUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  fetchConfig: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['active', 'disabled']).optional(),
})

// List all price sources — public.
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, status = 'active' } = req.query

    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: String(status) }]

    const sources = await findMany('sources', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit: Number(limit) || 50,
      offset: (Number(page) - 1) * (Number(limit) || 50),
    })
    res.json(sources)
  } catch (error) {
    logger.error('sources.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get single source with stats — public.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const source = await findById<Record<string, unknown>>('sources', id)
    if (!source) {
      return res
        .status(404)
        .json({ error: t('source.notFound', {}, { defaultValue: 'Source not found' }) })
    }

    const cacheKey = `source_stats:${id}`
    let stats = (await cacheGet(cacheKey)) as Record<string, unknown> | null
    if (!stats) {
      const prices = await findMany('price_entries', {
        where: [
          { field: 'source_id', operator: '=', value: id },
          { field: 'is_current', operator: '=', value: true },
        ],
        limit: 10000,
      })

      stats = {
        totalProducts: prices.length,
        lastFetchedAt: source.last_fetched_at,
      }

      await cacheSet(cacheKey, stats, { ttl: 300 })
    }

    res.json({ ...source, stats })
  } catch (error) {
    logger.error('sources.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Add a new source — admin-only (requireAdmin: role='admin' or ADMIN_EMAILS).
router.post(
  '/',
  requireAdmin,
  validateBody(createSourceSchema),
  async (req: Request, res: Response) => {
    try {
      const { name, slug, baseUrl, logoUrl, fetchConfig } = req.body

      const existing = await findMany('sources', {
        where: [{ field: 'slug', operator: '=', value: slug }],
        limit: 1,
      })

      if (existing.length) {
        return res.status(409).json({
          error: t(
            'source.duplicateSlug',
            {},
            { defaultValue: 'A source with this slug already exists' },
          ),
        })
      }

      const result = await create('sources', {
        name,
        slug,
        base_url: baseUrl,
        logo_url: logoUrl,
        fetch_config: fetchConfig || {},
        status: 'active',
        last_fetched_at: null,
        fetch_error_count: 0,
        created_at: new Date(),
      })

      const source = (result as { data?: Record<string, unknown> }).data ?? result
      res.status(201).json(source)
    } catch (error) {
      logger.error('sources.create', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update source — admin-only.
router.put(
  '/:id',
  requireAdmin,
  validateBody(updateSourceSchema),
  async (req: Request, res: Response) => {
    try {
      const id = getParamId(req)

      const existing = await findById<Record<string, unknown>>('sources', id)
      if (!existing) {
        return res
          .status(404)
          .json({ error: t('source.notFound', {}, { defaultValue: 'Source not found' }) })
      }

      const { name, baseUrl, logoUrl, fetchConfig, status } = req.body
      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = name
      if (baseUrl !== undefined) updates.base_url = baseUrl
      if (logoUrl !== undefined) updates.logo_url = logoUrl
      if (fetchConfig !== undefined) updates.fetch_config = fetchConfig
      if (status !== undefined) updates.status = status

      const result = await updateById('sources', id, updates)
      const source = (result as { data?: Record<string, unknown> }).data ?? result
      res.json(source)
    } catch (error) {
      logger.error('sources.update', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Soft-delete source — admin-only.
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)

    const existing = await findById<Record<string, unknown>>('sources', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('source.notFound', {}, { defaultValue: 'Source not found' }) })
    }

    await updateById('sources', id, { status: 'disabled' })
    res.status(204).end()
  } catch (error) {
    logger.error('sources.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Manually trigger a fetch for a source. Retailer-feed adapters are deferred —
// in v1 we simply ping the configured endpoint and update the timestamp.
router.post('/:id/fetch', requireAdmin, async (req: Request, res: Response) => {
  const id = getParamId(req)

  const source = await findById<Record<string, unknown>>('sources', id)
  if (!source) {
    return res
      .status(404)
      .json({ error: t('source.notFound', {}, { defaultValue: 'Source not found' }) })
  }

  try {
    const fetchConfig = (source.fetch_config as Record<string, unknown>) || {}
    const endpoint = (fetchConfig.endpoint as string) || `${source.base_url}/api/products`

    const response = await httpGet(endpoint, {
      headers: fetchConfig.headers as Record<string, string> | undefined,
    })

    await updateById('sources', id, {
      last_fetched_at: new Date(),
      fetch_error_count: 0,
    })

    res.json({
      message: t('source.fetchSuccess', {}, { defaultValue: 'Fetch completed successfully' }),
      itemCount: Array.isArray(response.data) ? response.data.length : 0,
    })
  } catch (err) {
    const errorCount = ((source.fetch_error_count as number) || 0) + 1
    await updateById('sources', id, {
      fetch_error_count: errorCount,
      last_fetch_error: (err as Error).message,
    })

    logger.error(err)
    res.status(500).json({
      error: t('source.fetchFailed', {}, { defaultValue: 'Failed to fetch from source' }),
    })
  }
})

// Initialize price fetching cron job — admin-only.
router.post('/cron/init', requireAdmin, async (_req: Request, res: Response) => {
  const cronExpression = process.env.PRICE_FETCH_CRON || '0 */6 * * *'

  await schedule('fetch-prices', cronExpression, async () => {
    const activeSources = await findMany<Record<string, unknown>>('sources', {
      where: [{ field: 'status', operator: '=', value: 'active' }],
      limit: 1000,
    })

    for (const source of activeSources) {
      try {
        const fetchConfig = (source.fetch_config as Record<string, unknown>) || {}
        const endpoint = (fetchConfig.endpoint as string) || `${source.base_url}/api/products`

        await httpGet(endpoint, {
          headers: fetchConfig.headers as Record<string, string> | undefined,
        })

        await updateById('sources', source.id as string, {
          last_fetched_at: new Date(),
          fetch_error_count: 0,
        })
      } catch (err) {
        const errorCount = ((source.fetch_error_count as number) || 0) + 1
        await updateById('sources', source.id as string, {
          fetch_error_count: errorCount,
          last_fetch_error: (err as Error).message,
        })
      }
    }
  })

  res.json({
    message: t(
      'source.cronInitialized',
      {},
      { defaultValue: 'Price fetching cron job initialized' },
    ),
  })
})

export default router
