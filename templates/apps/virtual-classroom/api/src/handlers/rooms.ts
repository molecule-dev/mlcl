/**
 * Room handlers — live class sessions.
 *
 * - GET /         lists rooms hosted by the authenticated user.
 * - GET /:id      a participant or the host can read.
 * - POST /        creates a room owned by the authenticated user.
 * - POST /:id/join     active participant insert + counter bump.
 * - POST /:id/leave    soft-leave (sets `left_at`).
 * - POST /:id/start    host-only.
 * - POST /:id/end      host-only.
 * - POST /:id/breakout-rooms host-only.
 * - GET  /by-code/:code  participant or host can fetch (used by Join dialog).
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { count, create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  deriveRoomJoinRole,
  generateJoinCode,
  internalError,
  requireOwnedCourse,
  requireOwnedRoom,
  requireRoomMember,
  requireUser,
  type RoomParticipantRow,
  type RoomRow,
  validationError,
} from '../lib/authz.js'
import { safeBroadcast } from '../lib/safe-realtime.js'
import type { VirtualClassroomLimits } from '../tiers.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const codeParam = z.object({ code: z.string().min(4).max(16) })

const createSchema = z.object({
  course_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255).optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
})

// NOTE: `role` is intentionally NOT accepted from the client. A participant's
// role is derived server-side (see `deriveRoomJoinRole`) from room ownership or
// an authoritative course enrollment — accepting it from the body let a student
// self-assign `instructor`/`ta` and gain whiteboard write/clear access.
const joinSchema = z.object({}).strip()

const breakoutSchema = z.object({
  room_count: z.number().int().min(1).max(20),
})

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    // Hosts see their own rooms only. Students reach rooms via course/join-code,
    // not via this listing.
    const status = typeof req.query.status === 'string' ? req.query.status : null
    const where: { field: string; operator: '='; value: string }[] = [
      { field: 'host_id', operator: '=', value: ownerId },
    ]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    const rooms = await findMany<RoomRow>('rooms', { where })
    res.json(rooms)
  } catch (error) {
    logger.error('rooms.list', error)
    internalError(res)
  }
})

router.get('/by-code/:code', async (req: Request, res: Response) => {
  const memberId = requireUser(res)
  if (!memberId) return
  const parsed = codeParam.safeParse(req.params)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const room = await findOne<RoomRow>('rooms', [
      { field: 'join_code', operator: '=', value: parsed.data.code.toUpperCase() },
    ])
    if (!room) {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    res.json(room)
  } catch (error) {
    logger.error('rooms.getByCode', error)
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
    const room = await requireRoomMember(id.data.id, memberId)
    if (!room) {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    res.json(room)
  } catch (error) {
    logger.error('rooms.get', error)
    internalError(res)
  }
})

// Enforce the per-tier room cap (tiers.ts maxRooms) — defined + advertised in Pricing/CATALOG but
// enforceLimit was never called, so any tier could create unlimited rooms. Rooms are owned by
// host_id. (maxRecordings has no owner column — recordings key off room_id, a transitive count the
// simple count() can't express; maxChat is per-message telemetry; maxWhiteboard is auto-created
// one-per-room — none map to a clean per-user entity cap, so only maxRooms is enforced here.)
const enforceRoomLimit = enforceLimit<VirtualClassroomLimits>({
  limitType: 'maxRooms',
  getLimit: (limits) => limits.maxRooms,
  getCurrent: async (userId) =>
    count('rooms', [{ field: 'host_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceRoomLimit, async (req: Request, res: Response) => {
  const hostId = requireUser(res)
  if (!hostId) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    if (parsed.data.course_id) {
      const owned = await requireOwnedCourse(parsed.data.course_id, hostId)
      if (!owned) {
        res.status(404).json({
          error: t('course.notFound', {}, { defaultValue: 'Course not found' }),
        })
        return
      }
    }
    const result = await create<RoomRow>('rooms', {
      course_id: parsed.data.course_id ?? null,
      host_id: hostId,
      name: parsed.data.name ?? t('rooms.defaultName', {}, { defaultValue: 'Live Class' }),
      join_code: generateJoinCode(),
      status: 'waiting',
      participant_count: 0,
      scheduled_at: parsed.data.scheduled_at ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('rooms.create', error)
    internalError(res)
  }
})

router.post('/:id/join', async (req: Request, res: Response) => {
  const userIdParam = requireUser(res)
  if (!userIdParam) return
  const id = idParam.safeParse(req.params)
  const body = joinSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const room = await findOne<RoomRow>('rooms', [
      { field: 'id', operator: '=', value: id.data.id },
    ])
    if (!room || room.status === 'ended') {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    // Re-join? Reactivate the existing participant row instead of duplicating.
    const existing = await findOne<RoomParticipantRow>('room_participants', [
      { field: 'room_id', operator: '=', value: id.data.id },
      { field: 'user_id', operator: '=', value: userIdParam },
    ])
    let participant: RoomParticipantRow | null
    if (existing) {
      const result = await updateById<RoomParticipantRow>('room_participants', existing.id, {
        left_at: null,
        joined_at: new Date(),
      })
      participant = result.data
    } else {
      const result = await create<RoomParticipantRow>('room_participants', {
        room_id: id.data.id,
        user_id: userIdParam,
        role: await deriveRoomJoinRole(room, userIdParam),
        joined_at: new Date(),
        left_at: null,
      })
      participant = result.data
    }
    await updateById<RoomRow>('rooms', id.data.id, {
      participant_count: room.participant_count + 1,
      updated_at: new Date(),
    })
    await safeBroadcast(`room:${id.data.id}`, 'participant-joined', participant)
    res.status(201).json(participant)
  } catch (error) {
    logger.error('rooms.join', error)
    internalError(res)
  }
})

router.post('/:id/leave', async (req: Request, res: Response) => {
  const userIdParam = requireUser(res)
  if (!userIdParam) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const room = await findOne<RoomRow>('rooms', [
      { field: 'id', operator: '=', value: id.data.id },
    ])
    if (!room) {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    const participant = await findOne<RoomParticipantRow>('room_participants', [
      { field: 'room_id', operator: '=', value: id.data.id },
      { field: 'user_id', operator: '=', value: userIdParam },
      { field: 'left_at', operator: 'is_null' },
    ])
    if (participant) {
      await updateById<RoomParticipantRow>('room_participants', participant.id, {
        left_at: new Date(),
      })
      await updateById<RoomRow>('rooms', id.data.id, {
        participant_count: Math.max(0, room.participant_count - 1),
        updated_at: new Date(),
      })
    }
    await safeBroadcast(`room:${id.data.id}`, 'participant-left', { user_id: userIdParam })
    res.json({ success: true })
  } catch (error) {
    logger.error('rooms.leave', error)
    internalError(res)
  }
})

router.post('/:id/start', async (req: Request, res: Response) => {
  const hostId = requireUser(res)
  if (!hostId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const room = await requireOwnedRoom(id.data.id, hostId)
    if (!room) {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    const result = await updateById<RoomRow>('rooms', id.data.id, {
      status: 'active',
      started_at: new Date(),
      updated_at: new Date(),
    })
    await safeBroadcast(`room:${id.data.id}`, 'room-started', result.data)
    res.json(result.data)
  } catch (error) {
    logger.error('rooms.start', error)
    internalError(res)
  }
})

router.post('/:id/end', async (req: Request, res: Response) => {
  const hostId = requireUser(res)
  if (!hostId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const room = await requireOwnedRoom(id.data.id, hostId)
    if (!room) {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    const result = await updateById<RoomRow>('rooms', id.data.id, {
      status: 'ended',
      ended_at: new Date(),
      updated_at: new Date(),
    })
    await safeBroadcast(`room:${id.data.id}`, 'room-ended', result.data)
    res.json(result.data)
  } catch (error) {
    logger.error('rooms.end', error)
    internalError(res)
  }
})

router.post('/:id/breakout-rooms', async (req: Request, res: Response) => {
  const hostId = requireUser(res)
  if (!hostId) return
  const id = idParam.safeParse(req.params)
  const body = breakoutSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const room = await requireOwnedRoom(id.data.id, hostId)
    if (!room) {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    const breakouts: unknown[] = []
    const baseLabel = t('rooms.breakoutRoom', {}, { defaultValue: 'Breakout Room' })
    for (let i = 0; i < body.data.room_count; i++) {
      const created = await create('breakout_rooms', {
        parent_room_id: id.data.id,
        name: `${baseLabel} ${i + 1}`,
        status: 'active',
        created_at: new Date(),
      })
      breakouts.push(created.data)
    }
    await safeBroadcast(`room:${id.data.id}`, 'breakout-rooms-created', breakouts)
    res.status(201).json(breakouts)
  } catch (error) {
    logger.error('rooms.breakout', error)
    internalError(res)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const hostId = requireUser(res)
  if (!hostId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const room = await requireOwnedRoom(id.data.id, hostId)
    if (!room) {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    await deleteById('rooms', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('rooms.delete', error)
    internalError(res)
  }
})

export default router
