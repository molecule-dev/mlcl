/**
 * Whiteboard handlers — single canvas per room.
 *
 * Read access requires room-membership. Writes (stroke draw + clear) require
 * either the room host OR an active participant whose role is `instructor`
 * or `ta`. Plain students cannot draw — students read only.
 */

import crypto from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  internalError,
  requireRoomMember,
  requireUser,
  type RoomParticipantRow,
  validationError,
} from '../lib/authz.js'
import { safeBroadcast } from '../lib/safe-realtime.js'

const router = Router()

const roomIdParam = z.object({ roomId: z.string().uuid() })

const strokeSchema = z.object({
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(1),
  color: z.string().max(32).optional(),
  width: z.number().positive().max(64).optional(),
})

async function canDraw(roomId: string, userId: string, hostId: string): Promise<boolean> {
  if (hostId === userId) return true
  const participant = await findOne<RoomParticipantRow>('room_participants', [
    { field: 'room_id', operator: '=', value: roomId },
    { field: 'user_id', operator: '=', value: userId },
    { field: 'left_at', operator: 'is_null' },
  ])
  if (!participant) return false
  return participant.role === 'instructor' || participant.role === 'ta'
}

router.get('/room/:roomId', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const parsed = roomIdParam.safeParse(req.params)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const room = await requireRoomMember(parsed.data.roomId, userId)
    if (!room) {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    let whiteboard = await findOne<Record<string, unknown>>('whiteboards', [
      { field: 'room_id', operator: '=', value: parsed.data.roomId },
    ])
    if (!whiteboard) {
      const created = await create<Record<string, unknown>>('whiteboards', {
        room_id: parsed.data.roomId,
        strokes: [],
        created_at: new Date(),
        updated_at: new Date(),
      })
      whiteboard = created.data
    }
    // Normalise strokes — Postgres jsonb is returned by `pg` as a parsed JS
    // value, but some DataStore providers return the raw text or omit the
    // column from the INSERT RETURNING shape. Always hand the client an array.
    if (whiteboard) {
      const raw = whiteboard.strokes
      let strokes: unknown[] = []
      if (Array.isArray(raw)) strokes = raw
      else if (typeof raw === 'string') {
        try {
          const parsedJson: unknown = JSON.parse(raw)
          if (Array.isArray(parsedJson)) strokes = parsedJson
        } catch (_error) {
          // invalid JSON in stored strokes — safe to leave default empty array
        }
      }
      whiteboard = { ...whiteboard, strokes }
    }
    res.json(whiteboard)
  } catch (error) {
    logger.error('whiteboard.get', error)
    internalError(res)
  }
})

router.post('/room/:roomId/stroke', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const params = roomIdParam.safeParse(req.params)
  const body = strokeSchema.safeParse(req.body)
  if (!params.success || !body.success) {
    validationError(res, params.success ? body.error?.issues : params.error.issues)
    return
  }
  try {
    const room = await requireRoomMember(params.data.roomId, userId)
    if (!room) {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    const allowed = await canDraw(params.data.roomId, userId, room.host_id)
    if (!allowed) {
      res.status(403).json({
        error: t('whiteboard.forbidden', {}, { defaultValue: 'Not allowed to draw' }),
      })
      return
    }

    // Persist the stroke so it survives reload. Read-modify-write the
    // whiteboard's strokes JSON (lazy-creating the row if a member draws
    // before anyone GETs the canvas). Realtime fan-out is best-effort —
    // the DB row is the authoritative state every client resyncs from.
    let board: { id: string; strokes: unknown } | null = await findOne<{
      id: string
      strokes: unknown
    }>('whiteboards', [{ field: 'room_id', operator: '=', value: params.data.roomId }])
    if (!board) {
      const created = await create<{ id: string; strokes: unknown }>('whiteboards', {
        room_id: params.data.roomId,
        strokes: [],
        created_at: new Date(),
        updated_at: new Date(),
      })
      board = created.data
    }
    if (!board) {
      internalError(res)
      return
    }
    const raw = board.strokes
    let existing: unknown[] = []
    if (Array.isArray(raw)) existing = raw
    else if (typeof raw === 'string') {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) existing = parsed
      } catch (_error) {
        // invalid JSON in stored strokes — safe to leave default empty array
      }
    }
    const stroke = {
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: new Date().toISOString(),
      ...body.data,
    }
    const next = [...existing, stroke]
    // jsonb columns must receive a JSON-serialized string when passed
    // through node-postgres parameterized queries — passing the JS array
    // directly causes pg to send it as a text[] which conflicts with the
    // jsonb column type.
    await updateById('whiteboards', board.id, {
      strokes: JSON.stringify(next),
      updated_at: new Date(),
    })
    await safeBroadcast(`room:${params.data.roomId}`, 'whiteboard-stroke', stroke)
    res.status(201).json(stroke)
  } catch (error) {
    logger.error('whiteboard.stroke', error)
    internalError(res)
  }
})

router.post('/room/:roomId/clear', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const parsed = roomIdParam.safeParse(req.params)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const room = await requireRoomMember(parsed.data.roomId, userId)
    if (!room) {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    const allowed = await canDraw(parsed.data.roomId, userId, room.host_id)
    if (!allowed) {
      res.status(403).json({
        error: t('whiteboard.forbidden', {}, { defaultValue: 'Not allowed to draw' }),
      })
      return
    }
    const whiteboard = await findOne<{ id: string }>('whiteboards', [
      { field: 'room_id', operator: '=', value: parsed.data.roomId },
    ])
    if (whiteboard) {
      await updateById('whiteboards', whiteboard.id, {
        strokes: JSON.stringify([]),
        updated_at: new Date(),
      })
    }
    await safeBroadcast(`room:${parsed.data.roomId}`, 'whiteboard-cleared', {})
    res.json({ success: true })
  } catch (error) {
    logger.error('whiteboard.clear', error)
    internalError(res)
  }
})

export default router
