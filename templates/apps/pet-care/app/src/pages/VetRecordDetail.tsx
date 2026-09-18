import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface ApiVetRecord {
  id: string
  pet_id?: string
  pet_name?: string
  kind?: string
  title?: string
  summary?: string
  occurred_on?: string
  vet_name?: string
  clinic_name?: string
  follow_up_date?: string | null
  attachments?: Array<string | { url?: string; name?: string }>
}

function fmtDate(iso: string | undefined | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function VetRecordDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [record, setRecord] = useState<ApiVetRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    http
      .get(`/api/vet-records/${id}`)
      .then((res) => {
        if (cancelled) return
        setRecord(unwrapSingle<ApiVetRecord>(res))
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not load record')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  return (
    <div
      className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
      data-mol-id="page-vet-record-detail"
    >
      <Link
        to="/vet-records"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          cm.sp('mb', 4),
          'inline-flex text-on-surface-variant hover:text-primary',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
        {t('vetRecordDetail.back', {}, { defaultValue: 'Back to records' })}
      </Link>

      {loading && !record && (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      )}

      {!loading && error && !record && (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
          {error}
        </p>
      )}

      {record && (
        <section
          className={cm.cn(cm.sp('p', 8), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
          style={{ borderLeft: '4px solid var(--color-pet-vaccinated)' }}
        >
          <p
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-widest text-primary-dark dark:text-primary mb-1',
            )}
          >
            {t('vetRecordDetail.eyebrow', {}, { defaultValue: 'Vet record' })} ·{' '}
            {record.kind || '—'}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            data-mol-id="vet-record-title"
          >
            {record.title || '—'}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 1),
              'text-on-surface-variant tabular-nums',
            )}
            style={{ fontFamily: 'var(--mol-font-mono)' }}
          >
            {fmtDate(record.occurred_on)} · {record.clinic_name || record.vet_name || '—'}
          </p>

          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2', cm.sp('mt', 6))}
          >
            <div className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-surface-container-low')}>
              <p
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1',
                )}
              >
                {t('vetRecordDetail.petLabel', {}, { defaultValue: 'Pet' })}
              </p>
              {record.pet_id ? (
                <Link
                  to={`/pets/${record.pet_id}`}
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('bold'),
                    'text-primary hover:underline',
                  )}
                >
                  {record.pet_name || record.pet_id}
                </Link>
              ) : (
                <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                  {record.pet_name || '—'}
                </p>
              )}
            </div>
            <div className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-surface-container-low')}>
              <p
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1',
                )}
              >
                {t('vetRecordDetail.vetLabel', {}, { defaultValue: 'Vet' })}
              </p>
              <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                {record.vet_name || '—'}
              </p>
            </div>
          </div>

          <Section title={t('form.summary', {}, { defaultValue: 'Summary' })} icon="stethoscope">
            <span data-mol-id="vet-record-summary">
              {record.summary || t('vetRecordDetail.empty', {}, { defaultValue: 'Not recorded.' })}
            </span>
          </Section>

          {record.follow_up_date && (
            <div
              className={cm.cn(
                cm.sp('p', 4),
                cm.sp('mt', 6),
                cm.flex({ align: 'center', gap: 'sm' }),
                'rounded-xl bg-warning-container/40',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-warning')}>event</span>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t(
                  'vetRecordDetail.followUp',
                  { date: fmtDate(record.follow_up_date) },
                  { defaultValue: 'Follow up due {{date}}' },
                )}
              </span>
            </div>
          )}

          {record.attachments && record.attachments.length > 0 && (
            <Section
              title={t('vetRecordDetail.attachmentsTitle', {}, { defaultValue: 'Attachments' })}
              icon="attach_file"
            >
              <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                {record.attachments.map((a, i) => {
                  const label = typeof a === 'string' ? a : a.name || a.url || `attachment-${i + 1}`
                  return (
                    <li
                      key={i}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-primary hover:underline',
                      )}
                    >
                      <span className={cm.cn('material-symbols-outlined text-base')}>
                        description
                      </span>
                      {label}
                    </li>
                  )
                })}
              </ul>
            </Section>
          )}
        </section>
      )}
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  const cm = getClassMap()
  return (
    <div className={cm.sp('mt', 6)}>
      <h2
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-primary-dark dark:text-primary mb-2',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')}>{icon}</span>
        {title}
      </h2>
      <div className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed')}>{children}</div>
    </div>
  )
}
