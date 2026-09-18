/**
 * Scores handler — live scoring + box-score events.
 *
 * Writes (`/start`, `/final`, `/events`, score-update) mutate shared-league
 * `games` / `game_events` rows that every fan reads. There is no per-user owner
 * column, and the previous "owner of either team, else any authenticated user"
 * check fell OPEN for the NULL-owner seeded league, letting any signed-in user
 * post scores. Writes are now league-operator (admin) gated via `requireAdmin`
 * (see `middleware/require-admin.ts`). Push-notification fan-out to favoriting
 * fans is best-effort — failures are logged but not propagated to the response.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'
import type { PushSubscription } from '@molecule/api-push-notifications'
import { hasProvider as hasPushProvider, send as sendPush } from '@molecule/api-push-notifications'
import { broadcast, hasProvider as hasRealtimeProvider } from '@molecule/api-realtime'

import { requireAdmin } from '../middleware/require-admin.js'
import { seedDemoOnce } from './_seed.js'

const router = Router()

const SPORTS_LEAGUE_ROOM = 'sports-league'

const gameIdOf = (req: Request): string => req.params.gameId as string

const gameIdParamSchema = z.object({ gameId: z.string().min(1) })

const scoreUpdateSchema = z.object({
  home_score: z.coerce.number().int().nonnegative().optional(),
  away_score: z.coerce.number().int().nonnegative().optional(),
  period: z.coerce.number().int().nonnegative().optional(),
  game_clock: z.string().optional(),
})

const eventSchema = z.object({
  type: z.string().min(1).default('goal'),
  description: z.string().optional(),
  player_id: z.string().nullable().optional(),
  team_id: z.string().nullable().optional(),
  period: z.coerce.number().int().nonnegative().optional(),
  game_clock: z.string().optional(),
  score_home: z.coerce.number().int().nonnegative().optional(),
  score_away: z.coerce.number().int().nonnegative().optional(),
})

// Authorization is handled by the `requireAdmin` middleware on each write
// route; here we only need to load the game (404 when it does not exist).
async function loadGame(gameId: string): Promise<Record<string, unknown> | null> {
  return await findById<Record<string, unknown>>('games', gameId)
}

async function safeBroadcast(event: string, data: unknown): Promise<void> {
  if (!hasRealtimeProvider()) return
  try {
    await broadcast(SPORTS_LEAGUE_ROOM, event, data)
  } catch (err) {
    console.error('broadcast failed', event, err)
  }
}

/**
 * Whether a fan wants a given notification category. Preferences live in
 * users.oauthData.sl.notifications (see the profile handler's DEFAULT_NOTIFICATIONS);
 * an unset value falls back to `defaultOn`. Used to honor the Settings toggles so a
 * fan who turned a category off stops receiving both the in-app notification and push.
 */
async function notificationEnabled(
  userId: string,
  key: string,
  defaultOn = true,
): Promise<boolean> {
  const user = await findById<{ oauthData?: Record<string, unknown> | null }>('users', userId)
  const sl =
    ((user?.oauthData as Record<string, unknown> | null)?.sl as
      Record<string, unknown> | undefined) ?? {}
  const notifications = (sl.notifications as Record<string, unknown> | undefined) ?? {}
  const value = notifications[key]
  return typeof value === 'boolean' ? value : defaultOn
}

export async function fanoutPushToFavorites(
  teamIds: Array<string | null | undefined>,
  payload: { title: string; body: string; href?: string },
): Promise<void> {
  if (!hasPushProvider()) return
  const teamIdSet = teamIds.filter(Boolean) as string[]
  if (teamIdSet.length === 0) return

  for (const teamId of teamIdSet) {
    try {
      const favorites = await findMany<{ user_id: string }>('favorite_teams', {
        where: [{ field: 'team_id', operator: '=', value: teamId }],
      })
      const userIds = favorites.map((f) => f.user_id).filter(Boolean)
      // Persist an in-app notification per fan + send a push if subscribed.
      for (const userId of userIds) {
        // Skip fans who disabled score alerts — the toggle used to do nothing.
        if (!(await notificationEnabled(userId, 'score_alerts'))) continue
        await create('notifications', {
          user_id: userId,
          type: 'final_score',
          title: payload.title,
          body: payload.body,
          href: payload.href ?? null,
          read: false,
          created_at: new Date(),
        })

        // The devices table uses camelCase columns ("userId"/"pushSubscription"),
        // unlike this app's snake_case notifications table.
        const devices = await findMany<{
          pushSubscription?: PushSubscription | null
        }>('devices', { where: [{ field: 'userId', operator: '=', value: userId }] })
        for (const device of devices) {
          if (!device.pushSubscription) continue
          try {
            await sendPush(device.pushSubscription, payload)
          } catch (err) {
            console.error('push send failed', err)
          }
        }
      }
    } catch (err) {
      console.error('fanoutPushToFavorites failed for team', teamId, err)
    }
  }
}

