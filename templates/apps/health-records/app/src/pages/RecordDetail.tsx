import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { t as tGlobal } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface RecordPayload {
  id: string
  user_id?: string
  name?: string
  test_name?: string
  panel_name?: string
  allergen?: string
  substance?: string
  dosage?: string
  frequency?: string
  prescriber?: string
  provider_name?: string
  clinic_name?: string
  chief_complaint?: string
  assessment?: string
  plan?: string
  notes?: string
  status?: string
  severity?: string
  reaction?: string
  icd10_code?: string
  ordering_provider?: string
  performing_lab?: string
  collected_date?: string
  result_date?: string
  start_date?: string
  end_date?: string
  onset_date?: string
  resolution_date?: string
  scheduled_at?: string
  completed_at?: string
  follow_up_at?: string
  category?: string
  source?: string
  flag?: string
  units?: string
  reference_range?: string
  refills_total?: number
  refills_used?: number
  refills_remaining?: number
  is_active?: boolean
  [key: string]: unknown
}

const TYPE_TO_PATH: Record<string, string> = {
  condition: '/api/conditions',
  allergy: '/api/allergies',
  visit: '/api/visits',
  lab: '/api/labs',
  medication: '/api/medications',
  procedure: '/api/visits',
}

const TYPE_LABEL: Record<string, string> = {
  condition: 'Condition',
  allergy: 'Allergy',
  visit: 'Visit',
  lab: 'Lab result',
  medication: 'Medication',
  procedure: 'Procedure',
}

const TYPE_LINK: Record<string, string> = {
  condition: '/records',
  allergy: '/records',
  visit: '/visits',
  lab: '/labs',
  medication: '/medications',
  procedure: '/visits',
}

