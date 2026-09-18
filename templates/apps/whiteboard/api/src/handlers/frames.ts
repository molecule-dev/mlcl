/**
 * Board frames handler — saved viewports for Presentation Mode.
 *
 * Authorization derives from the parent board: owner / editor may write;
 * owner / collaborator / public may read.
 *
 * @module
 */
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth, requireUser } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const boardIdParamSchema = z.object({ boardId: z.string().min(1) })
const frameParamSchema = z.object({
  boardId: z.string().min(1),
  frameId: z.string().min(1),
})

const createFrameSchema = z.object({
  name: z.string().min(1).max(255).default(''),
  viewport: z.record(z.string(), z.unknown()).default({}),
  order_index: z.number().int().default(0),
})

const updateFrameSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  viewport: z.record(z.string(), z.unknown()).optional(),
  order_index: z.number().int().optional(),
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

interface FrameRow {
  id: string
  board_id: string
  user_id: string
  name?: string
  viewport?: unknown
  order_index?: number
}

async function userEmail(userId: string): Promise<string | null> {
  const me = await findById<{ id: string; email?: string | null }>('users', userId)
  return (me?.email ?? '').trim().toLowerCase() || null
}

async function authorizeRead(boardId: string, userId: string): Promise<BoardRow | null> {
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

async function authorizeWrite(boardId: string, userId: string): Promise<BoardRow | null> {
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
    const board = await authorizeRead(boardId, userId)
    if (!board) {
      res
        .status(404)
        .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
      return
    }
    const frames = await findMany<FrameRow>('board_frames', {
      where: [{ field: 'board_id', operator: '=', value: boardId }],
      orderBy: [{ field: 'order_index', direction: 'asc' }],
    })
    res.json(frames)
  } catch (error) {
    logger.error('frames.list', error)
    res.status(500).json({
      error: t('frames.listError', undefined, { defaultValue: 'Failed to list frames' }),
    })
  }
})

router.post(
  '/:boardId',
  validateParams(boardIdParamSchema),
  validateBody(createFrameSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUser(res)
      if (!userId) return
      const boardId = String(req.params.boardId)
      const board = await authorizeWrite(boardId, userId)
      if (!board) {
        res
          .status(404)
          .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
        return
      }
      const body = req.body as z.infer<typeof createFrameSchema>
      const result = await create<FrameRow>('board_frames', {
        board_id: boardId,
        user_id: userId,
        name: body.name,
        viewport: JSON.stringify(body.viewport),
        order_index: body.order_index,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('frames.create', error)
      res.status(500).json({
        error: t('frames.createError', undefined, { defaultValue: 'Failed to create frame' }),
      })
    }
  },
)

router.put(
  '/:boardId/:frameId',
  validateParams(frameParamSchema),
  validateBody(updateFrameSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUser(res)
      if (!userId) return
      const boardId = String(req.params.boardId)
      const frameId = String(req.params.frameId)
      const board = await authorizeWrite(boardId, userId)
      if (!board) {
        res
          .status(404)
          .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
        return
      }
      const existing = await findById<FrameRow>('board_frames', frameId)
      if (!existing || existing.board_id !== boardId) {
        res.status(404).json({
          error: t('frames.notFound', undefined, { defaultValue: 'Frame not found' }),
        })
        return
      }
      const body = req.body as z.infer<typeof updateFrameSchema>
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (body.name !== undefined) updates.name = body.name
      if (body.viewport !== undefined) updates.viewport = JSON.stringify(body.viewport)
      if (body.order_index !== undefined) updates.order_index = body.order_index
      const result = await updateById<FrameRow>('board_frames', frameId, updates)
      res.json(result.data)
    } catch (error) {
      logger.error('frames.update', error)
      res.status(500).json({
        error: t('frames.updateError', undefined, { defaultValue: 'Failed to update frame' }),
      })
    }
  },
)

router.delete(
  '/:boardId/:frameId',
  validateParams(frameParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUser(res)
      if (!userId) return
      const boardId = String(req.params.boardId)
      const frameId = String(req.params.frameId)
      const board = await authorizeWrite(boardId, userId)
      if (!board) {
        res
          .status(404)
          .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
        return
      }
      const existing = await findById<FrameRow>('board_frames', frameId)
      if (!existing || existing.board_id !== boardId) {
        res.status(404).json({
          error: t('frames.notFound', undefined, { defaultValue: 'Frame not found' }),
        })
        return
      }
      await deleteById('board_frames', frameId)
      res.status(204).end()
    } catch (error) {
      logger.error('frames.delete', error)
      res.status(500).json({
        error: t('frames.deleteError', undefined, { defaultValue: 'Failed to delete frame' }),
      })
    }
  },
)

export default router