router.get('/live', async (_req: Request, res: Response) => {
  try {
    await seedDemoOnce()
    const games = await findMany('games', {
      where: [{ field: 'status', operator: '=', value: 'in_progress' }],
      orderBy: [{ field: 'date', direction: 'asc' }],
    })
    // Hydrate with team rows so the ticker can render abbreviations + colors
    // without a second round-trip per game.
    const teamIds = Array.from(
      new Set(
        games.flatMap((g) => {
          const row = g as Record<string, unknown>
          return [row.home_team_id, row.away_team_id].filter(Boolean) as string[]
        }),
      ),
    )
    const teams = teamIds.length
      ? await findMany('teams', { where: [{ field: 'id', operator: 'in', value: teamIds }] })
      : []
    const teamById = new Map(teams.map((t) => [String((t as Record<string, unknown>).id), t]))
    const hydrated = games.map((g) => {
      const row = g as Record<string, unknown>
      return {
        ...row,
        home_team: row.home_team_id ? (teamById.get(String(row.home_team_id)) ?? null) : null,
        away_team: row.away_team_id ? (teamById.get(String(row.away_team_id)) ?? null) : null,
      }
    })
    res.json({ data: hydrated })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:gameId', validateParams(gameIdParamSchema), async (req: Request, res: Response) => {
  try {
    const game = await findById<{ home_team_id?: string; away_team_id?: string }>(
      'games',
      gameIdOf(req),
    )
    if (!game) {
      res
        .status(404)
        .json({ error: t('scores.gameNotFound', undefined, { defaultValue: 'Game not found' }) })
      return
    }
    const events = await findMany('game_events', {
      where: [{ field: 'game_id', operator: '=', value: gameIdOf(req) }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    const homeTeam = game.home_team_id ? await findById('teams', String(game.home_team_id)) : null
    const awayTeam = game.away_team_id ? await findById('teams', String(game.away_team_id)) : null
    res.json({ ...game, home_team: homeTeam, away_team: awayTeam, events })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/:gameId',
  requireAdmin,
  validateParams(gameIdParamSchema),
  validateBody(scoreUpdateSchema),
  async (req: Request, res: Response) => {
    try {
      const game = await loadGame(gameIdOf(req))
      if (!game) {
        res.status(404).json({
          error: t('scores.gameNotFound', undefined, { defaultValue: 'Game not found' }),
        })
        return
      }

      const body = req.body as z.infer<typeof scoreUpdateSchema>
      const result = await updateById('games', gameIdOf(req), {
        home_score: body.home_score ?? game.home_score,
        away_score: body.away_score ?? game.away_score,
        period: body.period ?? game.period,
        game_clock: body.game_clock ?? game.game_clock,
        status: 'in_progress',
        updated_at: new Date(),
      })

      await safeBroadcast('score-update', {
        game_id: gameIdOf(req),
        home_score: (result.data as Record<string, unknown> | null)?.home_score ?? body.home_score,
        away_score: (result.data as Record<string, unknown> | null)?.away_score ?? body.away_score,
        period: body.period ?? null,
        game_clock: body.game_clock ?? null,
      })

      res.json(result.data)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/:gameId/start',
  requireAdmin,
  validateParams(gameIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const game = await loadGame(gameIdOf(req))
      if (!game) {
        res.status(404).json({
          error: t('scores.gameNotFound', undefined, { defaultValue: 'Game not found' }),
        })
        return
      }

      const result = await updateById('games', gameIdOf(req), {
        status: 'in_progress',
        period: 1,
        game_clock: '00:00',
        started_at: new Date(),
        updated_at: new Date(),
      })

      await safeBroadcast('game-started', { game_id: gameIdOf(req) })
      res.json(result.data)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/:gameId/final',
  requireAdmin,
  validateParams(gameIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const game = await loadGame(gameIdOf(req))
      if (!game) {
        res.status(404).json({
          error: t('scores.gameNotFound', undefined, { defaultValue: 'Game not found' }),
        })
        return
      }

      const result = await updateById('games', gameIdOf(req), {
        status: 'final',
        ended_at: new Date(),
        updated_at: new Date(),
      })

      const homeScore = Number(game.home_score ?? 0)
      const awayScore = Number(game.away_score ?? 0)
      const homeWon = homeScore > awayScore
      const draw = homeScore === awayScore

      const homeTeam = game.home_team_id
        ? await findById<{ wins?: number; losses?: number; draws?: number; abbreviation?: string }>(
            'teams',
            String(game.home_team_id),
          )
        : null
      const awayTeam = game.away_team_id
        ? await findById<{ wins?: number; losses?: number; draws?: number; abbreviation?: string }>(
            'teams',
            String(game.away_team_id),
          )
        : null

      if (homeTeam && awayTeam) {
        if (draw) {
          await updateById('teams', String(game.home_team_id), {
            draws: Number(homeTeam.draws ?? 0) + 1,
            updated_at: new Date(),
          })
          await updateById('teams', String(game.away_team_id), {
            draws: Number(awayTeam.draws ?? 0) + 1,
            updated_at: new Date(),
          })
        } else {
          const winnerId = homeWon ? String(game.home_team_id) : String(game.away_team_id)
          const loserId = homeWon ? String(game.away_team_id) : String(game.home_team_id)
          const winner = homeWon ? homeTeam : awayTeam
          const loser = homeWon ? awayTeam : homeTeam
          await updateById('teams', winnerId, {
            wins: Number(winner.wins ?? 0) + 1,
            updated_at: new Date(),
          })
          await updateById('teams', loserId, {
            losses: Number(loser.losses ?? 0) + 1,
            updated_at: new Date(),
          })
        }
      }

      await safeBroadcast('game-final', {
        game_id: gameIdOf(req),
        home_score: homeScore,
        away_score: awayScore,
      })

      const homeAbbr = String(homeTeam?.abbreviation ?? 'HOME')
      const awayAbbr = String(awayTeam?.abbreviation ?? 'AWAY')
      await fanoutPushToFavorites(
        [
          game.home_team_id ? String(game.home_team_id) : null,
          game.away_team_id ? String(game.away_team_id) : null,
        ],
        {
          title: t('scores.finalNotificationTitle', undefined, { defaultValue: 'Game Final' }),
          body: t(
            'scores.finalNotificationBody',
            {
              home: homeAbbr,
              away: awayAbbr,
              homeScore: String(homeScore),
              awayScore: String(awayScore),
            },
            { defaultValue: `${homeAbbr} ${homeScore} - ${awayAbbr} ${awayScore} (Final)` },
          ),
          href: `/matches/${gameIdOf(req)}`,
        },
      )

      res.json(result.data)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/:gameId/events',
  requireAdmin,
  validateParams(gameIdParamSchema),
  validateBody(eventSchema),
  async (req: Request, res: Response) => {
    try {
      const game = await loadGame(gameIdOf(req))
      if (!game) {
        res.status(404).json({
          error: t('scores.gameNotFound', undefined, { defaultValue: 'Game not found' }),
        })
        return
      }

      const body = req.body as z.infer<typeof eventSchema>

      const result = await create('game_events', {
        game_id: gameIdOf(req),
        type: body.type,
        description: body.description ?? '',
        player_id: body.player_id ?? null,
        team_id: body.team_id ?? null,
        period: body.period ?? game.period ?? null,
        game_clock: body.game_clock ?? game.game_clock ?? null,
        score_home: body.score_home ?? null,
        score_away: body.score_away ?? null,
        occurred_at: new Date(),
        created_at: new Date(),
      })

      await safeBroadcast('game-event', { game_id: gameIdOf(req), event: result.data })

      // Notification fan-out: any event during a live game pings favoriting fans.
      await fanoutPushToFavorites(
        [
          game.home_team_id ? String(game.home_team_id) : null,
          game.away_team_id ? String(game.away_team_id) : null,
        ],
        {
          title: t('scores.eventNotificationTitle', undefined, { defaultValue: 'Game update' }),
          body: body.description ?? body.type,
          href: `/matches/${gameIdOf(req)}`,
        },
      )

      res.status(201).json(result.data)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get(
  '/:gameId/events',
  validateParams(gameIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const events = await findMany('game_events', {
        where: [{ field: 'game_id', operator: '=', value: gameIdOf(req) }],
        orderBy: [{ field: 'created_at', direction: 'asc' }],
      })
      res.json({ data: events })
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
