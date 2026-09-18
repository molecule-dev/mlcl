/**
 * Board elements handler — owns the per-element CRUD lifecycle on a board.
 *
 * Authorization derives from the parent board: owner / editor collaborator
 * may write; owner / collaborator / public board may read. Non-authorized
 * access returns 404 (not 403).
 *
 * Real-time broadcasts on insert/update/delete via `@molecule/api-realtime`.
 *
 * @module
 */
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth, requireUser } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

import type { WhiteboardLimits } from '../tiers.js'

const router = Router()

const elementType = z.enum(['shape', 'sticky', 'text', 'image', 'connector', 'freehand', 'group'])

const createElementSchema = z.object({
  type: elementType.default('shape'),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().min(0).default(100),
  height: z.number().min(0).default(100),
  rotation: z.number().default(0),
  z_index: z.number().int().default(0),
  content: z.record(z.string(), z.unknown()).default({}),
  parent_id: z.string().min(1).optional(),
})

const updateElementSchema = z.object({
  type: elementType.optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  rotation: z.number().optional(),
  z_index: z.number().int().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  parent_id: z.string().min(1).nullable().optional(),
})

const boardIdParamSchema = z.object({ boardId: z.string().min(1) })
const boardElementParamSchema = z.object({
  boardId: z.string().min(1),
  elementId: z.string().min(1),
})

interface BoardRow {
  id: string
  owner_id: string
  user_id: string
  is_public?: boolean
}

interface CollaboratorRow {
  board_id: string
  user_id: string | null
  role: string
}

interface ElementRow {
  id: string
  board_id: string
  user_id: string
  created_by: string
  type?: string
  content?: unknown
}

async function userEmail(userId: string): Promise<string | null> {
  const me = await findById<{ id: string; email?: string | null }>('users', userId)
  return (me?.email ?? '').trim().toLowerCase() || null
}

async function authorizeBoardRead(boardId: string, userId: string): Promise<BoardRow | null> {
  const board = await findById<BoardRow>('boards', boardId)
  if (!board) return null
  if (board.owner_id === userId || board.user_id === userId) return board
  if (board.is_public) return board
  const memberships = await findMany<CollaboratorRow>('board_collaborators', {
    where: [
      { field: 'board_id', operator: '=', value: boardId },
      { field: 'user_id', operator: '=', value: userId },
    ],
  })
  if (memberships.length > 0) return board
  const email = await userEmail(userId)
  if (!email) return null
  const byEmail = await findMany<CollaboratorRow & { email: string | null }>(
    'board_collaborators',
    {
      where: [
        { field: 'board_id', operator: '=', value: boardId },
        { field: 'email', operator: '=', value: email },
      ],
    },
  )
  return byEmail.length > 0 ? board : null
}

async function authorizeBoardWrite(boardId: string, userId: string): Promise<BoardRow | null> {
  const board = await findById<BoardRow>('boards', boardId)
  if (!board) return null
  if (board.owner_id === userId || board.user_id === userId) return board
  const editors = await findMany<CollaboratorRow>('board_collaborators', {
    where: [
      { field: 'board_id', operator: '=', value: boardId },
      { field: 'user_id', operator: '=', value: userId },
      { field: 'role', operator: '=', value: 'editor' },
    ],
  })
  if (editors.length > 0) return board
  const email = await userEmail(userId)
  if (!email) return null
  const byEmail = await findMany<CollaboratorRow & { email: string | null }>(
    'board_collaborators',
    {
      where: [
        { field: 'board_id', operator: '=', value: boardId },
        { field: 'email', operator: '=', value: email },
        { field: 'role', operator: '=', value: 'editor' },
      ],
    },
  )
  return byEmail.length > 0 ? board : null
}

router.use(requireAuth)

router.get('/:boardId', validateParams(boardIdParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUser(res)
    if (!userId) return
    const boardId = String(req.params.boardId)
    const board = await authorizeBoardRead(boardId, userId)
    if (!board) {
      res
        .status(404)
        .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
      return
    }
    const elements = await findMany<ElementRow>('board_elements', {
      where: [{ field: 'board_id', operator: '=', value: boardId }],
      orderBy: [{ field: 'z_index', direction: 'asc' }],
      limit: 5000,
    })
    res.json(elements)
  } catch (error) {
    logger.error('elements.list', error)
    res.status(500).json({
      error: t('elements.listError', undefined, { defaultValue: 'Failed to list elements' }),
    })
  }
})

