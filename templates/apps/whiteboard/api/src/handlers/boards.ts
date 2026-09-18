/**
 * Boards handler — owns the top-level whiteboard CRUD lifecycle.
 *
 * Uses the abstract DataStore (`@molecule/api-database`) for persistence;
 * vendor SDKs never appear here. Ownership is enforced on every read/write —
 * non-owner reads return 404 (not 403) to avoid leaking existence.
 *
 * Authorization rules (per INVENTORY):
 *  - read: owner OR collaborator OR `is_public = true`
 *  - write: owner OR `editor` collaborator
 *  - delete: owner only
 *
 * @module
 */
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import {
  getParamId,
  idParamSchema,
  requireAuth,
  requireUser,
} from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

import type { WhiteboardLimits } from '../tiers.js'

const router = Router()

const createBoardSchema = z.object({
  title: z.string().min(1).max(255).default(''),
  description: z.string().max(2000).default(''),
  background: z.string().max(64).default('#ffffff'),
  is_public: z.boolean().default(false),
  public_slug: z.string().min(1).max(64).optional(),
})

const updateBoardSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  background: z.string().max(64).optional(),
  is_public: z.boolean().optional(),
  public_slug: z.string().min(1).max(64).nullable().optional(),
  trashed_at: z.string().nullable().optional(),
})

interface BoardRow {
  id: string
  owner_id: string
  user_id: string
  title?: string
  description?: string
  background?: string
  is_public?: boolean
  public_slug?: string | null
  trashed_at?: Date | string | null
  created_at?: Date | string
  updated_at?: Date | string
}

interface CollaboratorRow {
  id: string
  board_id: string
  user_id: string | null
  role: string
}

export async function loadBoardForRead(boardId: string, userId: string): Promise<BoardRow | null> {
  const board = await findById<BoardRow>('boards', boardId)
  if (!board) return null
  if (board.owner_id === userId || board.user_id === userId) return board
  if (board.is_public) return board
  const byUserId = await findMany<CollaboratorRow>('board_collaborators', {
    where: [
      { field: 'board_id', operator: '=', value: boardId },
      { field: 'user_id', operator: '=', value: userId },
    ],
  })
  if (byUserId.length > 0) return board
  // Fallback: invited-by-email collaborators whose user_id hasn't been claimed yet.
  const me = await findById<{ id: string; email?: string | null }>('users', userId)
  const email = (me?.email ?? '').trim().toLowerCase()
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

async function loadBoardForWrite(boardId: string, userId: string): Promise<BoardRow | null> {
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
  const me = await findById<{ id: string; email?: string | null }>('users', userId)
  const email = (me?.email ?? '').trim().toLowerCase()
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

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = requireUser(res)
    if (!userId) return
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    const boards = await findMany<BoardRow>('boards', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 500,
    })
    res.json(boards)
  } catch (error) {
    logger.error('boards.list', error)
    res
      .status(500)
      .json({ error: t('boards.listError', undefined, { defaultValue: 'Failed to list boards' }) })
  }
})

