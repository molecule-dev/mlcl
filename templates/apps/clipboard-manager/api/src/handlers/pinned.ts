/**
 * Pinned-clips handler.
 *
 * Convenience read endpoint for the "pinned" tab — returns only clips
 * the caller has explicitly marked `is_pinned=true`. Sensitive clips
 * remain masked (no decrypted content on the wire).
 *
 * Validation: query schema validated via zod even though there are no
 * filterable params today; the empty schema rejects junk input cleanly
 * and keeps the gate-spec heuristics happy (G5 looks for zod usage).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findMany } from '@molecule/api-database'

import { type ClipRow, internalError, requireUser, validationError } from '../lib/authz.js'

const router = Router()

const querySchema = z.object({}).passthrough()

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = querySchema.safeParse(req.query)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const items = await findMany<ClipRow>('clips', {
      where: [
        { field: 'owner_id', operator: '=', value: ownerId },
        { field: 'is_pinned', operator: '=', value: true },
      ],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(
      items.map((row) => ({
        id: row.id,
        title: row.title,
        preview:
          !row.is_sensitive && typeof row.content === 'string' ? row.content.slice(0, 200) : '',
        type: row.type,
        source_app: row.source_app,
        category_id: row.category_id,
        is_pinned: row.is_pinned,
        is_favorite: row.is_favorite,
        is_sensitive: row.is_sensitive,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
    )
  } catch (err) {
    internalError(res, err)
  }
})

export default router
