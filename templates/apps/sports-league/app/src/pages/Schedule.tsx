import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/api.js'

interface ScheduleTeamRow {
  id?: string
  name?: string
  abbreviation?: string | null
  primary_color?: string | null
}

interface ScheduleGame {
  id: string | number
  date: string
  time?: string
  status: 'scheduled' | 'in_progress' | 'live' | 'final' | 'postponed'
  home_abbr?: string
  away_abbr?: string
  home_color?: string
  away_color?: string
  home_team?: ScheduleTeamRow | null
  away_team?: ScheduleTeamRow | null
  home_score?: number
  away_score?: number
  venue?: string
}

// The API returns hydrated `home_team` / `away_team` rows; legacy fallback rows
// (and older clients) used flattened `home_abbr` / `home_color` shapes. Fold
// both into the shape the calendar cells render so we don't see empty pills.
function normalizeGame(g: ScheduleGame): ScheduleGame {
  return {
    ...g,
    home_abbr: g.home_abbr ?? g.home_team?.abbreviation ?? undefined,
    away_abbr: g.away_abbr ?? g.away_team?.abbreviation ?? undefined,
    home_color: g.home_color ?? g.home_team?.primary_color ?? undefined,
    away_color: g.away_color ?? g.away_team?.primary_color ?? undefined,
  }
}

const FALLBACK: ScheduleGame[] = (() => {
  const today = new Date()
  const out: ScheduleGame[] = []
  const teams = [
    { abbr: 'ATL', color: '#0e7490' },
    { abbr: 'BOS', color: '#dc2626' },
    { abbr: 'CHI', color: '#16a34a' },
    { abbr: 'DAL', color: '#7c3aed' },
    { abbr: 'PHX', color: '#f59e0b' },
    { abbr: 'SEA', color: '#0c4a6e' },
    { abbr: 'MIA', color: '#22d3ee' },
    { abbr: 'TOR', color: '#10b981' },
    { abbr: 'NYC', color: '#0c4a6e' },
    { abbr: 'LAC', color: '#7c3aed' },
  ]
  const wrap = (n: number) => ((n % teams.length) + teams.length) % teams.length
  for (let d = -3; d <= 14; d++) {
    const date = new Date(today.getTime() + d * 86400000)
    const count = d === 0 ? 4 : d === 1 ? 3 : d % 2 === 0 ? 2 : 1
    for (let i = 0; i < count; i++) {
      const h = teams[wrap(d + i + 0)]
      const a = teams[wrap(d + i + 3)]
      out.push({
        id: `${d}-${i}`,
        date: date.toISOString(),
        time: ['7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM'][(d + i) % 4],
        status: d < 0 ? 'final' : d === 0 ? (i === 0 ? 'in_progress' : 'scheduled') : 'scheduled',
        home_abbr: h.abbr,
        away_abbr: a.abbr,
        home_color: h.color,
        away_color: a.color,
        home_score: d < 0 ? Math.floor(Math.random() * 5) + 1 : i === 0 && d === 0 ? 3 : undefined,
        away_score: d < 0 ? Math.floor(Math.random() * 5) : i === 0 && d === 0 ? 2 : undefined,
        venue: '',
      })
    }
  }
  return out
})()

// Localized short weekday names (Sun-first), consistent with the browser-locale
// `monthLabel` below — avoids hardcoded English day headers.
const DAY_LABELS = Array.from({ length: 7 }, (_, i) =>
  // 2023-01-01 is a Sunday, so index 0 → Sun.
  new Date(2023, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'short' }),
)

