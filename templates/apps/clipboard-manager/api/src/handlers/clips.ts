/**
 * Clip handlers — owner-scoped CRUD over `clips`.
 *
 * Sensitive clips never leak ciphertext through LIST endpoints — `content`
 * is null on the wire and `encrypted_content` is dropped. Only `GET /:id`
 * decrypts via the encryption bond.
 *
 * Search uses `@molecule/api-search` (Meilisearch by default) for non-
 * sensitive content. Sensitive titles are still indexed (titles are
 * intentional metadata) but the body is held back.
 *
 * Authorization: every mutating endpoint re-fetches via `requireClip`
 * and returns 404 on miss to avoid existence leakage.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { decrypt, encrypt } from '@molecule/api-encryption'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { deleteDocument, index, search } from '@molecule/api-search'

import {
  type ClipRow,
  internalError,
  requireCategory,
  requireClip,
  requireUser,
  validationError,
} from '../lib/authz.js'
import type { ClipboardManagerLimits } from '../tiers.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const clipTypeSchema = z.enum(['text', 'image', 'link', 'code'])

const listSchema = z.object({
  category_id: z.string().uuid().optional(),
  type: clipTypeSchema.optional(),
  is_favorite: z.string().optional(),
})

const searchSchema = z.object({ q: z.string().min(1).max(255) })

const createSchema = z.object({
  content: z.string().max(1_000_000),
  title: z.string().max(1000).optional(),
  category_id: z.string().uuid().nullable().optional(),
  source_app: z.string().max(255).nullable().optional(),
  type: clipTypeSchema.optional(),
  is_sensitive: z.boolean().optional(),
})

const updateSchema = z.object({
  content: z.string().max(1_000_000).optional(),
  title: z.string().max(1000).optional(),
  category_id: z.string().uuid().nullable().optional(),
  source_app: z.string().max(255).nullable().optional(),
  type: clipTypeSchema.optional(),
  is_pinned: z.boolean().optional(),
  is_favorite: z.boolean().optional(),
  is_sensitive: z.boolean().optional(),
})

function detectType(content: string): 'text' | 'image' | 'link' | 'code' {
  const c = content.trim()
  if (/^https?:\/\/\S+$/i.test(c)) return 'link'
  if (/^data:image\//.test(c)) return 'image'
  if (
    /^(import |export |const |let |var |function |class |def |public |<\?|<[a-z]+[\s>]|#include|\{[\s\S]*\}$)/m.test(
      c,
    )
  ) {
    return 'code'
  }
  return 'text'
}

function maskClip(row: ClipRow): Omit<ClipRow, 'encrypted_content'> & { preview: string } {
  const safe = !row.is_sensitive && typeof row.content === 'string' ? row.content : ''
  return {
    id: row.id,
    owner_id: row.owner_id,
    category_id: row.category_id,
    title: row.title,
    content: row.is_sensitive ? null : row.content,
    type: row.type,
    source_app: row.source_app,
    is_pinned: row.is_pinned,
    is_favorite: row.is_favorite,
    is_sensitive: row.is_sensitive,
    created_at: row.created_at,
    updated_at: row.updated_at,
    preview: safe.slice(0, 200),
  }
}

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = listSchema.safeParse(req.query)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const where: Array<{ field: string; operator: '='; value: unknown }> = [
      { field: 'owner_id', operator: '=', value: ownerId },
    ]
    if (parsed.data.category_id) {
      where.push({ field: 'category_id', operator: '=', value: parsed.data.category_id })
    }
    if (parsed.data.type) {
      where.push({ field: 'type', operator: '=', value: parsed.data.type })
    }
    if (parsed.data.is_favorite === 'true') {
      where.push({ field: 'is_favorite', operator: '=', value: true })
    }
    const items = await findMany<ClipRow>('clips', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(items.map(maskClip))
  } catch (err) {
    internalError(res, err)
  }
})

router.get('/search', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = searchSchema.safeParse(req.query)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    let ids: string[] = []
    let useFallback = false
    try {
      const result = await search('clips', { text: parsed.data.q })
      // The search index is shared across users; gate on ownership before
      // returning. Any hit whose id doesn't belong to the caller is dropped.
      ids = result.hits
        .map((h) => (typeof h.id === 'string' ? h.id : null))
        .filter((id): id is string => Boolean(id))
    } catch (_error) {
      // Search bond unavailable (e.g. Meilisearch not running in the test
      // sandbox). Degrade gracefully to a Postgres LIKE on title/content
      // so the endpoint still serves owner-scoped results.
      useFallback = true
    }
    if (useFallback) {
      const term = parsed.data.q
      const owned = await findMany<ClipRow>('clips', {
        where: [
          { field: 'owner_id', operator: '=', value: ownerId },
          { field: 'title', operator: 'ilike', value: term },
        ],
      })
      res.json(owned.map(maskClip))
      return
    }
    if (ids.length === 0) {
      res.json([])
      return
    }
    const owned = await findMany<ClipRow>('clips', {
      where: [
        { field: 'owner_id', operator: '=', value: ownerId },
        { field: 'id', operator: 'in', value: ids },
      ],
    })
    res.json(owned.map(maskClip))
  } catch (err) {
    internalError(res, err)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const clip = await requireClip(id.data.id, ownerId)
    if (!clip) {
      res.status(404).json({ error: t('clip.notFound', {}, { defaultValue: 'Clip not found' }) })
      return
    }
    if (clip.is_sensitive && typeof clip.encrypted_content === 'string') {
      let decrypted: string
      try {
        decrypted = await decrypt(clip.encrypted_content)
      } catch (_error) {
        // decryption failed (e.g. rotated key) — returned to the client as a 500 below
        res.status(500).json({
          error: t(
            'clip.decryptionFailed',
            {},
            {
              defaultValue: 'Failed to decrypt sensitive clip — encryption key may have rotated.',
            },
          ),
        })
        return
      }
      res.json({ ...clip, content: decrypted, encrypted_content: undefined })
      return
    }
    res.json({ ...clip, encrypted_content: undefined })
  } catch (err) {
    internalError(res, err)
  }
})

// Enforce the per-tier clip cap (tiers.ts maxClips) — defined + advertised in CATALOG but enforceLimit
// was never called, so any tier could create unlimited clips.
const enforceClipLimit = enforceLimit<ClipboardManagerLimits>({
  limitType: 'maxClips',
  getLimit: (limits) => limits.maxClips,
  getCurrent: async (userId) =>
    count('clips', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceClipLimit, async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    if (parsed.data.category_id) {
      const cat = await requireCategory(parsed.data.category_id, ownerId)
      if (!cat) {
        res
          .status(404)
          .json({ error: t('category.notFound', {}, { defaultValue: 'Category not found' }) })
        return
      }
    }
    const content = parsed.data.content
    const type = parsed.data.type ?? detectType(content)
    const isSensitive = parsed.data.is_sensitive ?? false
    const data: Record<string, unknown> = {
      title:
        parsed.data.title ??
        (content.slice(0, 100).split('\n')[0] ||
          t('clip.untitled', {}, { defaultValue: 'Untitled' })),
      type,
      source_app: parsed.data.source_app ?? null,
      category_id: parsed.data.category_id ?? null,
      is_pinned: false,
      is_favorite: false,
      is_sensitive: isSensitive,
      owner_id: ownerId,
      created_at: new Date(),
      updated_at: new Date(),
    }
    if (isSensitive) {
      data.encrypted_content = await encrypt(content)
      data.content = null
    } else {
      data.content = content
      data.encrypted_content = null
    }
    const result = await create<ClipRow>('clips', data)
    const created = result.data
    if (created) {
      try {
        if (isSensitive) {
          await index('clips', created.id, { title: created.title, type })
        } else {
          await index('clips', created.id, { title: created.title, content, type })
        }
      } catch (_error) {
        // Search-index failure is non-fatal — the row already lives in Postgres.
      }
    }
    res.status(201).json(created)
  } catch (err) {
    internalError(res, err)
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const existing = await requireClip(id.data.id, ownerId)
    if (!existing) {
      res.status(404).json({ error: t('clip.notFound', {}, { defaultValue: 'Clip not found' }) })
      return
    }
    if (body.data.category_id) {
      const cat = await requireCategory(body.data.category_id, ownerId)
      if (!cat) {
        res
          .status(404)
          .json({ error: t('category.notFound', {}, { defaultValue: 'Category not found' }) })
        return
      }
    }
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.data.title !== undefined) updates.title = body.data.title
    if (body.data.category_id !== undefined) updates.category_id = body.data.category_id
    if (body.data.source_app !== undefined) updates.source_app = body.data.source_app
    if (body.data.is_pinned !== undefined) updates.is_pinned = body.data.is_pinned
    if (body.data.is_favorite !== undefined) updates.is_favorite = body.data.is_favorite

    if (body.data.content !== undefined) {
      const isSensitive = body.data.is_sensitive ?? existing.is_sensitive
      if (isSensitive) {
        updates.encrypted_content = await encrypt(body.data.content)
        updates.content = null
        updates.is_sensitive = true
      } else {
        updates.content = body.data.content
        updates.encrypted_content = null
        updates.is_sensitive = false
      }
      updates.type = body.data.type ?? detectType(body.data.content)
    }

    const result = await updateById<ClipRow>('clips', id.data.id, updates)
    const updated = result.data
    try {
      if (updated && body.data.content !== undefined && !updated.is_sensitive) {
        await index('clips', updated.id, {
          title: updated.title,
          content: body.data.content,
          type: updated.type,
        })
      } else if (updated && updates.title !== undefined) {
        await index('clips', updated.id, { title: updated.title })
      }
    } catch (_error) {
      // Search-index failures are non-fatal.
    }
    res.json(updated)
  } catch (err) {
    internalError(res, err)
  }
})

router.post('/:id/favorite', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const clip = await requireClip(id.data.id, ownerId)
    if (!clip) {
      res.status(404).json({ error: t('clip.notFound', {}, { defaultValue: 'Clip not found' }) })
      return
    }
    const next = !clip.is_favorite
    await updateById<ClipRow>('clips', id.data.id, {
      is_favorite: next,
      updated_at: new Date(),
    })
    res.json({ is_favorite: next })
  } catch (err) {
    internalError(res, err)
  }
})

router.post('/:id/pin', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const clip = await requireClip(id.data.id, ownerId)
    if (!clip) {
      res.status(404).json({ error: t('clip.notFound', {}, { defaultValue: 'Clip not found' }) })
      return
    }
    const next = !clip.is_pinned
    await updateById<ClipRow>('clips', id.data.id, {
      is_pinned: next,
      updated_at: new Date(),
    })
    res.json({ is_pinned: next })
  } catch (err) {
    internalError(res, err)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const clip = await requireClip(id.data.id, ownerId)
    if (!clip) {
      res.status(404).json({ error: t('clip.notFound', {}, { defaultValue: 'Clip not found' }) })
      return
    }
    try {
      await deleteDocument('clips', id.data.id)
    } catch (_error) {
      // The search index may not contain this id (e.g. ephemeral test runs);
      // continue to the DataStore delete regardless.
    }
    await deleteById('clips', id.data.id)
    res.status(204).end()
  } catch (err) {
    internalError(res, err)
  }
})

export default router
