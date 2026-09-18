import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KeyResultRow } from '../components/KeyResultRow.js'
import { ProgressRing } from '../components/ProgressRing.js'
import {
  type CheckInRow,
  type ObjectiveWithKrs,
  toKeyResultRowData,
  toNumber,
  type UiStatus,
  uiStatus,
} from '../lib/api.js'

const STATUS_COPY: Record<UiStatus, { label: string; tone: string; ring: string }> = {
  'on-track': {
    label: 'On track',
    tone: 'bg-success-light text-success-text',
    ring: 'var(--color-status-on-track, #10b981)',
  },
  'at-risk': {
    label: 'At risk',
    tone: 'bg-warning-light text-warning',
    ring: 'var(--color-status-at-risk, #f59e0b)',
  },
  behind: {
    label: 'Behind',
    tone: 'bg-error-light text-error',
    ring: 'var(--color-status-behind, #dc2626)',
  },
  'not-started': {
    label: 'Not started',
    tone: 'bg-surface-secondary text-foreground',
    ring: 'var(--color-outline, #94a3b8)',
  },
  completed: {
    label: 'Completed',
    tone: 'bg-violet-100 text-violet-800',
    ring: 'var(--color-status-completed, #8b5cf6)',
  },
}

const SCOPE_LABEL: Record<string, string> = {
  individual: 'Individual',
  team: 'Team',
  company: 'Company',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ObjectiveDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()
  const [objective, setObjective] = useState<ObjectiveWithKrs | null>(null)
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let aborted = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get<ObjectiveWithKrs>(`/api/objectives/${id}`),
      http.get<CheckInRow[]>(`/api/check-ins?objective_id=${id}`),
    ])
      .then(([objRes, insRes]) => {
        if (aborted) return
        setObjective(objRes.data)
        setCheckIns(insRes.data ?? [])
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load objective')
        setLoading(false)
      })
    return () => {
      aborted = true
    }
  }, [http, id])

  if (loading) {
    return (
      <div
        data-testid="objective-loading"
        className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant text-sm')}
      >
        {t('objectiveDetail.loading', {}, { defaultValue: 'Loading objective…' })}
      </div>
    )
  }

  if (error || !objective) {
    return (
      <div className={cm.cn(cm.stack(4), cm.sp('p', 8), cm.textCenter)}>
        <p className={cm.cn('text-on-surface-variant')}>
          {error ?? t('objectiveDetail.notFound', {}, { defaultValue: 'Objective not found.' })}
        </p>
        <div>
          <Link to="/objectives" className={cm.cn('text-sm font-bold text-indigo-700')}>
            {t('objectiveDetail.backToList', {}, { defaultValue: 'Back to objectives' })}
          </Link>
        </div>
      </div>
    )
  }

  const status = STATUS_COPY[uiStatus(objective.status)]
  const ownerName = (
    user?.name ??
    user?.email ??
    t('common.you', {}, { defaultValue: 'You' })
  ).split('@')[0]
  const krs = objective.key_results ?? []

  return (
    <div className={cm.cn(cm.stack(8))}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
        <Link to="/objectives" className={cm.cn('font-bold text-indigo-700 hover:text-indigo-900')}>
          {t('objectiveDetail.backToList', {}, { defaultValue: 'Objectives' })}
        </Link>
        <span className={cm.cn('text-on-surface-variant')}>/</span>
        <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>{objective.title}</span>
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-3xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm',
        )}
        style={{ borderLeft: `8px solid ${status.ring}` }}
      >
        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'start', gap: 'lg' }),
            'flex-col md:flex-row',
          )}
        >
          <div className={cm.cn(cm.stack(3), 'flex-1')}>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(
                  `objective.scopes.${objective.scope}` as 'objective.scopes.team',
                  {},
                  { defaultValue: SCOPE_LABEL[objective.scope] ?? objective.scope },
                )}
              </span>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full',
                  status.tone,
                )}
              >
                {t(
                  `objectiveDetail.status.${uiStatus(objective.status)}` as 'objectiveDetail.status.onTrack',
                  {},
                  { defaultValue: status.label },
                )}
              </span>
            </div>
            <h1
              data-testid="objective-title"
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface leading-[1.1]',
              )}
            >
              {objective.title}
            </h1>
            {objective.description && (
              <p
                className={cm.cn(
                  cm.textSize('base'),
                  'text-on-surface-variant leading-relaxed max-w-2xl',
                )}
              >
                {objective.description}
              </p>
            )}
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('pt', 2))}>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.fontWeight('bold'),
                    'w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 text-xs',
                  )}
                >
                  {ownerName.slice(0, 2).toUpperCase()}
                </div>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'objectiveDetail.owner',
                    { name: ownerName },
                    { defaultValue: 'Owned by {{name}}' },
                  )}
                </span>
              </div>
              <Link
                to={`/objectives/${objective.id}/edit`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.fontWeight('bold'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[16px]')}>edit</span>
                {t('objectiveDetail.edit', {}, { defaultValue: 'Edit objective' })}
              </Link>
            </div>
          </div>
          <ProgressRing
            value={objective.progress}
            size={140}
            stroke={12}
            status={uiStatus(objective.status)}
            label={t('nav.progress', {}, { defaultValue: 'Progress' })}
          />
        </div>
      </section>

      <section className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }))}>
        <div className={cm.cn('col-span-12 lg:col-span-8', cm.stack(4))}>
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
            <h2
              className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('objectiveDetail.keyResultsHeading', {}, { defaultValue: 'Key results' })}
            </h2>
            <Link
              to="/check-in"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-xl text-white shadow-md transition-transform hover:scale-[1.01]',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary-hover) 0%, var(--color-secondary) 100%)',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>fact_check</span>
              {t('objectiveDetail.runCheckIn', {}, { defaultValue: 'Run check-in' })}
            </Link>
          </div>
          {krs.length === 0 ? (
            <div
              data-testid="objective-no-krs"
              className={cm.cn(
                cm.sp('p', 6),
                cm.textCenter,
                'rounded-2xl border border-dashed border-outline-variant text-on-surface-variant text-sm',
              )}
            >
              {t(
                'objectiveDetail.noKrs',
                {},
                { defaultValue: 'No key results yet. Add one from Edit.' },
              )}
            </div>
          ) : (
            <ul className={cm.cn(cm.stack(3))}>
              {krs.map((kr) => (
                <li key={kr.id}>
                  <KeyResultRow kr={toKeyResultRowData(kr)} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className={cm.cn('col-span-12 lg:col-span-4', cm.stack(4))}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-2xl border border-outline-variant/40 bg-surface-container-lowest',
            )}
          >
            <h3
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('objectiveDetail.timelineHeading', {}, { defaultValue: 'Check-in timeline' })}
            </h3>
            {checkIns.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'objectiveDetail.noCheckIns',
                  {},
                  { defaultValue: 'No check-ins yet for this objective.' },
                )}
              </p>
            ) : (
              <ol className={cm.cn(cm.stack(4))}>
                {checkIns.slice(0, 8).map((c, idx) => {
                  const status = (c.status ?? 'on_track') as string
                  const tone = uiStatus(status)
                  return (
                    <li key={c.id} className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
                      <div
                        className={cm.cn(
                          cm.flex({ direction: 'col', align: 'center' }),
                          'shrink-0',
                        )}
                      >
                        <span
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.fontWeight('bold'),
                            'w-8 h-8 rounded-full text-[11px]',
                            idx === 0
                              ? 'bg-primary text-on-primary'
                              : 'bg-primary-container text-on-primary-container',
                          )}
                        >
                          {c.value != null ? String(toNumber(c.value)) : '—'}
                        </span>
                        {idx < Math.min(checkIns.length - 1, 7) && (
                          <span
                            className={cm.cn('w-px flex-1 bg-outline-variant/60 mt-1')}
                            style={{ minHeight: '24px' }}
                          />
                        )}
                      </div>
                      <div className={cm.cn(cm.stack(1))}>
                        <span
                          className={cm.cn(
                            cm.fontWeight('bold'),
                            'text-[10px] uppercase tracking-widest text-on-surface-variant',
                          )}
                        >
                          {formatDate(c.created_at)} ·{' '}
                          {t(
                            `objectiveDetail.status.${tone}` as 'objectiveDetail.status.on-track',
                            {},
                            { defaultValue: STATUS_COPY[tone].label },
                          )}
                        </span>
                        {c.note && (
                          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-snug')}>
                            {c.note}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </aside>
      </section>
    </div>
  )
}

export default ObjectiveDetail
