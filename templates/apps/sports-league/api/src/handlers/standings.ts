/**
 * Standings handler — public read.
 *
 * Pure aggregation over the `teams` table. Standings are derived; no writes.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoOnce } from './_seed.js'

const router = Router()

const overallQuerySchema = z.object({
  division: z.string().optional(),
  season: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
})

const leadersQuerySchema = z.object({
  stat: z.enum(['wins', 'losses', 'draws']).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
})

interface TeamRow {
  id: string
  name: string
  abbreviation?: string | null
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  division?: string | null
  wins?: number | string
  losses?: number | string
  draws?: number | string
}

interface StandingsRow {
  rank: number
  team_id: string
  name: string
  abbreviation: string | null | undefined
  logo_url: string | null | undefined
  // `color` is the brand swatch the standings table renders as the row accent.
  // Aliased from `teams.primary_color` so the UI's `r.color` boolean check
  // resolves truthy and the colored chip actually appears.
  color: string | null | undefined
  primary_color: string | null | undefined
  division: string | null | undefined
  wins: number
  losses: number
  draws: number
  games_played: number
  points: number
  win_pct: number
}

router.get('/', validateQuery(overallQuerySchema), async (req: Request, res: Response) => {
  try {
    await seedDemoOnce()
    const { division, limit } = req.query as unknown as z.infer<typeof overallQuerySchema>
    const where: WhereCondition[] = []
    if (division) where.push({ field: 'division', operator: '=', value: division })

    const teams = await findMany<TeamRow>('teams', {
      where,
      orderBy: [{ field: 'wins', direction: 'desc' }],
      limit: limit ?? 100,
    })

    const standings: StandingsRow[] = teams.map((team) => {
      const wins = Number(team.wins ?? 0)
      const losses = Number(team.losses ?? 0)
      const draws = Number(team.draws ?? 0)
      const gamesPlayed = wins + losses + draws
      const points = wins * 3 + draws
      const winPct = gamesPlayed > 0 ? wins / gamesPlayed : 0
      return {
        rank: 0,
        team_id: team.id,
        name: team.name,
        abbreviation: team.abbreviation,
        logo_url: team.logo_url,
        color: team.primary_color ?? null,
        primary_color: team.primary_color ?? null,
        division: team.division,
        wins,
        losses,
        draws,
        games_played: gamesPlayed,
        points,
        win_pct: Math.round(winPct * 1000) / 1000,
      }
    })

    standings.sort((a, b) => b.points - a.points || b.win_pct - a.win_pct)
    standings.forEach((s, i) => {
      s.rank = i + 1
    })

    res.json({ data: standings })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/divisions', async (_req: Request, res: Response) => {
  try {
    const teams = await findMany<TeamRow>('teams', {
      orderBy: [{ field: 'wins', direction: 'desc' }],
    })

    const divisions: Record<string, StandingsRow[]> = {}
    for (const team of teams) {
      const div =
        team.division ?? t('standings.unassigned', undefined, { defaultValue: 'Unassigned' })
      if (!divisions[div]) divisions[div] = []
      const wins = Number(team.wins ?? 0)
      const losses = Number(team.losses ?? 0)
      const draws = Number(team.draws ?? 0)
      const gamesPlayed = wins + losses + draws
      divisions[div].push({
        rank: 0,
        team_id: team.id,
        name: team.name,
        abbreviation: team.abbreviation,
        logo_url: team.logo_url,
        color: team.primary_color ?? null,
        primary_color: team.primary_color ?? null,
        division: team.division,
        wins,
        losses,
        draws,
        games_played: gamesPlayed,
        points: wins * 3 + draws,
        win_pct: gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 1000) / 1000 : 0,
      })
    }
    for (const div of Object.keys(divisions)) {
      divisions[div].sort((a, b) => b.points - a.points || b.win_pct - a.win_pct)
      divisions[div].forEach((s, i) => {
        s.rank = i + 1
      })
    }
    res.json({ data: divisions })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/leaders', validateQuery(leadersQuerySchema), async (req: Request, res: Response) => {
  try {
    const { stat, limit } = req.query as unknown as z.infer<typeof leadersQuerySchema>
    const field = stat ?? 'wins'
    const teams = await findMany<TeamRow>('teams', {
      orderBy: [{ field, direction: 'desc' }],
      limit: limit ?? 10,
    })
    const leaders = teams.map((team, idx) => ({
      rank: idx + 1,
      team_id: team.id,
      name: team.name,
      abbreviation: team.abbreviation,
      value: Number((team as unknown as Record<string, unknown>)[field] ?? 0),
    }))
    res.json({ data: leaders })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
