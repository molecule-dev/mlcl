import { Router } from 'express'
import { z } from 'zod'

import { t } from '@molecule/api-i18n'
import { search as searchIndex } from '@molecule/api-search'

const ALLOWED_INDICES = new Set(['products', 'posts', 'users'])

const router = Router()

router.get('/', async (req, res) => {
  const parsed = z
    .object({
      q: z.string().min(1).max(500),
      index: z.string().refine((v) => ALLOWED_INDICES.has(v)),
      perPage: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
    .safeParse(req.query)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('search.invalid', undefined, { defaultValue: 'Invalid search query' }) })
  }

  const result = await searchIndex(parsed.data.index, {
    text: parsed.data.q,
    perPage: parsed.data.perPage,
  })
  // The bond returns each hit as { id, score, document, highlights } — the
  // indexed fields live under `document`. Flatten to the shape the UI consumes
  // (SearchPage's `Hit` reads `title`/`excerpt`); adjust the keys to your
  // index's schema. Do NOT pass `result.hits` through raw — the client would
  // read `hit.title` (undefined) instead of `hit.document.title`.
  const hits = result.hits.map((hit) => ({
    id: hit.id,
    title: String(hit.document.title ?? hit.document.name ?? hit.id),
    excerpt:
      typeof hit.document.excerpt === 'string'
        ? hit.document.excerpt
        : typeof hit.document.description === 'string'
          ? hit.document.description
          : undefined,
  }))
  res.json({ hits, total: result.total })
})

export default router
