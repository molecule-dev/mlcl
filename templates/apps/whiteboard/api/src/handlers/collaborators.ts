/**
 * Board collaborators handler — owns the per-board collaborator CRUD lifecycle
 * plus invite-by-email via `@molecule/api-emails`.
 *
 * Authorization: only the board owner may add/remove collaborators or change
 * their roles. Collaborator listings are visible to anyone with read access.
 *
 * @module
 */
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth, requireUser } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import type { WhiteboardLimits } from '../tiers.js'

const router = Router()

const boardIdParamSchema = z.object({ boardId: z.string().min(1) })
const boardCollabParamSchema = z.object({
  boardId: z.string().min(1),
  collaboratorId: z.string().min(1),
})

const role = z.enum(['viewer', 'commenter', 'editor'])

const inviteSchema = z.object({
  email: z.string().email().optional(),
  user_id: z.string().min(1).optional(),
  role: role.default('viewer'),
  board_title: z.string().max(255).optional(),
  from_email: z.string().email().optional(),
})

const updateRoleSchema = z.object({ role })

interface BoardRow {
  id: string
  owner_id: string
  user_id: string
  title?: string
  is_public?: boolean
}

interface CollaboratorRow {
  id: string
  board_id: string
  user_id: string | null
  email: string | null
  role: string
}

async function loadBoardOwned(boardId: string, userId: string): Promise<BoardRow | null> {
  const board = await findById<BoardRow>('boards', boardId)
  if (!board) return null
  if (board.owner_id !== userId && board.user_id !== userId) return null
  return board
}

async function loadBoardForRead(boardId: string, userId: string): Promise<BoardRow | null> {
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

router.use(requireAuth)

router.get('/:boardId', validateParams(boardIdParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUser(res)
    if (!userId) return
    const boardId = String(req.params.boardId)
    const board = await loadBoardForRead(boardId, userId)
    if (!board) {
      res
        .status(404)
        .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
      return
    }
    const collaborators = await findMany<CollaboratorRow>('board_collaborators', {
      where: [{ field: 'board_id', operator: '=', value: boardId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(collaborators)
  } catch (error) {
    logger.error('collaborators.list', error)
    res.status(500).json({
      error: t('collaborators.listError', undefined, {
        defaultValue: 'Failed to list collaborators',
      }),
    })
  }
})

router.post(
  '/:boardId',
  validateParams(boardIdParamSchema),
  enforceLimit<WhiteboardLimits>({
    limitType: 'maxCollaborators',
    getLimit: (limits) => limits.maxCollaborators,
    getCurrent: async (userId) =>
      count('board_collaborators', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as never,
  validateBody(inviteSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUser(res)
      if (!userId) return
      const boardId = String(req.params.boardId)
      const board = await loadBoardOwned(boardId, userId)
      if (!board) {
        res
          .status(404)
          .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
        return
      }
      const body = req.body as z.infer<typeof inviteSchema>
      if (!body.email && !body.user_id) {
        res.status(400).json({
          error: t('collaborators.recipientRequired', undefined, {
            defaultValue: 'email or user_id is required',
          }),
        })
        return
      }
      const result = await create<CollaboratorRow>('board_collaborators', {
        board_id: boardId,
        user_id: body.user_id ?? null,
        email: body.email ?? null,
        role: body.role,
        accepted_at: body.user_id ? new Date() : null,
        created_at: new Date(),
        updated_at: new Date(),
      })

      if (body.email) {
        try {
          await sendMail({
            to: body.email,
            from: body.from_email ?? 'noreply@whiteboard.local',
            subject: t('collaborators.inviteSubject', undefined, {
              defaultValue: 'You have been invited to a whiteboard',
            }),
            text: t(
              'collaborators.inviteBody',
              { title: body.board_title ?? board.title ?? '' },
              { defaultValue: 'Join the whiteboard: {{title}}' },
            ),
          })
        } catch (_error) {
          // non-fatal: invite row was created; email delivery failure is tolerated
        }
      }

      res.status(201).json(result.data)
    } catch (error) {
      logger.error('collaborators.invite', error)
      res.status(500).json({
        error: t('collaborators.inviteError', undefined, {
          defaultValue: 'Failed to invite collaborator',
        }),
      })
    }
  },
)

router.put(
  '/:boardId/:collaboratorId',
  validateParams(boardCollabParamSchema),
  validateBody(updateRoleSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUser(res)
      if (!userId) return
      const boardId = String(req.params.boardId)
      const collaboratorId = String(req.params.collaboratorId)
      const board = await loadBoardOwned(boardId, userId)
      if (!board) {
        res
          .status(404)
          .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
        return
      }
      const existing = await findById<CollaboratorRow>('board_collaborators', collaboratorId)
      if (!existing || existing.board_id !== boardId) {
        res.status(404).json({
          error: t('collaborators.notFound', undefined, {
            defaultValue: 'Collaborator not found',
          }),
        })
        return
      }
      const body = req.body as z.infer<typeof updateRoleSchema>
      const result = await updateById<CollaboratorRow>('board_collaborators', collaboratorId, {
        role: body.role,
        updated_at: new Date(),
      })
      res.json(result.data)
    } catch (error) {
      logger.error('collaborators.update', error)
      res.status(500).json({
        error: t('collaborators.updateError', undefined, {
          defaultValue: 'Failed to update collaborator',
        }),
      })
    }
  },
)

router.delete(
  '/:boardId/:collaboratorId',
  validateParams(boardCollabParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUser(res)
      if (!userId) return
      const boardId = String(req.params.boardId)
      const collaboratorId = String(req.params.collaboratorId)
      const board = await loadBoardOwned(boardId, userId)
      if (!board) {
        res
          .status(404)
          .json({ error: t('boards.notFound', undefined, { defaultValue: 'Board not found' }) })
        return
      }
      const existing = await findById<CollaboratorRow>('board_collaborators', collaboratorId)
      if (!existing || existing.board_id !== boardId) {
        res.status(404).json({
          error: t('collaborators.notFound', undefined, {
            defaultValue: 'Collaborator not found',
          }),
        })
        return
      }
      await deleteById('board_collaborators', collaboratorId)
      res.status(204).end()
    } catch (error) {
      logger.error('collaborators.delete', error)
      res.status(500).json({
        error: t('collaborators.deleteError', undefined, {
          defaultValue: 'Failed to delete collaborator',
        }),
      })
    }
  },
)

export default router