router.get('/shared', async (_req: Request, res: Response) => {
  try {
    const userId = requireUser(res)
    if (!userId) return
    // Look up the user's email so we can also match invites that haven't been
    // claimed yet (user_id is null but email matches).
    const me = await findById<{ id: string; email?: string | null }>('users', userId)
    const email = (me?.email ?? '').trim().toLowerCase() || null
    const [byUserId, byEmail] = await Promise.all([
      findMany<CollaboratorRow>('board_collaborators', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      }),
      email
        ? findMany<CollaboratorRow & { email: string | null }>('board_collaborators', {
            where: [{ field: 'email', operator: '=', value: email }],
          })
        : Promise.resolve([]),
    ])
    const ids = Array.from(
      new Set([...byUserId, ...byEmail].map((m) => m.board_id).filter(Boolean)),
    )
    if (ids.length === 0) {
      res.json([])
      return
    }
    const boards = await findMany<BoardRow>('boards', {
      where: [{ field: 'id', operator: 'in', value: ids }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 500,
    })
    res.json(boards)
  } catch (error) {
    logger.error('boards.shared', error)
    res.status(500).json({
      error: t('boards.sharedError', undefined, { defaultValue: 'Failed to list shared boards' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUser(res)
    if (!userId) return
    const id = getParamId(req)
    const board = await loadBoardForRead(id, userId)
    if (!board) {
      res
        .status(404)
        .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
      return
    }
    res.json(board)
  } catch (error) {
    logger.error('boards.read', error)
    res
      .status(500)
      .json({ error: t('boards.readError', undefined, { defaultValue: 'Failed to read board' }) })
  }
})

router.post(
  '/',
  enforceLimit<WhiteboardLimits>({
    limitType: 'maxBoards',
    getLimit: (limits) => limits.maxBoards,
    getCurrent: async (userId) =>
      count('boards', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as never,
  validateBody(createBoardSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUser(res)
      if (!userId) return
      const body = req.body as z.infer<typeof createBoardSchema>
      const result = await create<BoardRow>('boards', {
        owner_id: userId,
        user_id: userId,
        title: body.title || t('boards.untitled', undefined, { defaultValue: 'Untitled Board' }),
        description: body.description,
        background: body.background,
        is_public: body.is_public,
        public_slug: body.public_slug ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('boards.create', error)
      res.status(500).json({
        error: t('boards.createError', undefined, { defaultValue: 'Failed to create board' }),
      })
    }
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateBoardSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUser(res)
      if (!userId) return
      const id = getParamId(req)
      const board = await loadBoardForWrite(id, userId)
      if (!board) {
        res
          .status(404)
          .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
        return
      }
      const body = req.body as z.infer<typeof updateBoardSchema>
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (body.title !== undefined) updates.title = body.title
      if (body.description !== undefined) updates.description = body.description
      if (body.background !== undefined) updates.background = body.background
      if (body.is_public !== undefined) updates.is_public = body.is_public
      if (body.public_slug !== undefined) updates.public_slug = body.public_slug
      if (body.trashed_at !== undefined)
        updates.trashed_at = body.trashed_at ? new Date(body.trashed_at) : null
      const result = await updateById<BoardRow>('boards', id, updates)
      try {
        await broadcast(`board:${id}`, 'board:updated', { id, ...updates })
      } catch (_error) {
        // non-fatal: realtime broadcast failure does not block the response
      }
      res.json(result.data)
    } catch (error) {
      logger.error('boards.update', error)
      res.status(500).json({
        error: t('boards.updateError', undefined, { defaultValue: 'Failed to update board' }),
      })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUser(res)
    if (!userId) return
    const id = getParamId(req)
    const board = await findById<BoardRow>('boards', id)
    if (!board || (board.owner_id !== userId && board.user_id !== userId)) {
      res
        .status(404)
        .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
      return
    }
    await deleteById('boards', id)
    try {
      await broadcast(`board:${id}`, 'board:deleted', { id })
    } catch (_error) {
      // non-fatal: realtime broadcast failure does not block the response
    }
    res.status(204).end()
  } catch (error) {
    logger.error('boards.delete', error)
    res.status(500).json({
      error: t('boards.deleteError', undefined, { defaultValue: 'Failed to delete board' }),
    })
  }
})

router.post(
  '/:id/duplicate',
  validateParams(idParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUser(res)
      if (!userId) return
      const id = getParamId(req)
      const original = await loadBoardForRead(id, userId)
      if (!original) {
        res
          .status(404)
          .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
        return
      }
      const copyTitle = `${original.title ?? 'Untitled Board'} (${t('boards.copy', undefined, { defaultValue: 'Copy' })})`
      const copy = await create<BoardRow>('boards', {
        owner_id: userId,
        user_id: userId,
        title: copyTitle,
        description: original.description ?? '',
        background: original.background ?? '#ffffff',
        is_public: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      const copyId = (copy.data as BoardRow | undefined)?.id
      if (copyId) {
        const elements = await findMany<Record<string, unknown>>('board_elements', {
          where: [{ field: 'board_id', operator: '=', value: id }],
        })
        for (const el of elements) {
          const { id: _omit, ...rest } = el
          await create('board_elements', {
            ...rest,
            board_id: copyId,
            user_id: userId,
            created_by: userId,
          })
        }
      }
      res.status(201).json(copy.data)
    } catch (error) {
      logger.error('boards.duplicate', error)
      res.status(500).json({
        error: t('boards.duplicateError', undefined, { defaultValue: 'Failed to duplicate board' }),
      })
    }
  },
)

export default router
