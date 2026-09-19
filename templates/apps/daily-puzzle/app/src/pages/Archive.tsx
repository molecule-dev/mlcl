import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ArchiveDay {
  date: string
  puzzleNumber: number
  practice: true
  played: boolean
  solved: boolean
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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/puzzles/archive')
      .then((res) => {
        if (!cancelled) setDays(unwrap<{ days: ArchiveDay[] }>(res)?.days ?? [])
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
    </section>
  )
}

export default Archive
