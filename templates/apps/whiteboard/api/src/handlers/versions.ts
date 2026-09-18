/**
 * Board versions handler — append-only snapshot history with restore.
 *
 * Authorization derives from the parent board: owner / editor may write
 * (create snapshots, restore); owner / collaborator / public may read.
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
const versionParamSchema = z.object({
  boardId: z.string().min(1),
  versionId: z.string().min(1),
})

const createVersionSchema = z.object({
  snapshot: z.record(z.string(), z.unknown()).default({}),
  change_summary: z.string().max(1000).default(''),
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

interface VersionRow {
  id: string
  board_id: string
  user_id: string
  snapshot: unknown
  change_summary?: string
  created_by?: string
  created_at?: Date | string
}

interface ElementRow {
  id: string
  board_id: string
  user_id: string
  created_by: string
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
    const versions = await findMany<VersionRow>('board_versions', {
      where: [{ field: 'board_id', operator: '=', value: boardId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(versions)
  } catch (error) {
    logger.error('versions.list', error)
    res.status(500).json({
      error: t('versions.listError', undefined, { defaultValue: 'Failed to list versions' }),
    })
  }
})

router.post(
  '/:boardId',
  validateParams(boardIdParamSchema),
  validateBody(createVersionSchema),
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
      const body = req.body as z.infer<typeof createVersionSchema>
      const result = await create<VersionRow>('board_versions', {
        board_id: boardId,
        user_id: userId,
        snapshot: JSON.stringify(body.snapshot),
        change_summary: body.change_summary,
        created_by: userId,
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('versions.create', error)
      res.status(500).json({
        error: t('versions.createError', undefined, {
          defaultValue: 'Failed to create version',
        }),
      })
    }
  },
)

router.post(
  '/:boardId/:versionId/restore',
  validateParams(versionParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUser(res)
      if (!userId) return
      const boardId = String(req.params.boardId)
      const versionId = String(req.params.versionId)
      const board = await authorizeWrite(boardId, userId)
      if (!board) {
        res
          .status(404)
          .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
        return
      }
      const version = await findById<VersionRow>('board_versions', versionId)
      if (!version || version.board_id !== boardId) {
        res.status(404).json({
          error: t('versions.notFound', undefined, { defaultValue: 'Version not found' }),
        })
        return
      }
      const snapshot =
        typeof version.snapshot === 'string'
          ? (JSON.parse(version.snapshot) as { elements?: ElementRow[] })
          : (version.snapshot as { elements?: ElementRow[] })

      const existing = await findMany<ElementRow>('board_elements', {
        where: [{ field: 'board_id', operator: '=', value: boardId }],
      })
      for (const el of existing) {
        await deleteById('board_elements', el.id)
      }
      for (const el of snapshot.elements ?? []) {
        const { id: _omit, ...rest } = el
        await create('board_elements', {
          ...rest,
          board_id: boardId,
          user_id: userId,
          created_by: userId,
        })
      }
      await updateById('boards', boardId, { updated_at: new Date() })
      res.json({ restored: true, version_id: versionId })
    } catch (error) {
      logger.error('versions.restore', error)
      res.status(500).json({
        error: t('versions.restoreError', undefined, {
          defaultValue: 'Failed to restore version',
        }),
      })
    }
  },
)

export default router
