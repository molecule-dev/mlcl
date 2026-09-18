/**
 * Chat-message handlers — scoped to a room.
 *
 * Read access requires room-membership (host or active participant).
 * Send requires room-membership AND `user_id` of the request must match
 * `session.userId` — IDOR-protected.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { internalError, requireRoomMember, requireUser, validationError } from '../lib/authz.js'
import { safeBroadcast } from '../lib/safe-realtime.js'

const router = Router()

const roomIdParam = z.object({ roomId: z.string().uuid() })

const createSchema = z.object({
  room_id: z.string().uuid(),
  content: z.string().min(1).max(4000),
  type: z.enum(['text', 'emoji', 'file']).optional(),
})

router.get('/room/:roomId', async (req: Request, res: Response) => {
  const memberId = requireUser(res)
  if (!memberId) return
  const parsed = roomIdParam.safeParse(req.params)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const room = await requireRoomMember(parsed.data.roomId, memberId)
    if (!room) {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    const messages = await findMany('chat_messages', {
      where: [{ field: 'room_id', operator: '=', value: parsed.data.roomId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
      limit: 500,
    })
    res.json(messages)
  } catch (error) {
    logger.error('chat.list', error)
    internalError(res)
  }
})

router.post('/', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const room = await requireRoomMember(parsed.data.room_id, userId)
    if (!room) {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    const result = await create('chat_messages', {
      room_id: parsed.data.room_id,
      user_id: userId,
      content: parsed.data.content,
      type: parsed.data.type ?? 'text',
      created_at: new Date(),
    })
    await safeBroadcast(`room:${parsed.data.room_id}`, 'new-message', result.data)
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('chat.send', error)
    internalError(res)
  }
})

export default router
