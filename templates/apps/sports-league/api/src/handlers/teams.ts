/**
 * Teams handler — public read, owner-OR-admin write.
 *
 * `team` rows have an `owner_user_id` (manager). Any authenticated user may
 * create a team (they become its owner); updates/deletes/roster-writes require
 * the caller to be EITHER the team's real owner OR a league administrator.
 *
 * Security fix: the previous guard `if (team.owner_user_id && team.owner_user_id
 * !== userId)` fell OPEN whenever `owner_user_id` was NULL — and the demo league
 * seeds teams with NULL owners — so any authenticated user could edit/delete
 * them. `teamWriteAllowed` now requires admin OR a *matching real* owner and
 * never falls open on a null owner. See `middleware/require-admin.ts`.
 *
 * Search uses the meilisearch bond. The bond has a `getStore()` style guard
 * so calls that hit it before the bond is wired return an empty result rather
 * than throwing.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'
import { hasProvider as hasSearchProvider, index, search } from '@molecule/api-search'

import { isAdmin } from '../middleware/require-admin.js'
import type { SportsLeagueLimits } from '../tiers.js'
import { seedDemoOnce } from './_seed.js'

const router = Router()

// Express types `req.params` as `Record<string, string | string[]>`. The
// validateParams middleware narrows the shape to `Record<string, string>` at
// runtime, but TS cannot see that — assert the row id explicitly.
const idOf = (req: Request): string => req.params.id as string

/**
 * Owner-OR-admin write authorization for a team row. A league administrator may
 * always write; otherwise the caller must be the team's *real* owner. Returns
 * false when `owner_user_id` is null/unset — it NEVER falls open, closing the
 * broken-access-control hole on the NULL-owner seeded teams.
 */
async function teamWriteAllowed(
  team: { owner_user_id?: string | null },
  userId: string,
): Promise<boolean> {
  if (await isAdmin(userId)) return true
  return Boolean(team.owner_user_id) && team.owner_user_id === userId
}

const listQuerySchema = z.object({
  division: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
})

const searchQuerySchema = z.object({ q: z.string().min(1) })

const createTeamSchema = z.object({
  name: z.string().min(1),
  abbreviation: z.string().max(10).optional(),
  logo_url: z.string().url().nullable().optional(),
  city: z.string().optional(),
  division: z.string().optional(),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  league_id: z.string().nullable().optional(),
  division_id: z.string().nullable().optional(),
})

const updateTeamSchema = createTeamSchema.partial()

