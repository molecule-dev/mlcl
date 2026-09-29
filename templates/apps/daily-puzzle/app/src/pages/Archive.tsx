import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type BoardGuess, PuzzleBoard } from '../components/PuzzleBoard.js'

interface ArchiveDay {
  date: string
  puzzleNumber: number
  practice: true
  played: boolean
  solved: boolean
  attempts: number
}

/** GET /api/puzzles/:date shape — only what the inspection card needs. */
interface InspectionState {
  puzzleNumber: number
  guesses: BoardGuess[]
  status: 'playing' | 'won' | 'lost'
  attempts: number
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

function formatDay(dateKey: string): string {
  // Stable UTC formatting — the archive is keyed by UTC calendar day.
  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Past puzzles, replayable forever as practice. The list is derived from the
 * calendar (not from puzzle rows), so every day shows even if nobody has
 * played it yet — clicking an unplayed day creates it lazily.
 */
export function Archive() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [days, setDays] = useState<ArchiveDay[]>([])
  const [inspection, setInspection] = useState<InspectionState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/puzzles/archive')
      .then(async (res) => {
        const loaded = unwrap<{ days: ArchiveDay[] }>(res)?.days ?? []
        if (cancelled) return
        setDays(loaded)
        // Board inspection: reconstruct the most recent solved game from the
        // server-owned guesses. Only already-solved days are fetched (GET on
        // an unplayed day lazily creates that puzzle, which we must not do).
        const lastSolved = loaded
          .filter((d) => d.solved)
          .sort((a, b) => b.puzzleNumber - a.puzzleNumber)[0]
        if (!lastSolved) return
        try {
          const state = unwrap<InspectionState>(await http.get(`/api/puzzles/${lastSolved.date}`))
          if (!cancelled && state.status === 'won') setInspection(state)
        } catch (_error) {
          // inspection is a bonus card — never fail the page over it
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('archive.loadError', {}, { defaultValue: 'Could not load the archive.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <section className={cm.cn(cm.container({ size: 'md' }), 'py-10')}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('archive.title', {}, { defaultValue: 'Archive' })}
      </h1>
      <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant mt-1 mb-6')}>
        {t(
          'archive.subhead',
          {},
          {
            defaultValue: 'Replay any past day as practice — no streaks, no stats, all of the fun.',
          },
        )}
      </p>

      {loading && (
        <span
          className={cm.spinner()}
          aria-label={t('common.loading', {}, { defaultValue: 'Loading' })}
        />
      )}
      {error && <p className={cm.alert({ variant: 'error' })}>{error}</p>}

      <ul className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))} data-mol-id="archive-list">
        {days.map((day) => (
          <li key={day.date}>
            <Link
              to={`/archive/${day.date}`}
              className={cm.cn(
                cm.card(),
                cm.flex({ align: 'center', justify: 'between' }),
                'px-4 py-3 hover:border-primary/50 transition-colors',
              )}
              data-mol-id={`archive-link-${day.date}`}
            >
              <span className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                <span
                  className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'text-on-surface')}
                >
                  {formatDay(day.date)}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'archive.puzzleNumber',
                    { number: day.puzzleNumber },
                    { defaultValue: `#${day.puzzleNumber}` },
                  )}
                </span>
              </span>
              <span className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                {day.played ? (
                  day.solved ? (
                    <span className={cm.cn(cm.badge({ variant: 'success' }), 'font-semibold')}>
                      {t(
                        'archive.solvedIn',
                        { count: day.attempts },
                        {
                          defaultValue: `Solved in ${day.attempts}`,
                        },
                      )}
                    </span>
                  ) : (
                    <span className={cm.cn(cm.badge({ variant: 'error' }), 'font-semibold')}>
                      {t('archive.missed', {}, { defaultValue: 'Missed' })}
                    </span>
                  )
                ) : (
                  <span className={cm.cn(cm.badge({ variant: 'info' }), 'font-semibold')}>
                    {t('archive.notPlayed', {}, { defaultValue: 'Not played' })}
                  </span>
                )}
                <span aria-hidden="true">›</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Board inspection: your latest solve, reconstructed tile by tile. */}
      {inspection && (
        <section
          className={cm.cn(cm.card(), cm.cardPadding('md'), cm.stack(4), 'mt-6')}
          data-mol-id="archive-inspection"
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 2 }),
              'border-b border-outline-variant/60 pb-3',
            )}
          >
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wider text-primary',
                )}
              >
                {t('archive.inspection.eyebrow', {}, { defaultValue: 'Board inspection' })}
              </p>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'mt-0.5')}>
                {t(
                  'archive.inspection.title',
                  { number: inspection.puzzleNumber },
                  { defaultValue: `Puzzle #${inspection.puzzleNumber} analysis` },
                )}
              </h2>
            </div>
            <span
              className={cm.cn(cm.badge({ variant: 'success' }), 'font-semibold whitespace-nowrap')}
            >
              {t(
                'archive.inspection.solvedIn',
                { count: inspection.attempts },
                { defaultValue: `Solved in ${inspection.attempts}` },
              )}
            </span>
          </div>
          <div className={cm.cn('flex justify-center')}>
            <PuzzleBoard guesses={inspection.guesses} animate={false} />
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant text-center')}>
            {t(
              'archive.inspection.note',
              {},
              { defaultValue: 'Your most recent solve, replayed tile by tile.' },
            )}
          </p>
        </section>
      )}
    </section>
  )
}

export default Archive
