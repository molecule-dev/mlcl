import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createSampleSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  bpm: z.number().int().positive().optional(),
  music_key: z.string().optional(),
  length_sec: z.number().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
  is_public: z.boolean().optional(),
  waveform_peaks: z.array(z.number()).optional(),
  pack: z.string().optional(),
  category: z.string().optional(),
  cover_index: z.number().int().min(0).max(11).optional(),
  is_loop: z.boolean().optional(),
})

const updateSampleSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().min(1).optional(),
  bpm: z.number().int().positive().optional(),
  music_key: z.string().optional(),
  length_sec: z.number().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
  is_public: z.boolean().optional(),
  pack: z.string().optional(),
  category: z.string().optional(),
  cover_index: z.number().int().min(0).max(11).optional(),
  is_loop: z.boolean().optional(),
})

interface SampleRow {
  id: string
  user_id: string | null
  name: string
  url: string
  bpm: number | null
  music_key: string | null
  length_sec: string | number
  tags: unknown
  waveform_peaks?: unknown
  is_public: boolean
  pack?: string | null
  category?: string | null
  cover_index?: number
  is_loop?: boolean
  created_at: string | Date
}

function viewSample(row: SampleRow): Record<string, unknown> {
  let tags: string[] = []
  if (Array.isArray(row.tags)) tags = row.tags as string[]
  else if (typeof row.tags === 'string') {
    try {
      tags = JSON.parse(row.tags)
    } catch (_error) {
      // Non-array string that is not valid JSON — treat as empty tag list.
      tags = []
    }
  }
  const length =
    typeof row.length_sec === 'string' ? parseFloat(row.length_sec) : (row.length_sec ?? 0)
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    url: row.url,
    bpm: row.bpm ?? 0,
    music_key: row.music_key ?? '',
    key: row.music_key ?? '—',
    length_sec: length,
    duration_seconds: length,
    tags,
    is_public: row.is_public,
    pack: row.pack ?? 'Library',
    category: row.category ?? tags[0] ?? 'fx',
    cover_index: row.cover_index ?? 0,
    is_loop: Boolean(row.is_loop ?? tags.includes('loop')),
    waveform_peaks: row.waveform_peaks ?? null,
  }
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const search = typeof req.query.q === 'string' ? req.query.q.toLowerCase() : null

    // Visible sample set is the union of "owned" and "public library".
    // We pull all rows then filter in memory (small dataset) — avoids the
    // need for an OR predicate the DataStore abstraction doesn't expose.
    const all = (await findMany('samples', {
      orderBy: [{ field: 'name', direction: 'asc' }],
    })) as SampleRow[]
    const visible = all.filter((row) => row.user_id == null || row.user_id === userId)
    const filtered = search
      ? visible.filter((row) =>
          String(row.name ?? '')
            .toLowerCase()
            .includes(search),
        )
      : visible

    res.json(filtered.map(viewSample))
  } catch (error) {
    logger.error('samples.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const row = await findById<SampleRow>('samples', id)
    if (!row) {
      return res.status(404).json({
        error: t('samples.notFound', undefined, { defaultValue: 'Sample not found.' }),
      })
    }
    if (row.user_id != null && row.user_id !== userId && !row.is_public) {
      return res.status(404).json({
        error: t('samples.notFound', undefined, { defaultValue: 'Sample not found.' }),
      })
    }
    res.json(viewSample(row))
  } catch (error) {
    logger.error('samples.get', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/', validateBody(createSampleSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const body = req.body as z.infer<typeof createSampleSchema>
    const result = await create<SampleRow>('samples', {
      user_id: userId,
      name: body.name,
      url: body.url,
      bpm: body.bpm ?? null,
      music_key: body.music_key ?? null,
      length_sec: body.length_sec ?? 0,
      waveform_peaks: body.waveform_peaks ? JSON.stringify(body.waveform_peaks) : null,
      tags: JSON.stringify(body.tags ?? []),
      is_public: body.is_public ?? false,
      pack: body.pack ?? null,
      category: body.category ?? null,
      cover_index: body.cover_index ?? 0,
      is_loop: body.is_loop ?? false,
      created_at: new Date(),
    })

    if (!result.data) {
      return res.status(500).json({
        error: t('errors.internalServer', undefined, {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      })
    }
    res.status(201).json(viewSample(result.data))
  } catch (error) {
    logger.error('samples.create', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.put('/:id', validateBody(updateSampleSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const existing = await findById<SampleRow>('samples', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('samples.notFound', undefined, { defaultValue: 'Sample not found.' }),
      })
    }

    const body = req.body as z.infer<typeof updateSampleSchema>
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (body.name !== undefined) updates.name = body.name
    if (body.url !== undefined) updates.url = body.url
    if (body.bpm !== undefined) updates.bpm = body.bpm
    if (body.music_key !== undefined) updates.music_key = body.music_key
    if (body.length_sec !== undefined) updates.length_sec = body.length_sec
    if (body.tags !== undefined) updates.tags = JSON.stringify(body.tags)
    if (body.is_public !== undefined) updates.is_public = body.is_public
    if (body.pack !== undefined) updates.pack = body.pack
    if (body.category !== undefined) updates.category = body.category
    if (body.cover_index !== undefined) updates.cover_index = body.cover_index
    if (body.is_loop !== undefined) updates.is_loop = body.is_loop

    const result = await updateById<SampleRow>('samples', id, updates)
    if (!result.data) {
      return res.status(500).json({
        error: t('errors.internalServer', undefined, {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      })
    }
    res.json(viewSample(result.data))
  } catch (error) {
    logger.error('samples.update', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const existing = await findById<SampleRow>('samples', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('samples.notFound', undefined, { defaultValue: 'Sample not found.' }),
      })
    }

    await deleteById('samples', id)
    res.status(204).end()
  } catch (error) {
    logger.error('samples.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
