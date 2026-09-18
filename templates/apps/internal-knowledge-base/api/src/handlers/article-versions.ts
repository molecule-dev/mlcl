/**
 * Article-version handlers — read-only history of article edits.
 *
 * Versions are written by the articles handler on each PATCH; this handler
 * just lists them. Read access requires space membership for the article.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findMany } from '@molecule/api-database'

import {
  type ArticleVersionRow,
  internalError,
  requireReadableArticle,
  requireUser,
  validationError,
} from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

router.get('/:id', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const article = await requireReadableArticle(id.data.id, uid)
    if (!article) {
      res.json([])
      return
    }
    const items = await findMany<ArticleVersionRow>('article_versions', {
      where: [{ field: 'article_id', operator: '=', value: id.data.id }],
      orderBy: [{ field: 'edited_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    internalError(res, error)
  }
})

export default router
