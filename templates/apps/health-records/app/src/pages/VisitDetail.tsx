import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface VisitDiagnosis {
  id?: string
  icd10_code?: string | null
  description?: string | null
}

interface VisitOrder {
  id?: string
  kind: string
  description: string
  status?: string
}

interface Visit {
  id: string
  provider_name?: string | null
  clinic_name?: string | null
  scheduled_at?: string | null
  completed_at?: string | null
  follow_up_at?: string | null
  chief_complaint?: string | null
  assessment?: string | null
  plan?: string | null
  notes?: string | null
  diagnoses?: VisitDiagnosis[]
  orders?: VisitOrder[]
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmtTime(iso?: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function VisitDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [visit, setVisit] = useState<Visit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/visits/${id}`)
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<Visit>(res)
        if (!data) {
          setError(t('visitDetail.notFound', {}, { defaultValue: 'Visit not found.' }))
        } else {
          setVisit(data)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('visitDetail.loadError', {}, { defaultValue: 'Failed to load visit.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return (
      <div
        className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
        data-mol-id="page-visit-detail"
      >
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  if (error || !visit) {
    return (
      <div
        className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
        data-mol-id="page-visit-detail"
      >
        <Link
          to="/visits"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline mb-3',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('visitDetail.back', {}, { defaultValue: 'All visits' })}
        </Link>
        <p className={cm.cn(cm.sp('py', 8), 'text-error font-bold')}>
          {error ?? t('visitDetail.notFound', {}, { defaultValue: 'Visit not found.' })}
        </p>
      </div>
    )
  }

  const planLines = visit.plan
    ? visit.plan
        .split(/\n+|(?:\.\s+)/)
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  return (
    <div
      className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
      data-mol-id="page-visit-detail"
    >
      <div className={cm.cn(cm.sp('mb', 6))}>
        <Link
          to="/visits"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline mb-3',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('visitDetail.back', {}, { defaultValue: 'All visits' })}
        </Link>
        <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
          {visit.completed_at
            ? t('visitDetail.completed', {}, { defaultValue: 'Completed visit' })
            : t('visitDetail.scheduled', {}, { defaultValue: 'Scheduled visit' })}
        </p>
        <h1
          className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
          data-mol-id="visit-complaint"
        >
          {visit.chief_complaint ?? t('visitDetail.untitled', {}, { defaultValue: 'Visit' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {fmtDate(visit.scheduled_at ?? visit.completed_at)}
          {fmtTime(visit.scheduled_at) && ` · ${fmtTime(visit.scheduled_at)}`}
        </p>
      </div>

      {(visit.provider_name || visit.clinic_name) && (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-primary-container text-on-primary-container rounded-2xl',
            cm.sp('mb', 6),
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <div
              className={cm.cn(
                'w-12 h-12 rounded-full bg-on-primary-container/10 flex items-center justify-center',
              )}
            >
              <span className="material-symbols-outlined">person</span>
            </div>
            <div className={cm.flex1}>
              <p
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
                data-mol-id="visit-provider"
              >
                {visit.provider_name ?? '—'}
              </p>
              {visit.clinic_name && (
                <p className={cm.cn(cm.textSize('sm'), 'opacity-80')}>{visit.clinic_name}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {visit.diagnoses && visit.diagnoses.length > 0 && (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.sp('mb', 6),
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 3),
            )}
          >
            {t('visitDetail.diagnoses', {}, { defaultValue: 'Diagnoses' })}
          </h2>
          <ul className={cm.cn('space-y-2')} data-mol-id="visit-diagnoses">
            {visit.diagnoses.map((d, i) => (
              <li key={d.id ?? i} className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
                <span
                  className={cm.cn('material-symbols-outlined text-base text-primary mt-0.5')}
                  aria-hidden="true"
                >
                  label
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {d.description ?? '—'}
                  {d.icd10_code ? ` (${d.icd10_code})` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {visit.assessment && (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.sp('mb', 6),
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 3),
            )}
          >
            {t('visitDetail.assessment', {}, { defaultValue: 'Assessment' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed')} data-mol-id="visit-assessment">
            {visit.assessment}
          </p>
        </section>
      )}

      {planLines.length > 0 && (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.sp('mb', 6),
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 3),
            )}
          >
            {t('nav.plan', {}, { defaultValue: 'Plan' })}
          </h2>
          <ol
            className={cm.cn(
              'space-y-2 list-decimal list-inside marker:text-primary marker:font-bold',
            )}
          >
            {planLines.map((p, i) => (
              <li key={i} className={cm.cn(cm.textSize('sm'), 'pl-2')}>
                {p}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
        {visit.follow_up_at && (
          <section
            className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
            style={{ borderLeft: '4px solid var(--color-clinical-info)' }}
          >
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
                cm.sp('mb', 2),
              )}
            >
              {t('visitDetail.followUp', {}, { defaultValue: 'Next follow-up' })}
            </h2>
            <p className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {fmtDate(visit.follow_up_at)}
            </p>
          </section>
        )}

        {visit.orders && visit.orders.length > 0 && (
          <section
            className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          >
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
                cm.sp('mb', 3),
              )}
            >
              {t('visitDetail.orders', {}, { defaultValue: 'Orders' })}
            </h2>
            <ul className={cm.cn('space-y-2')} data-mol-id="visit-orders">
              {visit.orders.map((o, i) => (
                <li key={o.id ?? i} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <span
                    className={cm.cn('material-symbols-outlined text-base text-primary')}
                    aria-hidden="true"
                  >
                    {o.kind === 'lab'
                      ? 'science'
                      : o.kind === 'imaging'
                        ? 'visibility'
                        : o.kind === 'medication'
                          ? 'medication'
                          : 'task'}
                  </span>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.flex1)}>
                    {o.description}
                  </p>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant uppercase tracking-wider font-bold',
                    )}
                  >
                    {o.status ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {visit.notes && (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.sp('mt', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 3),
            )}
          >
            {t('form.notes', {}, { defaultValue: 'Notes' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}>
            {visit.notes}
          </p>
        </section>
      )}
    </div>
  )
}
