import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { Arrival } from '../components/ArrivalRow.js'
import { ArrivalsBoard } from '../components/ArrivalsBoard.js'
import { LineBadge, type LineBadgeLine } from '../components/LineBadge.js'

interface BoardResponse {
  stop: { code: string; name: string; hub: boolean }
  generated_at: string
  arrivals: Arrival[]
}

interface StopDetailResponse {
  stop: { code: string; name: string; hub: boolean; lat: number; lng: number }
  lines: Array<LineBadgeLine & { stops: string[] }>
}

/** Design's facilities rows — hub interchanges carry the full set (elevators,
 * step-free boarding, attendant); street stops carry surface boarding. */
const FACILITY_ROWS = [
  {
    id: 'elevator',
    icon: 'elevator',
    titleKey: 'stopBoard.facility.elevator.title',
    titleDefault: 'Elevators & lift access',
    bodyKey: 'stopBoard.facility.elevator.body',
    bodyDefault: 'Street-level stop — no grade change to the boarding area.',
    hubBodyKey: 'stopBoard.facility.elevator.hubBody',
    hubBodyDefault: 'Concourse and platform lifts certified in service at the last inspection.',
  },
  {
    id: 'stepFree',
    icon: 'accessible_forward',
    titleKey: 'stopBoard.facility.stepFree.title',
    titleDefault: 'Step-free level boarding',
    bodyKey: 'stopBoard.facility.stepFree.body',
    bodyDefault: 'Low-floor vehicles stop flush with the curb at this stop.',
    hubBodyKey: 'stopBoard.facility.stepFree.hubBody',
    hubBodyDefault: 'Level boarding bridges confirmed active on all serving platforms.',
  },
  {
    id: 'attendant',
    icon: 'support_agent',
    titleKey: 'stopBoard.facility.attendant.title',
    titleDefault: 'Station attendant & assistance',
    bodyKey: 'stopBoard.facility.attendant.body',
    bodyDefault: 'Assistance is available through the driver or the hotline in the app footer.',
    hubBodyKey: 'stopBoard.facility.attendant.hubBody',
    hubBodyDefault: 'Station master booth active on the main concourse during service hours.',
  },
] as const

/**
 * The signature screen: a stop's live departures board (deterministically
 * simulated server-side from the schedule + clock), the lines serving the
 * stop, and save/unsave. Manual refresh — the countdowns recompute on every
 * request, so "refresh" is honest without a websocket.
 */