router.post(
  '/:boardId',
  validateParams(boardIdParamSchema),
  enforceLimit<WhiteboardLimits>({
    limitType: 'maxElements',
    getLimit: (limits) => limits.maxElements,
    getCurrent: async (userId) =>
      count('board_elements', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as never,
  validateBody(createElementSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUser(res)
      if (!userId) return
      const boardId = String(req.params.boardId)
      const board = await authorizeBoardWrite(boardId, userId)
      if (!board) {
        res
          .status(404)
          .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
        return
      }
      const body = req.body as z.infer<typeof createElementSchema>
      const result = await create<ElementRow>('board_elements', {
        board_id: boardId,
        user_id: userId,
        created_by: userId,
        type: body.type,
        x: body.x,
        y: body.y,
        width: body.width,
        height: body.height,
        rotation: body.rotation,
        z_index: body.z_index,
        content: JSON.stringify(body.content),
        parent_id: body.parent_id ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      try {
        await broadcast(`board:${boardId}`, 'element:created', {
          ...(result.data ?? {}),
          board_id: boardId,
        })
      } catch (_error) {
        // non-fatal: realtime broadcast failure does not block the response
      }
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('elements.create', error)
      res.status(500).json({
        error: t('elements.createError', undefined, { defaultValue: 'Failed to create element' }),
      })
    }
  },
)

router.put(
  '/:boardId/:elementId',
  validateParams(boardElementParamSchema),
  validateBody(updateElementSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUser(res)
      if (!userId) return
      const boardId = String(req.params.boardId)
      const elementId = String(req.params.elementId)
      const board = await authorizeBoardWrite(boardId, userId)
      if (!board) {
        res
          .status(404)
          .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
        return
      }
      const existing = await findById<ElementRow>('board_elements', elementId)
      if (!existing || existing.board_id !== boardId) {
        res.status(404).json({
          error: t('elements.notFound', undefined, { defaultValue: 'Element not found' }),
        })
        return
      }
      const body = req.body as z.infer<typeof updateElementSchema>
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (body.type !== undefined) updates.type = body.type
      if (body.x !== undefined) updates.x = body.x
      if (body.y !== undefined) updates.y = body.y
      if (body.width !== undefined) updates.width = body.width
      if (body.height !== undefined) updates.height = body.height
      if (body.rotation !== undefined) updates.rotation = body.rotation
      if (body.z_index !== undefined) updates.z_index = body.z_index
      if (body.content !== undefined) updates.content = JSON.stringify(body.content)
      if (body.parent_id !== undefined) updates.parent_id = body.parent_id
      const result = await updateById<ElementRow>('board_elements', elementId, updates)
      try {
        await broadcast(`board:${boardId}`, 'element:updated', {
          ...(result.data ?? {}),
          board_id: boardId,
        })
      } catch (_error) {
        // non-fatal: realtime broadcast failure does not block the response
      }
      res.json(result.data)
    } catch (error) {
      logger.error('elements.update', error)
      res.status(500).json({
        error: t('elements.updateError', undefined, { defaultValue: 'Failed to update element' }),
      })
    }
  },
)

router.delete(
  '/:boardId/:elementId',
  validateParams(boardElementParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUser(res)
      if (!userId) return
      const boardId = String(req.params.boardId)
      const elementId = String(req.params.elementId)
      const board = await authorizeBoardWrite(boardId, userId)
      if (!board) {
        res
          .status(404)
          .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
        return
      }
      const existing = await findById<ElementRow>('board_elements', elementId)
      if (!existing || existing.board_id !== boardId) {
        res.status(404).json({
          error: t('elements.notFound', undefined, { defaultValue: 'Element not found' }),
        })
        return
      }
      await deleteById('board_elements', elementId)
      try {
        await broadcast(`board:${boardId}`, 'element:deleted', { id: elementId, board_id: boardId })
      } catch (_error) {
        // non-fatal: realtime broadcast failure does not block the response
      }
      res.status(204).end()
    } catch (error) {
      logger.error('elements.delete', error)
      res.status(500).json({
        error: t('elements.deleteError', undefined, { defaultValue: 'Failed to delete element' }),
      })
    }
  },
)

export default router