function fmtDate(iso?: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmtDateOnly(iso?: string | null): string {
  if (!iso) return '—'
  return fmtDate(iso) || '—'
}

interface ParsedId {
  type: string
  rawId: string
}

function parseId(raw?: string): ParsedId | null {
  if (!raw) return null
  const colon = raw.indexOf(':')
  if (colon <= 0) {
    return { type: 'condition', rawId: raw }
  }
  return { type: raw.slice(0, colon), rawId: raw.slice(colon + 1) }
}

function recordTitle(type: string, payload: RecordPayload): string {
  if (type === 'condition') return payload.name ?? 'Condition'
  if (type === 'allergy') return payload.allergen ?? payload.substance ?? 'Allergy'
  if (type === 'visit' || type === 'procedure')
    return payload.chief_complaint ?? `Visit · ${payload.provider_name ?? ''}`.trim()
  if (type === 'lab') return payload.panel_name ?? payload.test_name ?? 'Lab result'
  if (type === 'medication') return payload.name ?? 'Medication'
  return 'Record'
}

interface MetadataRow {
  key: string
  label: string
  value: string
}

function metaLabel(key: string, defaultLabel: string): string {
  return tGlobal(`recordDetail.field.${key}`, undefined, { defaultValue: defaultLabel })
}

function row(key: string, defaultLabel: string, value: string): MetadataRow {
  return { key, label: metaLabel(key, defaultLabel), value }
}

function recordMetadata(type: string, p: RecordPayload): MetadataRow[] {
  const rows: MetadataRow[] = []
  switch (type) {
    case 'condition':
      if (p.icd10_code) rows.push(row('icd10', 'ICD-10', p.icd10_code))
      if (p.status) rows.push(row('status', 'Status', p.status))
      if (p.severity) rows.push(row('severity', 'Severity', p.severity))
      if (p.onset_date) rows.push(row('onset', 'Onset', fmtDateOnly(p.onset_date)))
      if (p.resolution_date) rows.push(row('resolved', 'Resolved', fmtDateOnly(p.resolution_date)))
      if (p.provider_name) rows.push(row('provider', 'Provider', p.provider_name))
      if (p.source) rows.push(row('source', 'Source', p.source))
      break
    case 'allergy':
      if (p.severity) rows.push(row('severity', 'Severity', p.severity))
      if (p.reaction) rows.push(row('reaction', 'Reaction', p.reaction))
      if (p.onset_date) rows.push(row('onset', 'Onset', fmtDateOnly(p.onset_date)))
      if (p.category) rows.push(row('category', 'Category', String(p.category)))
      break
    case 'visit':
    case 'procedure':
      if (p.scheduled_at) rows.push(row('scheduled', 'Scheduled', fmtDateOnly(p.scheduled_at)))
      if (p.completed_at) rows.push(row('completed', 'Completed', fmtDateOnly(p.completed_at)))
      if (p.provider_name) rows.push(row('provider', 'Provider', p.provider_name))
      if (p.clinic_name) rows.push(row('clinic', 'Clinic', p.clinic_name))
      if (p.follow_up_at) rows.push(row('followUp', 'Follow-up', fmtDateOnly(p.follow_up_at)))
      break
    case 'lab':
      if (p.collected_date) rows.push(row('collected', 'Collected', fmtDateOnly(p.collected_date)))
      if (p.result_date) rows.push(row('resulted', 'Resulted', fmtDateOnly(p.result_date)))
      if (p.ordering_provider) rows.push(row('orderedBy', 'Ordered by', p.ordering_provider))
      if (p.performing_lab) rows.push(row('lab', 'Lab', p.performing_lab))
      if (p.flag) rows.push(row('flag', 'Flag', p.flag))
      if (p.reference_range) rows.push(row('reference', 'Reference', p.reference_range))
      if (p.units) rows.push(row('units', 'Units', p.units))
      break
    case 'medication':
      if (p.dosage) rows.push(row('dosage', 'Dosage', p.dosage))
      if (p.frequency) rows.push(row('frequency', 'Frequency', p.frequency))
      if (p.prescriber) rows.push(row('prescriber', 'Prescriber', p.prescriber))
      if (p.start_date) rows.push(row('started', 'Started', fmtDateOnly(p.start_date)))
      if (p.refills_total !== undefined && p.refills_used !== undefined) {
        const left = Math.max(0, p.refills_total - p.refills_used)
        rows.push(
          row(
            'refills',
            'Refills',
            tGlobal(
              'recordDetail.refillsValue',
              { left, total: p.refills_total },
              { defaultValue: '{{left}}/{{total}} remaining' },
            ),
          ),
        )
      }
      break
  }
  return rows
}

export function RecordDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const parsed = useMemo(() => parseId(id), [id])
  const [data, setData] = useState<RecordPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!parsed) return
    const path = TYPE_TO_PATH[parsed.type]
    if (!path) {
      setError(
        t(
          'recordDetail.unsupportedType',
          { type: parsed.type },
          { defaultValue: 'Unsupported record type: {{type}}' },
        ),
      )
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`${path}/${parsed.rawId}`)
      .then((res) => {
        if (cancelled) return
        const payload = unwrapSingle<RecordPayload>(res)
        if (!payload) {
          setError(t('recordDetail.notFound', {}, { defaultValue: 'Record not found.' }))
        } else {
          setData(payload)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('recordDetail.loadError', {}, { defaultValue: 'Failed to load record.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed?.type, parsed?.rawId])

  if (loading) {
    return (
      <div
        className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
        data-mol-id="page-record-detail"
      >
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  if (error || !data || !parsed) {
    return (
      <div
        className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
        data-mol-id="page-record-detail"
      >
        <Link
          to="/records"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline mb-3',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('recordDetail.back', {}, { defaultValue: 'All records' })}
        </Link>
        <p className={cm.cn(cm.sp('py', 8), 'text-error font-bold')}>
          {error ?? t('recordDetail.notFound', {}, { defaultValue: 'Record not found.' })}
        </p>
      </div>
    )
  }

  const title = recordTitle(parsed.type, data)
  const metadata = recordMetadata(parsed.type, data)
  const typeLabel = t(
    `recordDetail.type.${parsed.type}`,
    {},
    { defaultValue: TYPE_LABEL[parsed.type] ?? parsed.type },
  )
  const fullViewLink =
    TYPE_LINK[parsed.type] && parsed.type !== 'condition' && parsed.type !== 'allergy'
      ? `${TYPE_LINK[parsed.type]}/${parsed.rawId}`
      : null

  return (
    <div
      className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
      data-mol-id="page-record-detail"
    >
      <div className={cm.cn(cm.sp('mb', 6))}>
        <Link
          to="/records"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline mb-3',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('recordDetail.back', {}, { defaultValue: 'All records' })}
        </Link>
        <p
          className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}
          data-mol-id="record-type"
        >
          {typeLabel}
        </p>
        <h1
          className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
          data-mol-id="record-title"
        >
          {title}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mt', 2),
            'text-on-surface-variant uppercase tracking-wider font-bold',
          )}
        >
          {t('recordDetail.idLine', { id: parsed.rawId }, { defaultValue: 'Record {{id}}' })}
        </p>
      </div>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <div className={cm.cn('lg:col-span-2', cm.flex({ direction: 'col', gap: 'md' }))}>
          {data.assessment && (
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
                {t('recordDetail.summary', {}, { defaultValue: 'Clinical summary' })}
              </h2>
              <p className={cm.cn(cm.textSize('base'), 'leading-relaxed')}>{data.assessment}</p>
            </section>
          )}
          {data.plan && (
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
                {t('nav.plan', {}, { defaultValue: 'Plan' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  'leading-relaxed text-on-surface-variant whitespace-pre-line',
                )}
              >
                {data.plan}
              </p>
            </section>
          )}
          {data.notes && (
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
                {t('form.notes', {}, { defaultValue: 'Notes' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  'leading-relaxed text-on-surface-variant whitespace-pre-line',
                )}
              >
                {data.notes}
              </p>
            </section>
          )}
          {!data.assessment && !data.plan && !data.notes && (
            <section
              className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
            >
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'recordDetail.noNarrative',
                  {},
                  { defaultValue: 'No clinical narrative on file for this record.' },
                )}
              </p>
            </section>
          )}
        </div>

        <aside className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
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
              {t('recordDetail.metadata', {}, { defaultValue: 'Metadata' })}
            </h2>
            <dl className={cm.cn('space-y-3')} data-mol-id="record-metadata">
              {metadata.length === 0 && (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('recordDetail.noMetadata', {}, { defaultValue: '—' })}
                </p>
              )}
              {metadata.map(({ key, label, value }) => (
                <div key={key}>
                  <dt
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant uppercase tracking-wider font-bold',
                    )}
                  >
                    {label}
                  </dt>
                  <dd className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {fullViewLink && (
            <section
              className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
            >
              <Link
                to={fullViewLink}
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'block uppercase tracking-widest text-primary hover:underline',
                )}
              >
                {t(
                  'recordDetail.fullView',
                  { type: typeLabel },
                  { defaultValue: 'Full {{type}} view →' },
                )}
              </Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
