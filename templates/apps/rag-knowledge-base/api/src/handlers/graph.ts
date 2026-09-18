import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createEdgeSchema = z.object({
  from_doc_id: z.string(),
  to_doc_id: z.string(),
  weight: z.number().optional(),
  kind: z.string(),
})

router.get('/nodes', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }
  const result = await query<{
    id: string
    title: string
    collection_name: string | null
    citation_count: string
  }>(
    `SELECT d.id,
            d.title,
            c.name AS collection_name,
            COALESCE((
              SELECT COUNT(*)
              FROM qa_entries qe,
                   jsonb_array_elements(qe.citations_json) cit
              WHERE qe.user_id = d.user_id
                AND cit->>'document_id' = d.id::text
            ), 0)::text AS citation_count
       FROM documents d
       LEFT JOIN collections c ON c.id = d.collection_id
       WHERE d.user_id = $1
       ORDER BY d.created_at ASC`,
    [userId],
  )
  const cx = 400
  const cy = 250
  const total = result.rows.length || 1
  const golden = Math.PI * (3 - Math.sqrt(5))
  const nodes = result.rows.map((row, i) => {
    const ti = (i + 0.5) / total
    const radius = 30 + Math.sqrt(ti) * 220
    const angle = i * golden
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    const degree = Number(row.citation_count) || 0
    const r = Math.min(28, 8 + Math.sqrt(degree) * 3)
    return {
      id: row.id,
      label: row.title,
      cluster: (row.collection_name || 'general').toLowerCase(),
      degree,
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
      r: Number(r.toFixed(1)),
    }
  })
  res.json(nodes)
})

router.get('/edges', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const rows = await findMany('graph_edges', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'weight', direction: 'desc' }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('graph.edges.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/edges', validateBody(createEdgeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const body = req.body as z.infer<typeof createEdgeSchema>
    const result = await create('graph_edges', {
      user_id: userId,
      from_doc_id: body.from_doc_id,
      to_doc_id: body.to_doc_id,
      weight: body.weight ?? 0,
      kind: body.kind,
      created_at: new Date(),
    })
    res.status(201).json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('graph.edges.create', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.delete('/edges/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('graph_edges', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('graph.notFound', undefined, { defaultValue: 'Graph edge not found.' }),
      })
    }
    await deleteById('graph_edges', id)
    res.status(204).end()
  } catch (error) {
    logger.error('graph.edges.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
