import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Meeting {
  id: string
  title: string
  recorded_at: string
  duration_minutes: number
  source: string
  transcription_status: string
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmtDuration(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

/**
 * Meetings index — full list of every meeting the caller owns. Linked from
 * sidebar nav. The Dashboard surfaces a recent subset; this page is the
 * canonical "browse-everything" view.
 *
 * @returns The rendered meetings list.
 */
export function Meetings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/meetings')
      .then((res) => {
        if (!cancelled) setMeetings(unwrapList<Meeting>(res))
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('meetings.loadError', {}, { defaultValue: 'Failed to load meetings.' }))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const sorted = useMemo(
    () => [...meetings].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at)),
    [meetings],
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }))}
      >
        <div className={cm.cn(cm.stack(1))}>
          <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {t('meetings.heading', {}, { defaultValue: 'Meetings' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'meetings.subheading',
              {},
              { defaultValue: 'Every recorded, uploaded, and synced meeting.' },
            )}
          </p>
        </div>
        <Link
          to="/record"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity',
          )}
        >
          {t('meetings.recordCta', {}, { defaultValue: 'Record meeting' })}
        </Link>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : sorted.length === 0 ? (
        <div
          className={cm.cn(
            cm.card(),
            cm.sp('py', 16),
            cm.sp('px', 8),
            cm.flex({
              direction: 'col',
              align: 'center',
              justify: 'center',
              gap: 'md',
            }),
            cm.textCenter,
          )}
        >
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('meetings.empty.heading', {}, { defaultValue: 'No meetings yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-sm')}>
            {t(
              'meetings.empty.body',
              {},
              {
                defaultValue:
                  'Start a recording or upload an audio file to get a transcript and AI summary.',
              },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.cn(cm.stack(2))}>
          {sorted.map((m) => (
            <li
              key={m.id}
              className={cm.cn(
                cm.card(),
                cm.sp('p', 4),
                cm.flex({
                  align: 'center',
                  justify: 'between',
                  gap: 'md',
                  wrap: 'wrap',
                }),
              )}
            >
              <Link to={`/meetings/${m.id}`} className={cm.cn('min-w-0', cm.stack(1), 'flex-1')}>
                <span
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('base'),
                    'truncate block',
                  )}
                >
                  {m.title}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                  {fmtDate(m.recorded_at)} · {fmtDuration(m.duration_minutes)} ·{' '}
                  {t(`meetings.source.${m.source}`, {}, { defaultValue: m.source })}
                </span>
              </Link>
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'rounded-full bg-secondary-container/40 text-on-secondary-container uppercase tracking-wide',
                )}
              >
                {t(
                  `meetings.status.${m.transcription_status}`,
                  {},
                  { defaultValue: m.transcription_status },
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