export function Schedule() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [games, setGames] = useState<ScheduleGame[]>(FALLBACK)
  const [monthOffset, setMonthOffset] = useState(0)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/schedule?limit=200')
      .then((rows) => {
        if (!cancelled) {
          const list = unwrapList<ScheduleGame>(rows).map(normalizeGame)
          setGames(list.length ? list : FALLBACK)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  const { weeks, monthLabel } = useMemo(() => {
    const today = new Date()
    const target = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
    const monthStart = new Date(target.getFullYear(), target.getMonth(), 1)
    const monthEnd = new Date(target.getFullYear(), target.getMonth() + 1, 0)
    const startDow = monthStart.getDay()
    const totalDays = monthEnd.getDate()
    const cells: { date: Date; inMonth: boolean; isToday: boolean; games: ScheduleGame[] }[] = []
    for (let i = 0; i < startDow; i++) {
      const d = new Date(monthStart.getTime() - (startDow - i) * 86400000)
      cells.push({ date: d, inMonth: false, isToday: false, games: [] })
    }
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), i)
      const isToday = d.toDateString() === today.toDateString()
      const cellGames = games.filter((g) => new Date(g.date).toDateString() === d.toDateString())
      cells.push({ date: d, inMonth: true, isToday, games: cellGames })
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date
      cells.push({
        date: new Date(last.getTime() + 86400000),
        inMonth: false,
        isToday: false,
        games: [],
      })
    }
    const wks: (typeof cells)[] = []
    for (let i = 0; i < cells.length; i += 7) wks.push(cells.slice(i, i + 7))
    return {
      weeks: wks,
      monthLabel: target.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    }
  }, [games, monthOffset])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(6))}>
      <header>
        <p
          className={cm.cn('text-[11px] font-black uppercase tracking-[0.28em] text-primary mb-2')}
        >
          {t('schedule.eyebrow', {}, { defaultValue: 'The slate' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('nav.schedule', {}, { defaultValue: 'Schedule' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'schedule.subtitle',
            {},
            {
              defaultValue:
                'Calendar view of fixtures across the season — tap any day for box scores.',
            },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {monthLabel}
        </h2>
        <div className={cm.flex({ align: 'center', gap: 'xs' })}>
          <button
            type="button"
            onClick={() => setMonthOffset((o) => o - 1)}
            className={cm.cn(
              cm.sp('p', 2),
              'rounded-full hover:bg-surface-container-low transition-colors',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
              chevron_left
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset(0)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-full font-bold text-primary hover:bg-surface-container-low',
            )}
          >
            {t('status.today', {}, { defaultValue: 'Today' })}
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset((o) => o + 1)}
            className={cm.cn(
              cm.sp('p', 2),
              'rounded-full hover:bg-surface-container-low transition-colors',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
              chevron_right
            </span>
          </button>
        </div>
      </div>

      <div
        className={cm.cn('rounded-2xl border border-outline-variant/40 bg-surface overflow-hidden')}
      >
        <div
          className={cm.cn(
            'grid grid-cols-7 border-b border-outline-variant/40 bg-surface-container-lowest',
          )}
        >
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant p-3 text-center',
              )}
            >
              {d}
            </div>
          ))}
        </div>
        <div className={cm.cn('grid grid-cols-7')}>
          {weeks.flat().map((cell, i) => (
            <div
              key={i}
              className={cm.cn(
                'min-h-[110px] p-2 border-b border-r border-outline-variant/40 transition-colors',
                cell.inMonth ? 'bg-surface' : 'bg-surface-container-lowest opacity-60',
                cell.isToday ? 'ring-2 ring-primary ring-inset' : '',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cell.isToday
                      ? 'font-extrabold text-primary'
                      : 'font-bold text-on-surface-variant',
                    'tabular-nums',
                  )}
                >
                  {cell.date.getDate()}
                </span>
                {cell.games.length > 0 ? (
                  <span
                    className={cm.cn(
                      'text-[9px] uppercase tracking-widest font-black text-on-surface-variant',
                    )}
                  >
                    {cell.games.length}
                  </span>
                ) : null}
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('mt', 1))}>
                {cell.games.slice(0, 3).map((g) => {
                  const isLive = g.status === 'live' || g.status === 'in_progress'
                  const isFinal = g.status === 'final'
                  const tone = isLive
                    ? 'border-l-live bg-live/10'
                    : isFinal
                      ? 'border-l-final bg-final/10'
                      : 'border-l-upcoming bg-primary/5'
                  return (
                    <Link
                      key={g.id}
                      to={`/matches/${g.id}`}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        'border-l-2 px-2 py-1 rounded-r text-[11px] font-bold tabular-nums hover:bg-primary/10 transition-colors',
                        tone,
                      )}
                    >
                      <span className={cm.cn('text-on-surface-variant truncate')}>
                        {g.home_abbr}
                      </span>
                      <span className={cm.cn('text-on-surface-variant')}>@</span>
                      <span className={cm.cn('text-on-surface-variant truncate')}>
                        {g.away_abbr}
                      </span>
                      {isFinal && g.home_score != null && g.away_score != null ? (
                        <span
                          className={cm.cn('ml-auto text-on-surface')}
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {g.home_score}-{g.away_score}
                        </span>
                      ) : null}
                    </Link>
                  )
                })}
                {cell.games.length > 3 ? (
                  <span className={cm.cn('text-[10px] text-on-surface-variant pl-2')}>
                    {t(
                      'schedule.moreGames',
                      { count: cell.games.length - 3 },
                      { defaultValue: '+{{count}} more' },
                    )}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