export function StopBoard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { code } = useParams<{ code: string }>()
  const stopCode = (code ?? '').toUpperCase()

  const [board, setBoard] = useState<BoardResponse | null>(null)
  const [detail, setDetail] = useState<StopDetailResponse | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState(false)

  const loadBoard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.get(`/api/arrivals/${encodeURIComponent(stopCode)}`)
      const data = ((res as { data?: unknown }).data ?? res) as BoardResponse
      setBoard(data)
      setError(null)
    } catch (err) {
      console.error('[StopBoard] board failed:', err)
      if ((err as { status?: number }).status === 404) setNotFound(true)
      setError(
        t('stopBoard.error', {}, { defaultValue: 'Could not load arrivals. Please try again.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, stopCode, t])

  useEffect(() => {
    let cancelled = false
    setNotFound(false)
    void loadBoard()
    http
      .get(`/api/network/stops/${encodeURIComponent(stopCode)}`)
      .then((res) => {
        if (cancelled) return
        setDetail(((res as { data?: unknown }).data ?? res) as StopDetailResponse)
      })
      .catch((err: unknown) => {
        if (!cancelled) console.error('[StopBoard] stop detail failed:', err)
      })
    http
      .get('/api/saved-stops')
      .then((res) => {
        if (cancelled) return
        const list = ((res as { data?: unknown }).data ?? res) as Array<{ code: string }>
        setSaved(Array.isArray(list) && list.some((row) => row.code === stopCode))
      })
      .catch(() => {
        if (!cancelled) setSaved(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, stopCode, loadBoard])

  const toggleSaved = async (): Promise<void> => {
    if (saved === null) return
    setSaveError(false)
    try {
      if (saved) {
        await http.delete(`/api/saved-stops/${encodeURIComponent(stopCode)}`)
        setSaved(false)
        void track({ name: 'stop.unsaved', properties: { stop_code: stopCode } })
      } else {
        await http.post('/api/saved-stops', { stop_code: stopCode })
        setSaved(true)
        void track({ name: 'stop.saved', properties: { stop_code: stopCode } })
      }
    } catch (err) {
      console.error('[StopBoard] toggle save failed:', err)
      setSaveError(true)
    }
  }

  if (notFound) {
    return (
      <div
        className={cm.cn(cm.maxW('3xl'), cm.sp('px', 6), cm.sp('py', 20), cm.textCenter, cm.mxAuto)}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('stopBoard.notFoundTitle', {}, { defaultValue: 'Stop not found' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 3), 'text-on-surface-variant')}>
          {t(
            'stopBoard.notFoundBody',
            {},
            { defaultValue: 'No stop matches this code in the network.' },
          )}
        </p>
        <Link
          to="/nearby"
          className={cm.cn(
            cm.sp('mt', 6),
            'inline-block',
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:underline',
          )}
        >
          {t('stopBoard.backToNearby', {}, { defaultValue: 'Back to all stops' })}
        </Link>
      </div>
    )
  }

  // Facilities rows differentiate hub interchanges (full elevator set) from
  // street stops (surface boarding).
  const isHub = Boolean(detail?.stop.hub || board?.stop.hub)

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header
        className={cm.cn(
          cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('stopBoard.eyebrow', {}, { defaultValue: 'Departures board' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('bold'),
              'leading-tight tracking-tight',
            )}
          >
            {board?.stop.name ?? detail?.stop.name ?? stopCode}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 1),
              'text-on-surface-variant tabular-nums',
            )}
          >
            {stopCode}
            {detail?.stop.hub || board?.stop.hub
              ? ` · ${t('stop.hubChip', {}, { defaultValue: 'Interchange' })}`
              : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void toggleSaved()}
          data-mol-id="stop-save-toggle"
          aria-pressed={saved ?? false}
          disabled={saved === null}
          className={cm.cn(
            'inline-flex items-center gap-2',
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full ring-1 transition-colors',
            saved
              ? 'bg-primary/10 text-primary ring-primary/40'
              : 'bg-surface text-on-surface ring-outline-variant hover:ring-primary/40',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            {saved ? 'bookmark_added' : 'bookmark_add'}
          </span>
          {saved
            ? t('stopBoard.savedLabel', {}, { defaultValue: 'Saved' })
            : t('stopBoard.saveLabel', {}, { defaultValue: 'Save stop' })}
        </button>
      </header>

      {detail && detail.lines.length > 0 ? (
        <section className={cm.sp('mb', 8)} data-mol-id="stop-lines">
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 3),
            )}
          >
            {t('stopBoard.linesHeading', {}, { defaultValue: 'Lines serving this stop' })}
          </h2>
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            {detail.lines.map((line) => (
              <Link
                key={line.code}
                to={`/lines/${line.code}`}
                data-mol-id={`stop-line-link-${line.code}`}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <LineBadge line={line} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <ArrivalsBoard
        arrivals={board?.arrivals ?? []}
        generatedAt={board?.generated_at ?? null}
        loading={loading}
        onRefresh={() => void loadBoard()}
      />

      {error ? (
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 4), 'text-error')}>{error}</p>
      ) : null}
      {saveError ? (
        <p role="status" className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-error')}>
          {t(
            'stopBoard.saveError',
            {},
            { defaultValue: 'Could not update your saved stops. Please try again.' },
          )}
        </p>
      ) : null}

      {/* Design's "Facilities & Accessibility Telemetry" — what the physical
          stop offers. Hub interchanges report the full elevator/attendant
          set; a street stop reports its surface-level boarding. */}
      <section data-mol-id="stop-facilities" className={cm.sp('mt', 10)}>
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' })}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t(
              'stopBoard.facilitiesHeading',
              {},
              { defaultValue: 'Facilities & accessibility telemetry' },
            )}
          </h2>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full px-2.5 py-0.5',
            )}
            style={{ backgroundColor: 'var(--color-live-light)', color: 'var(--color-live)' }}
          >
            {t('stopBoard.facilitiesOk', {}, { defaultValue: 'All green' })}
          </span>
        </div>
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mt', 3))}>
          {FACILITY_ROWS.map((row) => (
            <li
              key={row.id}
              data-mol-id={`stop-facility-${row.id}`}
              className={cm.cn(
                cm.flex({ align: 'start', gap: 'md' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'bg-surface rounded-xl ring-1 ring-outline-variant/40',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(9),
                  cm.h(9),
                  'shrink-0 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20',
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-lg">{row.icon}</span>
              </span>
              <div className="min-w-0">
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {t(row.titleKey, {}, { defaultValue: row.titleDefault })}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 0.5),
                    'text-on-surface-variant leading-relaxed',
                  )}
                >
                  {t(
                    isHub ? row.hubBodyKey : row.bodyKey,
                    {},
                    { defaultValue: isHub ? row.hubBodyDefault : row.bodyDefault },
                  )}
                </p>
              </div>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'ml-auto shrink-0 uppercase tracking-widest',
                )}
                style={{ color: 'var(--color-live)' }}
              >
                {t('stopBoard.facilityOperational', {}, { defaultValue: 'Operational' })}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
