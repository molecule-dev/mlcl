/**
 * Recording handlers — saved video assets per room.
 *
 * Read access requires room-membership; create requires room-host. The
 * actual file upload streams through `@molecule/api-uploads-s3` (the S3
 * bond is wired in bonds/uploads-s3.ts); this handler just records the
 * resulting `file_url`.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  internalError,
  requireOwnedRoom,
  requireRoomMember,
  requireUser,
  type RoomRow,
  validationError,
} from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })
const roomIdParam = z.object({ roomId: z.string().uuid() })

const createSchema = z.object({
  room_id: z.string().uuid(),
  file_url: z.string().url(),
  duration_seconds: z.number().int().nonnegative(),
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
      res.status(404).json({
        error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }),
      })
      return
    }
    const recordings = await findMany('recordings', {
      where: [{ field: 'room_id', operator: '=', value: parsed.data.roomId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(recordings)
  } catch (error) {
    logger.error('recordings.listByRoom', error)
    internalError(res)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const memberId = requireUser(res)
  if (!memberId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const recording = await findOne<{ id: string; room_id: string }>('recordings', [
      { field: 'id', operator: '=', value: id.data.id },
    ])
    if (!recording) {
      res.status(404).json({
        error: t('recordings.notFound', {}, { defaultValue: 'Recording not found' }),
      })
      return
    }
    // IDOR guard — must be a member of the parent room.
    const room = await requireRoomMember(recording.room_id, memberId)
    if (!room) {
      res.status(404).json({
        error: t('recordings.notFound', {}, { defaultValue: 'Recording not found' }),
      })
      return
    }
    res.json(recording)
  } catch (error) {
    logger.error('recordings.get', error)
    internalError(res)
  }
})

router.post('/', async (req: Request, res: Response) => {
  const hostId = requireUser(res)
  if (!hostId) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const room = await requireOwnedRoom(parsed.data.room_id, hostId)
    if (!room) {
      res.status(404).json({
        error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }),
      })
      return
    }
    void (room satisfies RoomRow)
    const result = await create('recordings', {
      room_id: parsed.data.room_id,
      file_url: parsed.data.file_url,
      duration_seconds: parsed.data.duration_seconds,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('recordings.create', error)
    internalError(res)
  }
})

export default router