const addRosterPlayerSchema = z.object({
  name: z.string().min(1).optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().optional(),
  jersey_number: z.coerce.number().int().nonnegative().optional(),
  position: z.string().optional(),
  height: z.coerce.number().nonnegative().optional(),
  weight: z.coerce.number().nonnegative().optional(),
  status: z.enum(['active', 'injured', 'reserve']).optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    await seedDemoOnce()
    const { division, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = []
    if (division) where.push({ field: 'division', operator: '=', value: division })

    const pageNum = page ?? 1
    const limitNum = limit ?? 50

    const teams = await findMany<Record<string, unknown>>('teams', {
      where,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    // Compute league-wide rank (by points) so the cards can render "#1", and
    // alias `primary_color` → `color` so the brand-colored badge surfaces
    // even on cards that don't fetch the full team detail.
    const allTeams = await findMany<{
      id: string
      wins?: number | string
      draws?: number | string
    }>('teams', { limit: 500 })
    const ranked = allTeams
      .map((t) => ({ id: t.id, points: Number(t.wins ?? 0) * 3 + Number(t.draws ?? 0) }))
      .sort((a, b) => b.points - a.points)
    const rankById: Record<string, number> = {}
    ranked.forEach((r, idx) => {
      rankById[r.id] = idx + 1
    })
    const hydrated = teams.map((tm) => ({
      ...tm,
      color: (tm.primary_color as string | null | undefined) ?? null,
      rank: rankById[tm.id as string] ?? null,
    }))
    res.json({ data: hydrated })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q } = req.query as unknown as z.infer<typeof searchQuerySchema>
    // Try the search bond first if registered, but fall back to a DB substring
    // filter on any failure (provider not running, index missing, etc.) so the
    // endpoint stays usable in environments without a live Meilisearch.
    if (hasSearchProvider()) {
      try {
        const results = await search('teams', { text: q })
        // search() returns a SearchResult { hits, total, ... } — flatten to a
        // plain array so callers can iterate `.data` uniformly with the DB
        // fallback below.
        const hits = (results as unknown as { hits?: unknown[] }).hits ?? []
        if (hits.length > 0) {
          res.json({ data: hits, source: 'search' })
          return
        }
        // Empty index → fall through to DB scan (tests seed via createTeam
        // which doesn't push to the search index).
      } catch (err) {
        console.error('search provider failed, falling back to db', err)
      }
    }
    // Fallback: load a bounded slice and filter by substring in JS.
    // The Postgres bond's `like` operator escapes `%` in values, so true
    // substring matching has to happen application-side here.
    const all = await findMany<Record<string, unknown>>('teams', {
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit: 500,
    })
    const needle = q.toLowerCase()
    const teams = all
      .filter((t) =>
        String(t.name ?? '')
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 25)
    res.json({ data: teams, source: 'db' })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    await seedDemoOnce()
    const team = await findById<Record<string, unknown>>('teams', idOf(req))
    if (!team) {
      res
        .status(404)
        .json({ error: t('teams.notFound', undefined, { defaultValue: 'Team not found' }) })
      return
    }
    // Hydrate aggregate fields the team-detail UI shows in the header (points,
    // rank, goals_for, goals_against). There is no `standings` table — the
    // values are computed: points = wins*3 + draws, GF/GA from games. Without
    // this hydration the page would always render "0 PTS / GF 0" even on a
    // fully-played seed.
    const allTeams = await findMany<{
      id: string
      wins?: number | string
      losses?: number | string
      draws?: number | string
    }>('teams', { limit: 500 })
    const ranked = allTeams
      .map((t) => ({
        id: t.id,
        wins: Number(t.wins ?? 0),
        losses: Number(t.losses ?? 0),
        draws: Number(t.draws ?? 0),
        points: Number(t.wins ?? 0) * 3 + Number(t.draws ?? 0),
      }))
      .sort((a, b) => b.points - a.points)
    const idx = ranked.findIndex((r) => r.id === idOf(req))
    const me = ranked[idx]
    const games = await findMany<{
      home_team_id: string
      away_team_id: string
      home_score?: number
      away_score?: number
      status?: string
    }>('games', {
      where: [{ field: 'status', operator: '=', value: 'final' }],
      limit: 1000,
    })
    let goalsFor = 0
    let goalsAgainst = 0
    for (const g of games) {
      if (g.home_team_id === idOf(req)) {
        goalsFor += Number(g.home_score ?? 0)
        goalsAgainst += Number(g.away_score ?? 0)
      } else if (g.away_team_id === idOf(req)) {
        goalsFor += Number(g.away_score ?? 0)
        goalsAgainst += Number(g.home_score ?? 0)
      }
    }
    res.json({
      ...team,
      // UI uses `team.color` directly; alias primary_color so Team detail's
      // hero gradient + accent pill render with the brand color (no fallback).
      color: (team as Record<string, unknown>).primary_color ?? null,
      points: me?.points ?? 0,
      goals_for: goalsFor,
      goals_against: goalsAgainst,
      rank: idx >= 0 ? idx + 1 : null,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/roster', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    await seedDemoOnce()
    const team = await findById('teams', idOf(req))
    if (!team) {
      res
        .status(404)
        .json({ error: t('teams.notFound', undefined, { defaultValue: 'Team not found' }) })
      return
    }

    const players = await findMany<Record<string, unknown>>('players', {
      where: [{ field: 'team_id', operator: '=', value: idOf(req) }],
      orderBy: [{ field: 'jersey_number', direction: 'asc' }],
    })
    // Hydrate season-stats so the roster table can render goals + assists.
    // Without this the UI shows "—/—/0/0" for every player even on the
    // fully-seeded league.
    const stats = await findMany<{
      player_id: string
      points?: number
      assists?: number
      extra?: Record<string, number> | null
    }>('player_stats', {
      where: [{ field: 'team_id', operator: '=', value: idOf(req) }],
      limit: 200,
    })
    // Goals live in `extra.goals` (JSONB) since the canonical column set is
    // sport-agnostic (points, assists, rebounds, …). Sum across all stat rows
    // for the team — multiple stat snapshots per player are permitted.
    const byPlayer: Record<string, { goals?: number; assists?: number }> = {}
    for (const s of stats) {
      const cur = byPlayer[s.player_id] || { goals: 0, assists: 0 }
      const goalsHere = Number(s.extra?.goals ?? 0)
      cur.goals = (cur.goals ?? 0) + goalsHere
      cur.assists = (cur.assists ?? 0) + Number(s.assists ?? 0)
      byPlayer[s.player_id] = cur
    }
    const POSITION_SHORT_ROSTER: Record<string, string> = {
      forward: 'F',
      midfielder: 'M',
      defender: 'D',
      goalkeeper: 'GK',
    }
    const hydrated = players.map((p) => {
      const playerId = p.id as string
      const s = byPlayer[playerId] || {}
      const posKey = String(p.position ?? '')
        .trim()
        .toLowerCase()
      return {
        ...p,
        jersey: p.jersey_number ?? null,
        position: POSITION_SHORT_ROSTER[posKey] ?? p.position ?? null,
        position_full: p.position ?? null,
        goals: s.goals ?? 0,
        assists: s.assists ?? 0,
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

// Enforce the per-tier team cap (tiers.ts maxTeams) — defined + advertised in Pricing but enforceLimit
// was never called, so any tier could create unlimited teams.
const enforceTeamLimit = enforceLimit<SportsLeagueLimits>({
  limitType: 'maxTeams',
  getLimit: (limits) => limits.maxTeams,
  getCurrent: async (userId) =>
    count('teams', [{ field: 'owner_user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceTeamLimit,
  validateBody(createTeamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }

      const body = req.body as z.infer<typeof createTeamSchema>
      const result = await create<{ id: string }>('teams', {
        name: body.name,
        abbreviation: body.abbreviation ?? '',
        logo_url: body.logo_url ?? null,
        city: body.city ?? '',
        division: body.division ?? '',
        league_id: body.league_id ?? null,
        division_id: body.division_id ?? null,
        primary_color: body.primary_color ?? null,
        secondary_color: body.secondary_color ?? null,
        owner_user_id: userId,
        wins: 0,
        losses: 0,
        draws: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })

      if (result.data && hasSearchProvider()) {
        try {
          await index('teams', String(result.data.id), result.data as Record<string, unknown>)
        } catch (_error) {
          // search index failures are non-fatal — the row is already committed to the DB
        }
      }
      res.status(201).json(result.data)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateTeamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }

      const team = await findById<{ owner_user_id?: string | null }>('teams', idOf(req))
      if (!team) {
        res
          .status(404)
          .json({ error: t('teams.notFound', undefined, { defaultValue: 'Team not found' }) })
        return
      }
      // Owner-OR-admin write — never falls open on a null owner.
      if (!(await teamWriteAllowed(team, userId))) {
        res.status(403).json({
          error: t('teams.forbidden', undefined, {
            defaultValue: 'Not authorized to modify this team.',
          }),
        })
        return
      }

      const result = await updateById<{ id: string }>('teams', idOf(req), {
        ...(req.body as Record<string, unknown>),
        updated_at: new Date(),
      })

      if (result.data && hasSearchProvider()) {
        try {
          await index('teams', String(result.data.id), result.data as Record<string, unknown>)
        } catch (_error) {
          // search index failures are non-fatal — the row is already committed to the DB
        }
      }
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
  '/:id/roster',
  validateParams(idParamSchema),
  validateBody(addRosterPlayerSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }

      const team = await findById<{ owner_user_id?: string | null }>('teams', idOf(req))
      if (!team) {
        res
          .status(404)
          .json({ error: t('teams.notFound', undefined, { defaultValue: 'Team not found' }) })
        return
      }
      // Owner-OR-admin write — never falls open on a null owner.
      if (!(await teamWriteAllowed(team, userId))) {
        res.status(403).json({
          error: t('teams.forbidden', undefined, {
            defaultValue: 'Not authorized to modify this team.',
          }),
        })
        return
      }

      const body = req.body as z.infer<typeof addRosterPlayerSchema>
      // Persist a player row; the migration column set covers both styles.
      const result = await create<{ id: string }>('players', {
        team_id: idOf(req),
        first_name: body.first_name ?? body.name?.split(' ').slice(0, -1).join(' ') ?? '',
        last_name: body.last_name ?? body.name?.split(' ').slice(-1).join(' ') ?? '',
        name: body.name ?? null,
        jersey_number: body.jersey_number ?? null,
        position: body.position ?? '',
        height: body.height ?? null,
        weight: body.weight ?? null,
        status: body.status ?? 'active',
        created_at: new Date(),
        updated_at: new Date(),
      })

      if (result.data) {
        await create('roster_entries', {
          team_id: idOf(req),
          player_id: result.data.id,
          joined_at: new Date(),
          role: 'starter',
        })
      }

      res.status(201).json(result.data)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    const team = await findById<{ owner_user_id?: string | null }>('teams', idOf(req))
    if (!team) {
      res
        .status(404)
        .json({ error: t('teams.notFound', undefined, { defaultValue: 'Team not found' }) })
      return
    }
    // Owner-OR-admin write — never falls open on a null owner.
    if (!(await teamWriteAllowed(team, userId))) {
      res.status(403).json({
        error: t('teams.forbidden', undefined, {
          defaultValue: 'Not authorized to delete this team.',
        }),
      })
      return
    }

    await deleteById('teams', idOf(req))
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Helpful for callers wanting to know whether the lookup uses the search
// index — useful when the meilisearch bond is gated by env.
export async function findTeamByName(name: string): Promise<{ id: string } | null> {
  return await findOne<{ id: string }>('teams', [{ field: 'name', operator: '=', value: name }])
}

export default router
