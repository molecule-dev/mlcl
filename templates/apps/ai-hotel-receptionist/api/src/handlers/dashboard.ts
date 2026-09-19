/**
 * `/api/dashboard` — the today view: arrivals, departures, room status
 * board, occupancy, and the most recent calls. Read-only aggregate over
 * the shared PMS tables.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import type { CallRow, VoiceAgentRow } from '../lib/agent.js'
import { reservationsForDay, type RoomRow, todayIso } from '../lib/pms.js'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const today = todayIso()

    const [arrivals, departures, rooms, recentCalls, agents] = await Promise.all([
      reservationsForDay(today, 'arrivals'),
      reservationsForDay(today, 'departures'),
      findMany<RoomRow>('rooms', {
        orderBy: [
          { field: 'floor', direction: 'asc' },
          { field: 'number', direction: 'asc' },
        ],
      }),
      findMany<CallRow>('calls', {
        orderBy: [{ field: 'started_at', direction: 'desc' }],
        limit: 8,
      }),
      findMany<VoiceAgentRow>('voice_agents', {}),
    ])

    const statusBoard = {
      vacant_clean: rooms.filter((r) => r.status === 'vacant_clean').length,
      occupied: rooms.filter((r) => r.status === 'occupied').length,
      cleaning: rooms.filter((r) => r.status === 'cleaning').length,
      out_of_order: rooms.filter((r) => r.status === 'out_of_order').length,
    }
    const totalRooms = rooms.length
    const occupancy = {
      occupied_rooms: statusBoard.occupied,
      total_rooms: totalRooms,
      percent: totalRooms > 0 ? Math.round((statusBoard.occupied / totalRooms) * 100) : 0,
    }

    const agentNameById = new Map(agents.map((a) => [a.id, a.name]))

    res.json({
      today,
      arrivals,
      departures,
      rooms,
      status_board: statusBoard,
      occupancy,
      recent_calls: recentCalls.map((c) => ({
        id: c.id,
        voice_agent_id: c.voice_agent_id,
        voice_agent_name: agentNameById.get(c.voice_agent_id) ?? null,
        detected_language: c.detected_language,
        started_at: c.started_at,
        duration_seconds: c.duration_seconds,
        outcome: c.outcome,
      })),
    })
  } catch (error) {
    logger.error('dashboard.summary', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
