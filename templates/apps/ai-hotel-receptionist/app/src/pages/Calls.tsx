import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatDuration, formatTime, languageLabel } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface CallRow {
  id: string
  voice_agent_id: string
  voice_agent_name: string | null
  direction: string
  detected_language: string | null
  started_at: string
  duration_seconds: number
  outcome: string | null
  summary: string | null
}

/**
 * Outcome chip tone — the design's chip grammar: confirmed bookings ride the
 * gold (secondary) accent, in-progress lines pulse green (tertiary), plain
 * informational outcomes stay neutral surface.
 */
function outcomeChipClass(outcome: string): string {
  if (outcome === 'booked') {
    return 'bg-secondary/10 border border-secondary/30 text-secondary'
  }
  if (outcome === 'in progress') {
    return 'bg-tertiary-fixed/40 border border-tertiary-fixed text-on-tertiary-fixed-variant'
  }
  return 'bg-surface-container border border-outline-variant text-on-surface'
}

/** Decorative live-waveform heights (design's gold call-card bars). */
const WAVE_HEIGHTS = ['h-2', 'h-3', 'h-4', 'h-3', 'h-5', 'h-4', 'h-2', 'h-4', 'h-3', 'h-4', 'h-2']
const WAVE_VARIANTS = ['', 'sb-wave-bar-2', 'sb-wave-bar-3', 'sb-wave-bar-4']

