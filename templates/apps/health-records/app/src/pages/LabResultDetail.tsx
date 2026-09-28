import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface LabValue {
  id?: string
  test_name: string
  value: string
  unit?: string | null
  reference_low?: number | null
  reference_high?: number | null
  flag?: 'low' | 'high' | 'critical' | 'normal' | 'abnormal'
}

interface LabResult {
  id: string
  panel_name?: string | null
  test_name: string
  category?: string
  ordering_provider?: string | null
  performing_lab?: string | null
  collected_date?: string | null
  result_date?: string | null
  status?: string
  units?: string | null
  reference_range?: string | null
  flag?: string
  notes?: string | null
  values?: LabValue[]
}

const FLAG_INFO: Record<string, { color: string; word: string }> = {
  high: { color: 'var(--color-clinical-abnormal)', word: 'Above range' },
  critical: { color: 'var(--color-clinical-abnormal)', word: 'Critical' },
  abnormal: { color: 'var(--color-clinical-abnormal)', word: 'Abnormal' },
  low: { color: 'var(--color-clinical-info)', word: 'Below range' },
  normal: { color: 'var(--color-clinical-normal)', word: 'Within range' },
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function flagInfo(f?: string) {
  return FLAG_INFO[f ?? 'normal'] ?? FLAG_INFO.normal
}

export function LabResultDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [lab, setLab] = useState<LabResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/labs/${id}`)
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<LabResult>(res)
        if (!data) {
          setError(t('labDetail.notFound', {}, { defaultValue: 'Lab result not found.' }))
        } else {
          setLab(data)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('labDetail.loadError', {}, { defaultValue: 'Failed to load lab result.' }),
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
        data-mol-id="page-lab-result-detail"
      >
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  if (error || !lab) {
    return (
      <div
        className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
        data-mol-id="page-lab-result-detail"
      >
        <Link
          to="/labs"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline mb-3',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('labDetail.back', {}, { defaultValue: 'All lab results' })}
        </Link>
        <p className={cm.cn(cm.sp('py', 8), 'text-error font-bold')}>
          {error ?? t('labDetail.notFound', {}, { defaultValue: 'Lab result not found.' })}
        </p>
      </div>
    )
  }

  const componentValues = lab.values ?? []
  const heroFlag = flagInfo(lab.flag)
  const heroValue =
    componentValues.find((v) => v.test_name === lab.test_name)?.value ??
    (componentValues.length === 1 ? componentValues[0].value : null)
  const heroUnit =
    componentValues.find((v) => v.test_name === lab.test_name)?.unit ??
    (componentValues.length === 1 ? componentValues[0].unit : lab.units)

  return (
    <div
      className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
      data-mol-id="page-lab-result-detail"
    >
      <div className={cm.cn(cm.sp('mb', 6))}>
        <Link
          to="/labs"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline mb-3',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('labDetail.back', {}, { defaultValue: 'All lab results' })}
        </Link>
        <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
          {lab.panel_name ??
            lab.category ??
            t('labDetail.eyebrowFallback', {}, { defaultValue: 'Lab' })}
        </p>
        <h1
          className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
          data-mol-id="lab-name"
        >
          {lab.test_name}
        </h1>
      </div>

      {heroValue !== null && heroValue !== undefined && (
        <section
          className={cm.cn(
            cm.sp('p', 8),
            cm.accentCard({ tone: 'custom' }),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.sp('mb', 6),
          )}
          style={{ ['--mol-accent' as string]: heroFlag.color }}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'baseline', gap: 'md', wrap: 'wrap' }),
              cm.sp('mb', 3),
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('5xl'),
                cm.fontWeight('bold'),
                'tabular-nums leading-none',
              )}
              style={{ fontFamily: 'var(--mol-font-mono)', color: heroFlag.color }}
              data-mol-id="lab-value"
            >
              {heroValue}
            </span>
            {heroUnit && (
              <span
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant',
                )}
              >
                {heroUnit}
              </span>
            )}
            <span
              className={cm.cn(
                'px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest text-white',
              )}
              style={{ backgroundColor: heroFlag.color }}
              data-mol-id="lab-flag"
            >
              {t(`labDetail.flag.${lab.flag ?? 'normal'}`, {}, { defaultValue: heroFlag.word })}
            </span>
          </div>
          {lab.reference_range && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'labDetail.refRange',
                { range: lab.reference_range },
                { defaultValue: 'Reference range: {{range}}' },
              )}
            </p>
          )}
        </section>
      )}

      {componentValues.length > 0 && (
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
              cm.sp('mb', 4),
            )}
          >
            {t('labDetail.components', {}, { defaultValue: 'Component results' })}
          </h2>
          <ul
            className={cm.cn('divide-y divide-outline-variant/20')}
            data-mol-id="lab-component-list"
          >
            {componentValues.map((v, idx) => {
              const f = flagInfo(v.flag)
              const refStr =
                v.reference_low != null || v.reference_high != null
                  ? [
                      v.reference_low != null ? String(v.reference_low) : '< ',
                      v.reference_high != null ? `– ${v.reference_high}` : '+',
                    ]
                      .join('')
                      .trim()
                  : null
              return (
                <li
                  key={v.id ?? idx}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 3),
                  )}
                >
                  <div>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {v.test_name}
                    </p>
                    {refStr && (
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'labDetail.refShort',
                          { range: `${refStr} ${v.unit ?? ''}`.trim() },
                          { defaultValue: 'Ref: {{range}}' },
                        )}
                      </p>
                    )}
                  </div>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tabular-nums')}
                      style={{ fontFamily: 'var(--mol-font-mono)', color: f.color }}
                    >
                      {v.value}
                      {v.unit ? ` ${v.unit}` : ''}
                    </span>
                    <span
                      className={cm.cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest',
                      )}
                      style={{ backgroundColor: f.color, color: 'white' }}
                    >
                      {(v.flag ?? 'normal').toUpperCase()}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
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
            {t('labDetail.collection', {}, { defaultValue: 'Collection' })}
          </h2>
          <dl className={cm.cn('space-y-3')}>
            {(
              [
                ['collected', 'Collected', fmtDate(lab.collected_date)],
                ['resulted', 'Resulted', fmtDate(lab.result_date)],
                ['orderedBy', 'Ordered by', lab.ordering_provider ?? '—'],
                ['facility', 'Facility', lab.performing_lab ?? '—'],
                ['status', 'Status', lab.status ?? '—'],
              ] as const
            ).map(([key, label, v]) => (
              <div key={key}>
                <dt
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant uppercase tracking-wider font-bold',
                  )}
                >
                  {t(`labDetail.field.${key}`, {}, { defaultValue: label })}
                </dt>
                <dd className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {lab.notes && (
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
              {t('labDetail.notes', {}, { defaultValue: 'Provider interpretation' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}>
              {lab.notes}
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
