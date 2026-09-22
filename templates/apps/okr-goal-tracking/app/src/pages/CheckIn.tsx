import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KeyResultRow } from '../components/KeyResultRow.js'
import { ProgressRing } from '../components/ProgressRing.js'
import {
  backendCheckInStatus,
  backendConfidence,
  type KeyResultRow as KrRow,
  type ObjectiveRow,
  toKeyResultRowData,
  toNumber,
} from '../lib/api.js'

type Confidence = 'on-track' | 'at-risk' | 'behind'

const SCOPE_LABEL: Record<string, string> = {
  individual: 'Individual',
  team: 'Team',
  company: 'Company',
}

const CONFIDENCE_OPTIONS: Array<{ key: Confidence; defaultLabel: string; pill: string }> = [
  {
    key: 'on-track',
    defaultLabel: 'On track',
    pill: 'bg-success-light text-success-text ring-emerald-300',
  },
  { key: 'at-risk', defaultLabel: 'At risk', pill: 'bg-warning-light text-warning ring-amber-300' },
  { key: 'behind', defaultLabel: 'Behind', pill: 'bg-error-light text-error ring-red-300' },
]

export function CheckIn() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [objectives, setObjectives] = useState<ObjectiveRow[]>([])
  const [krs, setKrs] = useState<KrRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<Record<string, Confidence>>({})
  const [values, setValues] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let aborted = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get<ObjectiveRow[]>('/api/objectives'),
      http.get<KrRow[]>('/api/key-results'),
    ])
      .then(([objsRes, allKrsRes]) => {
        if (aborted) return
        const objs = objsRes.data
        const allKrs = allKrsRes.data
        setObjectives(objs ?? [])
        setKrs(allKrs ?? [])
        const seedConf: Record<string, Confidence> = {}
        const seedVals: Record<string, string> = {}
        for (const kr of allKrs ?? []) {
          seedConf[kr.id] =
            kr.status === 'at_risk' ? 'at-risk' : kr.status === 'off_track' ? 'behind' : 'on-track'
          seedVals[kr.id] = String(toNumber(kr.current_value))
        }
        setConfidence(seedConf)
        setValues(seedVals)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load check-in data')
        setLoading(false)
      })
    return () => {
      aborted = true
    }
  }, [http])

  const krsByObj = useMemo(() => {
    const map = new Map<string, KrRow[]>()
    for (const kr of krs) {
      const list = map.get(kr.objective_id) ?? []
      list.push(kr)
      map.set(kr.objective_id, list)
    }
    return map
  }, [krs])

  const totalKrs = krs.length
  const onTrackCount = Object.values(confidence).filter((c) => c === 'on-track').length
  const checkInProgress = totalKrs > 0 ? Math.round((onTrackCount / totalKrs) * 100) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitted(false)
    setSubmitting(true)
    try {
      let recorded = 0
      for (const kr of krs) {
        const conf = confidence[kr.id] ?? 'on-track'
        const valueStr = values[kr.id]
        const value = valueStr != null && valueStr !== '' ? Number(valueStr) : null
        await http.post('/api/check-ins', {
          key_result_id: kr.id,
          value: value != null && Number.isFinite(value) ? value : null,
          confidence: backendConfidence(conf),
          status: backendCheckInStatus(conf),
          note: note.trim() ? note.trim() : null,
        })
        recorded += 1
      }
      if (recorded === 0 && note.trim()) {
        // No KRs yet — record an objective-level note check-in if the user
        // has at least one objective. Skip otherwise.
        if (objectives[0]) {
          await http.post('/api/check-ins', {
            objective_id: objectives[0].id,
            note: note.trim(),
          })
        }
      }
      setSubmitted(true)
      // Domain event (fire-and-forget; no-ops without an analytics provider).
      track({
        name: 'checkin.recorded',
        properties: { recorded, key_result_count: krs.length },
      })
      // Refresh KR snapshot so the page reflects new current_value/status.
      const fresh = await http
        .get<KrRow[]>('/api/key-results')
        .then((r) => r.data)
        .catch(() => null)
      if (Array.isArray(fresh)) {
        setKrs(fresh)
        const seedVals: Record<string, string> = {}
        for (const kr of fresh) {
          seedVals[kr.id] = String(toNumber(kr.current_value))
        }
        setValues(seedVals)
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Could not save check-in.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.stack(8))}>
      <header className={cm.cn(cm.flex({ justify: 'between', align: 'end', gap: 'md' }))}>
        <div className={cm.cn(cm.stack(2))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-[0.22em] text-indigo-700',
            )}
          >
            {t('checkIn.eyebrow', {}, { defaultValue: 'Weekly cadence' })}
          </span>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
            style={{ color: 'var(--color-heading-ink)' }}
          >
            {t('checkIn.heading', {}, { defaultValue: 'Weekly check-in' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
            {t(
              'checkIn.subheading',
              {},
              {
                defaultValue:
                  'Update the current value for each KR, mark confidence, drop one note, and submit.',
              },
            )}
          </p>
        </div>
        <ProgressRing
          value={checkInProgress}
          size={120}
          stroke={10}
          status="on-track"
          label={t('checkIn.progressLabel', {}, { defaultValue: 'KRs on track' })}
        />
      </header>

      {error && (
        <div
          role="alert"
          data-testid="check-in-error"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-2xl bg-error-light border border-red-200 text-error text-sm',
          )}
        >
          {error}
        </div>
      )}

      {submitted && (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            cm.flex({ align: 'center', gap: 'sm' }),
            'rounded-2xl bg-success-light border border-emerald-200 text-success-text',
          )}
          role="status"
          data-testid="check-in-success"
        >
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {t(
              'checkIn.submittedMessage',
              {},
              { defaultValue: 'Check-in saved. Progress and timeline updated.' },
            )}
          </p>
        </div>
      )}

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('checkIn.loading', {}, { defaultValue: 'Loading your KRs…' })}
        </p>
      ) : objectives.length === 0 ? (
        <div
          data-testid="check-in-empty"
          className={cm.cn(
            cm.sp('p', 8),
            cm.stack(2),
            cm.textCenter,
            'rounded-2xl border border-dashed border-outline-variant',
          )}
        >
          <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('checkIn.emptyTitle', {}, { defaultValue: 'Nothing to check in on yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md mx-auto')}>
            {t(
              'checkIn.emptyBody',
              {},
              {
                defaultValue: 'Create at least one objective with key results to record progress.',
              },
            )}
          </p>
          <div>
            <Link
              to="/objectives/new"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl text-white bg-gradient-to-br from-indigo-600 to-sky-500 inline-flex',
              )}
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {t('checkIn.newObjective', {}, { defaultValue: 'New objective' })}
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.cn(cm.stack(6))}>
          {objectives.map((obj) => {
            const objKrs = krsByObj.get(obj.id) ?? []
            return (
              <article
                key={obj.id}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(4),
                  'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
                )}
              >
                <div className={cm.cn(cm.flex({ justify: 'between', align: 'center', gap: 'sm' }))}>
                  <div className={cm.cn(cm.stack(1))}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(
                        `objective.scopes.${obj.scope}` as 'objective.scopes.team',
                        {},
                        { defaultValue: SCOPE_LABEL[obj.scope] ?? obj.scope },
                      )}
                    </span>
                    <h2
                      className={cm.cn(
                        cm.textSize('lg'),
                        'font-bold tracking-tight text-on-surface',
                      )}
                    >
                      {obj.title}
                    </h2>
                  </div>
                  <Link
                    to={`/objectives/${obj.id}`}
                    className={cm.cn(
                      'text-xs font-bold text-indigo-700 hover:text-indigo-900 transition-colors',
                    )}
                  >
                    {t('checkIn.openObjective', {}, { defaultValue: 'Open →' })}
                  </Link>
                </div>
                {objKrs.length === 0 ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'checkIn.noKrs',
                      {},
                      { defaultValue: 'No key results — add some from Edit.' },
                    )}
                  </p>
                ) : (
                  <div className={cm.cn(cm.stack(3))}>
                    {objKrs.map((kr) => (
                      <div
                        key={kr.id}
                        className={cm.cn(
                          cm.sp('p', 4),
                          cm.stack(3),
                          'rounded-xl bg-surface-container-low',
                        )}
                      >
                        <KeyResultRow kr={toKeyResultRowData(kr)} confidence={confidence[kr.id]} />
                        <div
                          className={cm.cn(
                            cm.flex({ justify: 'between', align: 'center', gap: 'sm' }),
                            'flex-wrap',
                          )}
                        >
                          <label
                            className={cm.cn(
                              cm.flex({ align: 'center', gap: 'xs' }),
                              cm.textSize('xs'),
                            )}
                          >
                            <span
                              className={cm.cn(
                                cm.fontWeight('semibold'),
                                'text-on-surface-variant',
                              )}
                            >
                              {t('checkIn.currentValue', {}, { defaultValue: 'Current value' })}
                            </span>
                            <input
                              type="number"
                              step="any"
                              value={values[kr.id] ?? ''}
                              onChange={(e) =>
                                setValues((v) => ({ ...v, [kr.id]: e.target.value }))
                              }
                              className={cm.cn(
                                cm.sp('px', 2),
                                cm.sp('py', 1),
                                cm.textSize('sm'),
                                'tabular-nums w-24 bg-surface rounded-md border border-outline-variant/40 focus:ring-2 focus:ring-indigo-500/30 outline-none',
                              )}
                              data-testid={`kr-value-${kr.id}`}
                            />
                          </label>
                          <fieldset className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                            <legend className="sr-only">
                              {t(
                                'checkIn.confidenceLegend',
                                {},
                                { defaultValue: 'Confidence selector' },
                              )}
                            </legend>
                            {CONFIDENCE_OPTIONS.map((opt) => {
                              const active = (confidence[kr.id] ?? 'on-track') === opt.key
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => setConfidence((c) => ({ ...c, [kr.id]: opt.key }))}
                                  className={cm.cn(
                                    cm.sp('px', 3),
                                    cm.sp('py', 1),
                                    cm.fontWeight('bold'),
                                    'rounded-full text-[10px] uppercase tracking-widest ring-1 transition-colors',
                                    active
                                      ? opt.pill
                                      : 'bg-surface text-on-surface-variant ring-outline-variant hover:bg-surface-container',
                                  )}
                                  aria-pressed={active}
                                >
                                  {t(
                                    `checkIn.confidence.${opt.key}` as 'checkIn.confidence.onTrack',
                                    {},
                                    { defaultValue: opt.defaultLabel },
                                  )}
                                </button>
                              )
                            })}
                          </fieldset>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          })}

          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(3),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <label className={cm.cn(cm.stack(1))}>
              <span className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                {t('checkIn.noteLabel', {}, { defaultValue: 'One note for your team' })}
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder={t(
                  'checkIn.notePlaceholder',
                  {},
                  {
                    defaultValue:
                      'Bright spot, blocker, or coaching ask — keep it under three sentences.',
                  },
                )}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'bg-surface-container-low rounded-xl border border-outline-variant/40 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all leading-relaxed resize-none',
                )}
              />
            </label>
            <div className={cm.cn(cm.flex({ justify: 'end', align: 'center', gap: 'sm' }))}>
              <button
                type="submit"
                disabled={submitting}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-xl text-white bg-gradient-to-br from-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.99] transition-transform disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                {submitting
                  ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
                  : t('checkIn.submit', {}, { defaultValue: 'Submit check-in' })}
                <span className="material-symbols-outlined text-[18px]">check</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

export default CheckIn