export function Calls() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [calls, setCalls] = useState<CallRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [outcomeFilter, setOutcomeFilter] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await http.get('/api/calls')
        if (cancelled) return
        setCalls(unwrapList<CallRow>(res))
      } catch (_e) {
        if (!cancelled) {
          setError(t('calls.loadError', {}, { defaultValue: 'Failed to load calls.' }))
          setCalls([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  // Ledger telemetry + segmentation are derived from the SAME fetched list —
  // no extra endpoints, the design's KPI strip fed by real data.
  const kpis = useMemo(() => {
    const list = calls ?? []
    const booked = list.filter((c) => c.outcome === 'booked').length
    const inProgress = list.filter((c) => !c.outcome).length
    const byLang = new Map<string, number>()
    for (const c of list) {
      const key = c.detected_language ?? '—'
      byLang.set(key, (byLang.get(key) ?? 0) + 1)
    }
    const langs = [...byLang.entries()].sort((a, b) => b[1] - a[1])
    return { total: list.length, booked, inProgress, langs }
  }, [calls])

  const filterPills = useMemo(() => {
    const list = calls ?? []
    const counts = new Map<string, number>()
    for (const c of list) {
      const key = c.outcome ?? 'in progress'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [calls])

  const visibleCalls = useMemo(() => {
    const list = calls ?? []
    if (outcomeFilter === null) return list
    return list.filter((c) => (c.outcome ?? 'in progress') === outcomeFilter)
  }, [calls, outcomeFilter])

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      {/* Header strip — eyebrow ledger trail, serif headline, gold dial action */}
      <div
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
          'border-b border-outline-variant/60 pb-6',
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider text-on-surface-variant',
            )}
          >
            <span>{t('calls.eyebrow', {}, { defaultValue: 'Switchboard autonomous ledger' })}</span>
            <span className="sb-icon flex h-3 w-3 items-center justify-center" aria-hidden="true">
              <span className="material-symbols-outlined">chevron_right</span>
            </span>
            <span className="text-secondary">
              {t('calls.eyebrowAudit', {}, { defaultValue: 'Telephony audit' })}
            </span>
          </p>
          <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md', wrap: 'wrap' }))}>
            <h1
              className={cm.cn('sb-serif mt-1 text-3xl font-normal tracking-tight text-primary')}
              data-mol-id="calls-heading"
            >
              {t('calls.heading', {}, { defaultValue: 'Calls' })}
            </h1>
            <span className={cm.cn(cm.textSize('sm'), 'italic text-on-surface-variant')}>
              {t(
                'calls.tagline',
                {},
                { defaultValue: '“Every call answered, in every language.”' },
              )}
            </span>
          </div>
        </div>
        <Link
          to="/simulator"
          data-mol-id="calls-simulator-link"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-lg border border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors',
          )}
        >
          <span className="sb-icon flex h-4 w-4 items-center justify-center" aria-hidden="true">
            <span className="material-symbols-outlined">phone_in_talk</span>
          </span>
          <span>{t('calls.openSimulator', {}, { defaultValue: 'Simulate a call' })}</span>
        </Link>
      </div>

      {error ? (
        <p
          data-mol-id="calls-error"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-lg bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      ) : null}

      {/* Telephony KPI strip — the design's three bento cards, fed by the
          fetched ledger (volume, resolution, language distribution). */}
      {calls !== null && calls.length > 0 ? (
        <div className={cm.cn(cm.sp('mt', 6), 'grid grid-cols-1 sm:grid-cols-3 gap-4')}>
          <div
            data-mol-id="calls-kpi-volume"
            className="sb-card-shadow rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4"
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.textSize('xs'),
                'uppercase tracking-wider text-on-surface-variant',
              )}
            >
              <span className={cm.fontWeight('semibold')}>
                {t('calls.kpiVolume', {}, { defaultValue: 'Total inbound volume' })}
              </span>
              <span className="sb-icon flex h-4 w-4 items-center justify-center" aria-hidden="true">
                <span className="material-symbols-outlined">phone_callback</span>
              </span>
            </div>
            <p className="sb-serif mt-2 text-2xl font-medium tracking-tight text-primary">
              {t(
                'calls.kpiVolumeValue',
                { count: kpis.total },
                { defaultValue: '{{count}} calls' },
              )}
            </p>
          </div>
          <div
            data-mol-id="calls-kpi-resolution"
            className="sb-card-shadow rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4"
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.textSize('xs'),
                'uppercase tracking-wider text-on-surface-variant',
              )}
            >
              <span className={cm.fontWeight('semibold')}>
                {t('calls.kpiResolution', {}, { defaultValue: 'Ledger resolution' })}
              </span>
              <span className="sb-icon flex h-4 w-4 items-center justify-center" aria-hidden="true">
                <span className="material-symbols-outlined">smart_toy</span>
              </span>
            </div>
            <p className="sb-serif mt-2 text-2xl font-medium tracking-tight text-primary">
              {kpis.booked > 0
                ? t(
                    'calls.kpiResolutionBooked',
                    { booked: kpis.booked },
                    { defaultValue: '{{booked}} booked' },
                  )
                : t('calls.kpiResolutionOpen', {}, { defaultValue: 'No bookings yet' })}
            </p>
            <p className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'calls.kpiResolutionMeta',
                { info: kpis.total - kpis.booked - kpis.inProgress, live: kpis.inProgress },
                { defaultValue: '{{info}} informational · {{live}} in progress' },
              )}
            </p>
          </div>
          <div
            data-mol-id="calls-kpi-languages"
            className="sb-card-shadow rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4"
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.textSize('xs'),
                'uppercase tracking-wider text-on-surface-variant',
              )}
            >
              <span className={cm.fontWeight('semibold')}>
                {t('calls.kpiLanguages', {}, { defaultValue: 'Multilingual distribution' })}
              </span>
              <span className="sb-icon flex h-4 w-4 items-center justify-center" aria-hidden="true">
                <span className="material-symbols-outlined">translate</span>
              </span>
            </div>
            <p className={cm.cn(cm.sp('mt', 2), cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {kpis.langs
                .slice(0, 2)
                .map(([lang, n]) => languageLabel(lang) + ' ' + n)
                .join(' · ')}
            </p>
            <div
              className={cm.cn(
                cm.sp('mt', 2),
                'flex h-1.5 w-full overflow-hidden rounded-full bg-surface-variant',
                cm.flex({ gap: 'xs' }),
              )}
              aria-hidden="true"
            >
              {kpis.langs.slice(0, 4).map(([lang, n], i) => (
                <div
                  key={lang}
                  className={
                    i === 0
                      ? 'h-full rounded-full bg-primary'
                      : i === 1
                        ? 'h-full rounded-full bg-secondary'
                        : 'h-full rounded-full bg-outline'
                  }
                  style={{ width: Math.round((n / Math.max(1, kpis.total)) * 100) + '%' }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Search & segmentation bar — outcome filter pills over the ledger */}
      {calls !== null && calls.length > 0 ? (
        <div
          className={cm.cn(
            cm.sp('mt', 6),
            cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
            'rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-3',
          )}
        >
          <button
            type="button"
            data-mol-id="calls-filter-all"
            aria-pressed={outcomeFilter === null}
            onClick={() => setOutcomeFilter(null)}
            className={
              outcomeFilter === null
                ? cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'rounded-full bg-primary text-on-primary',
                  )
                : cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'rounded-full bg-surface-container text-on-surface hover:bg-surface-variant transition-colors',
                  )
            }
          >
            {t(
              'calls.filterAll',
              { count: calls.length },
              { defaultValue: 'All calls ({{count}})' },
            )}
          </button>
          {filterPills.map(([outcome, n]) => (
            <button
              key={outcome}
              type="button"
              data-mol-id={'calls-filter-' + outcome.replace(/[^a-z]+/g, '-')}
              aria-pressed={outcomeFilter === outcome}
              onClick={() => setOutcomeFilter(outcomeFilter === outcome ? null : outcome)}
              className={
                outcomeFilter === outcome
                  ? cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      cm.flex({ align: 'center', gap: 'xs' }),
                      'rounded-full bg-primary text-on-primary',
                    )
                  : cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.flex({ align: 'center', gap: 'xs' }),
                      'rounded-full bg-surface-container text-on-surface hover:bg-surface-variant transition-colors',
                    )
              }
            >
              {outcome === 'in progress' ? (
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              ) : null}
              <span>
                {t('callOutcome.' + outcome, {}, { defaultValue: outcome })} ({n})
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {/* The call ledger — the design's synchronized inbound stream */}
      <div
        className={cm.cn(
          cm.sp('mt', 6),
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'px-1',
        )}
      >
        <p
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider text-on-surface-variant',
          )}
        >
          <span>{t('calls.streamLabel', {}, { defaultValue: 'Synchronized inbound stream' })}</span>
          {kpis.inProgress > 0 ? (
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 1),
                'rounded bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold tracking-wide',
              )}
            >
              {t('calls.liveFeed', {}, { defaultValue: 'LIVE TELEPHONY FEED' })}
            </span>
          ) : null}
        </p>
        {calls !== null ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'calls.showingOf',
              { shown: visibleCalls.length, total: calls.length },
              { defaultValue: 'Showing {{shown}} of {{total}} records' },
            )}
          </p>
        ) : null}
      </div>

      <ul className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col', gap: 'sm' }))}>
        {calls === null ? (
          <li data-mol-id="calls-loading" className="text-on-surface-variant">
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </li>
        ) : visibleCalls.length === 0 ? (
          <li
            data-mol-id="calls-empty"
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant',
            )}
          >
            {calls.length === 0
              ? t(
                  'calls.empty',
                  {},
                  { defaultValue: 'No calls yet — the simulator is one click away.' },
                )
              : t('calls.emptyFilter', {}, { defaultValue: 'No calls match this filter.' })}
          </li>
        ) : (
          visibleCalls.map((call) => {
            const outcome =
              call.outcome ?? t('callOutcome.inProgress', {}, { defaultValue: 'in progress' })
            return (
              <li key={call.id}>
                <Link
                  to={'/calls/' + call.id}
                  data-mol-id={'call-row-' + call.id}
                  className={cm.cn(
                    cm.sp('p', 5),
                    'block rounded-lg border border-outline-variant/60 bg-surface-container-lowest hover:border-outline sb-card-shadow transition-colors',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' }),
                    )}
                  >
                    <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
                        <span className={cm.cn(cm.fontWeight('bold'), 'text-primary')}>
                          {call.voice_agent_name ??
                            t('common.voiceAgent', {}, { defaultValue: 'Voice agent' })}
                        </span>
                        {call.detected_language ? (
                          <span
                            className={cm.cn(
                              cm.sp('px', 2),
                              cm.sp('py', 1),
                              cm.textSize('xs'),
                              'rounded border border-outline-variant/60 bg-surface-container-low font-mono text-primary',
                            )}
                          >
                            {call.detected_language.toUpperCase()}
                          </span>
                        ) : null}
                        <span
                          data-mol-id={'call-outcome-' + call.id}
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.sp('py', 1),
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            cm.flex({ align: 'center', gap: 'xs' }),
                            'rounded',
                            outcomeChipClass(outcome),
                          )}
                        >
                          {outcome === 'in progress' ? (
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-success"
                              aria-hidden="true"
                            />
                          ) : null}
                          <span className="uppercase tracking-wider">{outcome}</span>
                        </span>
                      </div>
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                          cm.textSize('sm'),
                          'text-on-surface-variant',
                        )}
                      >
                        <span className="font-mono text-primary">
                          {languageLabel(call.detected_language)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{formatTime(call.started_at)}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {t(
                            'calls.durationLabel',
                            { duration: formatDuration(call.duration_seconds) },
                            { defaultValue: 'Duration: {{duration}}' },
                          )}
                        </span>
                      </div>
                    </div>
                    {/* Decorative live-waveform + inspect affordance */}
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.sp('px', 2),
                          'h-6 items-center rounded border border-outline-variant/40 bg-surface-container-low',
                        )}
                        aria-hidden="true"
                      >
                        {WAVE_HEIGHTS.map((h, i) => (
                          <span
                            key={i}
                            className={cm.cn(
                              'w-1 rounded-full bg-secondary',
                              h,
                              WAVE_VARIANTS[i % WAVE_VARIANTS.length],
                            )}
                          />
                        ))}
                      </div>
                      <span className="font-mono text-xs text-on-surface-variant">
                        {formatDuration(call.duration_seconds)}
                      </span>
                    </div>
                  </div>
                  {call.summary ? (
                    <div
                      className={cm.cn(
                        cm.sp('mt', 3),
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'rounded-lg border border-outline-variant/50 bg-surface-bright text-on-surface',
                      )}
                    >
                      <span className={cm.cn(cm.fontWeight('semibold'), 'text-primary')}>
                        {t('calls.summaryLabel', {}, { defaultValue: 'Summary:' })}
                      </span>{' '}
                      {call.summary}
                    </div>
                  ) : null}
                </Link>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}
