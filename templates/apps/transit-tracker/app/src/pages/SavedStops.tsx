import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LineBadge, type LineBadgeLine } from '../components/LineBadge.js'

interface LineRow extends LineBadgeLine {
  /** Stop codes in direction-0 order (from /api/network/lines). */
  stops?: string[]
}

/**
 * Saved stops: the user's board shortcuts with unsave controls. Saving is
 * done from a stop's board (StopBoard); this page manages the collection.
 */
export function SavedStops() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [saved, setSaved] = useState<
    Array<{ id: string; code: string; name: string; hub: boolean; saved_at?: string }>
  >([])
  const [lines, setLines] = useState<LineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  // Inline undo for a removal: the row is gone immediately (e2e-stable), and
  // a transient toast offers one-tap restore — the light-touch confirm that
  // suits a low-stakes, reversible delete.
  const [removed, setRemoved] = useState<{
    row: { code: string; name: string }
    undo: boolean
  } | null>(null)
  const [actionError, setActionError] = useState(false)

  useEffect(() => {
    if (!removed || removed.undo) return
    const id = setTimeout(() => setRemoved(null), 6000)
    return () => clearTimeout(id)
  }, [removed])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [savedRes, linesRes] = await Promise.all([
        http.get('/api/saved-stops'),
        // Pinned-lines health needs the roster; failure is non-fatal.
        http.get('/api/network/lines').catch(() => ({ data: [] as LineRow[] })),
      ])
      const data = (savedRes as { data?: unknown }).data ?? savedRes
      setSaved(Array.isArray(data) ? (data as typeof saved) : [])
      const lineData = (linesRes as { data?: unknown }).data ?? linesRes
      setLines(Array.isArray(lineData) ? (lineData as LineRow[]) : [])
      setError(null)
    } catch (err) {
      console.error('[SavedStops] load failed:', err)
      setError(
        t(
          'savedStops.error',
          {},
          { defaultValue: 'Could not load saved stops. Please try again.' },
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void load()
  }, [load, nonce])

  const undoRemove = async (): Promise<void> => {
    if (!removed) return
    const { row } = removed
    setRemoved(null)
    try {
      await http.post('/api/saved-stops', { stop_code: row.code })
      void load()
      void track({ name: 'stop.saved', properties: { stop_code: row.code, restored: true } })
    } catch (err) {
      console.error('[SavedStops] undo remove failed:', err)
      setActionError(true)
    }
  }

  const unsave = async (row: { code: string; name: string }): Promise<void> => {
    setActionError(false)
    try {
      await http.delete(`/api/saved-stops/${encodeURIComponent(row.code)}`)
      setSaved((rows) => rows.filter((r) => r.code !== row.code))
      setRemoved({ row, undo: false })
      void track({ name: 'stop.unsaved', properties: { stop_code: row.code } })
    } catch (err) {
      console.error('[SavedStops] unsave failed:', err)
      setActionError(true)
    }
  }

  // Lines serving at least one pinned stop — the health panel's roster.
  const savedCodes = new Set(saved.map((row) => row.code))
  const pinnedLines = lines.filter((line) =>
    (line.stops ?? []).some((code) => savedCodes.has(code)),
  )

  return (
    <div className={cm.cn(cm.maxW('3xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('savedStops.eyebrow', {}, { defaultValue: 'Your network' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            'leading-tight tracking-tight',
          )}
        >
          {t('savedStops.title', {}, { defaultValue: 'Saved stops' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'savedStops.subtitle',
            {},
            { defaultValue: 'The boards you ride daily, one tap from the home screen.' },
          )}
        </p>
      </header>

      {/* Design's "Active Commute Presets" — how saved stops become a
          commute: pair a pinned stop with a departure window and the
          departure-reminder notifications watch it for you. */}
      <section
        data-mol-id="saved-commute-presets"
        className={cm.cn(
          cm.sp('p', 5),
          cm.sp('mb', 8),
          'bg-surface-container-low rounded-2xl ring-1 ring-outline-variant/40',
        )}
      >
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' })}>
          <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
            {t('savedStops.presetsHeading', {}, { defaultValue: 'Active commute presets' })}
          </h2>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full px-2.5 py-0.5 bg-surface-container text-primary',
            )}
          >
            {t(
              'savedStops.presetsBadge',
              { count: saved.length },
              { defaultValue: '{{count}} stop(s) pinned' },
            )}
          </span>
        </div>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 2),
            'text-on-surface-variant leading-relaxed',
          )}
        >
          {t(
            'savedStops.presetsBody',
            {},
            {
              defaultValue:
                'A commute preset is a pinned stop plus a departure window: pair a saved stop with the departure-reminders notification and the board watches the window for you, alarm sized to the walk.',
            },
          )}
        </p>
        <ul className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 3))}>
          <li>
            <Link
              to="/nearby"
              data-mol-id="saved-presets-browse"
              className={cm.cn(
                'inline-block',
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full ring-1 ring-outline-variant text-primary hover:ring-primary/40 transition-colors',
              )}
            >
              {t('savedStops.presetsBrowseCta', {}, { defaultValue: 'Pin a stop' })}
            </Link>
          </li>
          <li>
            <Link
              to="/plan"
              data-mol-id="saved-presets-plan"
              className={cm.cn(
                'inline-block',
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full ring-1 ring-outline-variant text-primary hover:ring-primary/40 transition-colors',
              )}
            >
              {t('savedStops.presetsPlanCta', {}, { defaultValue: 'Plan the ride' })}
            </Link>
          </li>
        </ul>
      </section>

      {error ? (
        <div className={cm.cn(cm.sp('py', 8), cm.textCenter)}>
          <p className={'text-error'}>{error}</p>
          <button
            type="button"
            onClick={() => setNonce((n) => n + 1)}
            className={cm.cn(
              cm.sp('mt', 3),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-lg text-primary hover:bg-primary/10 transition-colors',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('savedStops.loading', {}, { defaultValue: 'Loading saved stops…' })}
        </p>
      ) : saved.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 16),
            cm.textCenter,
            'rounded-2xl bg-surface-container-low ring-1 ring-outline-variant/40',
          )}
        >
          <span
            className={'material-symbols-outlined text-4xl text-on-surface-variant'}
            aria-hidden="true"
          >
            bookmark_add
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mt', 3))}>
            {t('savedStops.emptyTitle', {}, { defaultValue: 'No saved stops yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'savedStops.emptyBody',
              {},
              { defaultValue: 'Open any stop and tap Save stop to pin its board here.' },
            )}
          </p>
          <Link
            to="/nearby"
            data-mol-id="saved-browse-link"
            className={cm.cn(
              'inline-block',
              cm.sp('mt', 6),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm',
            )}
          >
            {t('savedStops.browseCta', {}, { defaultValue: 'Browse stops' })}
          </Link>
        </div>
      ) : (
        <section data-mol-id="saved-pinned-stations">
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
            {t('savedStops.pinnedHeading', {}, { defaultValue: 'Pinned transit stations' })}
          </h2>
          <ul className={cm.flex({ direction: 'col', gap: 'sm' })}>
            {saved.map((row) => (
              <li
                key={row.id}
                data-mol-id={`saved-stop-${row.code}`}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface rounded-xl ring-1 ring-outline-variant/40',
                )}
              >
                <Link to={`/stops/${row.code}`} className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={'material-symbols-outlined text-on-surface-variant'}
                    aria-hidden="true"
                  >
                    {row.hub ? 'transfer_within_a_station' : 'directions_bus'}
                  </span>
                  <span>
                    <span className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                      {row.name}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'block text-on-surface-variant tabular-nums',
                      )}
                    >
                      {row.code}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => void unsave(row)}
                  data-mol-id={`saved-unsave-${row.code}`}
                  aria-label={t(
                    'savedStops.unsaveAriaLabel',
                    { stop: row.name },
                    { defaultValue: 'Remove {{stop}} from saved stops' },
                  )}
                  className={cm.cn(
                    'inline-flex items-center justify-center',
                    cm.w(9),
                    cm.h(9),
                    cm.touchTargetCompact,
                    'rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors',
                  )}
                >
                  <span className={'material-symbols-outlined text-lg'} aria-hidden="true">
                    bookmark_remove
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Design's "AMTA SmartPass Card" — fare media lives with the account;
          the app surfaces its status, never the credential itself. */}
      <section
        data-mol-id="saved-smartpass"
        className={cm.cn(
          cm.sp('p', 5),
          cm.sp('mt', 8),
          'bg-surface rounded-2xl ring-1 ring-outline-variant/40',
        )}
      >
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' })}>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                'shrink-0 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20',
              )}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-xl">contactless</span>
            </span>
            <div>
              <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                {t('savedStops.smartpassHeading', {}, { defaultValue: 'AMTA SmartPass card' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 0.5),
                  'text-on-surface-variant uppercase tracking-widest font-semibold tabular-nums',
                )}
              >
                {t(
                  'savedStops.smartpassHolder',
                  {},
                  { defaultValue: 'Commuter pass · NFC fare media' },
                )}
              </p>
            </div>
          </div>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full px-2.5 py-0.5',
            )}
            style={{ backgroundColor: 'var(--color-live-light)', color: 'var(--color-live)' }}
          >
            {t('savedStops.smartpassActive', {}, { defaultValue: 'NFC sync active' })}
          </span>
        </div>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 3),
            'text-on-surface-variant leading-relaxed',
          )}
        >
          {t(
            'savedStops.smartpassBody',
            {},
            {
              defaultValue:
                "Your SmartPass rides the same account as these boards: fare taps settle on the transit authority's own ledger, while the app only remembers the pass so planner fares and zone hints stay right. Card and billing details never enter this app.",
            },
          )}
        </p>
      </section>

      {/* Design's "Pinned Lines Health" — the lines that serve the pinned
          stops, with their corridor status. */}
      {pinnedLines.length > 0 ? (
        <section data-mol-id="saved-lines-health" className={cm.sp('mt', 8)}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
            {t('savedStops.linesHealthHeading', {}, { defaultValue: 'Pinned lines health' })}
          </h2>
          <ul className={cm.flex({ direction: 'col', gap: 'sm' })}>
            {pinnedLines.map((line) => (
              <li
                key={line.code}
                data-mol-id={`saved-line-health-${line.code}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface rounded-xl ring-1 ring-outline-variant/40',
                )}
              >
                <LineBadge line={line} size="sm" />
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {line.name}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'ml-auto inline-flex items-center gap-1.5 uppercase tracking-widest',
                  )}
                  style={{ color: 'var(--color-live)' }}
                >
                  <span
                    className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull)}
                    style={{ backgroundColor: 'var(--color-live)' }}
                    aria-hidden="true"
                  />
                  {t('savedStops.lineNormal', {}, { defaultValue: 'Normal service' })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {actionError ? (
        <p role="status" className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-error')}>
          {t(
            'savedStops.actionError',
            {},
            { defaultValue: 'Could not update your saved stops. Please try again.' },
          )}
        </p>
      ) : null}

      {removed && !removed.undo ? (
        <div
          role="status"
          data-mol-id="saved-undo-toast"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md items-center justify-between rounded-xl bg-inverse-surface text-inverse-on-surface shadow-lg',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'truncate')}>
            {t(
              'savedStops.removedToast',
              { stop: removed.row.name },
              { defaultValue: 'Removed {{stop}}' },
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setRemoved((prev) => (prev ? { ...prev, undo: true } : prev))
              void undoRemove()
            }}
            data-mol-id="saved-undo-button"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'shrink-0 rounded-lg text-inverse-primary hover:underline',
            )}
          >
            {t('common.undo', {}, { defaultValue: 'Undo' })}
          </button>
        </div>
      ) : null}
    </div>
  )
}
