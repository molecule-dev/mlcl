import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface Medication {
  id: string
  name: string
  generic_name?: string | null
  dosage: string
  frequency: string
  route?: string | null
  prescriber?: string | null
  start_date?: string | null
  indication?: string | null
  pharmacy?: string | null
  instructions?: string | null
  refills_total: number
  refills_used: number
  refills_remaining?: number
  status?: string
  is_active?: boolean
  notes?: string | null
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Once daily',
  twice_daily: 'Twice daily',
  three_times_daily: 'Three times daily',
  four_times_daily: 'Four times daily',
  weekly: 'Weekly',
  as_needed: 'As needed',
  other: '',
}

function fmtFrequency(f?: string): string {
  if (!f) return ''
  return FREQUENCY_LABELS[f] ?? f
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const DEFAULT_DAYS_PER_REFILL = 30

export function MedicationDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [med, setMed] = useState<Medication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refilling, setRefilling] = useState(false)
  const [refillMessage, setRefillMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  )

  const fetchMed = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await http.get(`/api/medications/${id}`)
      const data = unwrapSingle<Medication>(res)
      if (!data) {
        setError(t('medicationDetail.notFound', {}, { defaultValue: 'Medication not found.' }))
      } else {
        setMed(data)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('medicationDetail.loadError', {}, { defaultValue: 'Failed to load medication.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleRefill = async () => {
    if (!med || !id || refilling) return
    setRefilling(true)
    setRefillMessage(null)
    try {
      await http.post(`/api/medications/${id}/refill`, {})
      track({ name: 'medication.refilled', properties: { medication_id: id, name: med.name } })
      setRefillMessage({
        kind: 'ok',
        text: t('medicationDetail.refillOk', {}, { defaultValue: 'Refill submitted to pharmacy.' }),
      })
      await fetchMed()
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t('medicationDetail.refillError', {}, { defaultValue: 'Refill failed.' })
      setRefillMessage({ kind: 'err', text: msg })
    } finally {
      setRefilling(false)
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
        data-mol-id="page-medication-detail"
      >
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  if (error || !med) {
    return (
      <div
        className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
        data-mol-id="page-medication-detail"
      >
        <Link
          to="/medications"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline mb-3',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('medicationDetail.back', {}, { defaultValue: 'All medications' })}
        </Link>
        <p className={cm.cn(cm.sp('py', 8), 'text-error font-bold')}>
          {error ?? t('medicationDetail.notFound', {}, { defaultValue: 'Medication not found.' })}
        </p>
      </div>
    )
  }

  const refillsLeft = Math.max(0, (med.refills_total ?? 0) - (med.refills_used ?? 0))
  const daysSupply = DEFAULT_DAYS_PER_REFILL
  const daysRemaining = Math.max(0, refillsLeft * DEFAULT_DAYS_PER_REFILL - 5)
  const supplyPct = Math.max(0, Math.min(100, (daysRemaining / Math.max(1, daysSupply)) * 100))

  return (
    <div
      className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
      data-mol-id="page-medication-detail"
    >
      <div className={cm.cn(cm.sp('mb', 6))}>
        <Link
          to="/medications"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline mb-3',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('medicationDetail.back', {}, { defaultValue: 'All medications' })}
        </Link>
        <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
          {med.is_active === false
            ? t(
                'medicationDetail.eyebrowDiscontinued',
                {},
                { defaultValue: 'Discontinued prescription' },
              )
            : t('medicationDetail.eyebrowActive', {}, { defaultValue: 'Active prescription' })}
        </p>
        <h1
          className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
          data-mol-id="medication-name"
        >
          {med.name}
        </h1>
        {med.generic_name && (
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {med.generic_name}
          </p>
        )}
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mt', 2),
            'text-on-surface-variant uppercase tracking-wider font-bold',
          )}
        >
          {t('medicationDetail.idLine', { id: med.id }, { defaultValue: 'Med {{id}}' })}
        </p>
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl shadow-sm',
          cm.sp('mb', 6),
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), cm.sp('mb', 3))}>
          <span
            className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tabular-nums')}
            style={{ fontFamily: 'var(--mol-font-mono)' }}
          >
            {med.dosage}
          </span>
          <span className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
            {med.frequency
              ? t(
                  `medicationDetail.frequency.${med.frequency}`,
                  {},
                  { defaultValue: fmtFrequency(med.frequency) },
                )
              : ''}
          </span>
        </div>
        {med.instructions && (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 4),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {med.instructions}
          </p>
        )}
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 2))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('medicationDetail.supplyLeft', {}, { defaultValue: 'Days remaining' })}
          </span>
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'tabular-nums')}
            style={{ fontFamily: 'var(--mol-font-mono)' }}
          >
            {daysRemaining}/{daysSupply}
          </span>
        </div>
        <div className={cm.cn('h-2 rounded-full bg-surface-container overflow-hidden')}>
          <div
            className={cm.cn('h-full rounded-full transition-all')}
            style={{
              width: `${supplyPct}%`,
              backgroundColor:
                supplyPct < 25
                  ? 'var(--color-clinical-abnormal)'
                  : supplyPct < 50
                    ? 'var(--color-clinical-caution)'
                    : 'var(--color-clinical-normal)',
            }}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mt', 4))}>
          <p
            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
            data-mol-id="refills-remaining"
          >
            {t(
              'medicationDetail.refillsLeft',
              { left: refillsLeft, total: med.refills_total },
              { defaultValue: '{{left}}/{{total}} refills available' },
            )}
          </p>
          <button
            type="button"
            onClick={handleRefill}
            disabled={refilling || refillsLeft <= 0}
            className={cm.cn(
              cm.fontWeight('bold'),
              'px-4 py-2 text-[11px] uppercase tracking-widest rounded-full bg-primary text-on-primary shadow-sm hover:shadow-md transition-shadow disabled:opacity-50',
            )}
            data-mol-id="request-refill"
          >
            {refilling
              ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
              : t('medicationDetail.requestRefill', {}, { defaultValue: 'Request refill' })}
          </button>
        </div>
        {refillMessage && (
          <p
            role="status"
            className={cm.cn(
              cm.sp('mt', 3),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              refillMessage.kind === 'ok' ? 'text-clinical-normal' : 'text-error',
            )}
            data-mol-id="refill-message"
          >
            {refillMessage.text}
          </p>
        )}
      </section>

      <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2', cm.sp('mb', 6))}>
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
            {t('medicationDetail.prescription', {}, { defaultValue: 'Prescription' })}
          </h2>
          <dl className={cm.cn('space-y-3')}>
            {(
              [
                ['prescriber', 'Prescriber', med.prescriber ?? '—'],
                ['pharmacy', 'Pharmacy', med.pharmacy ?? '—'],
                ['started', 'Started', fmtDate(med.start_date)],
                ['indication', 'Indication', med.indication ?? '—'],
                ['route', 'Route', med.route ?? '—'],
              ] as const
            ).map(([key, label, v]) => (
              <div key={key}>
                <dt
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant uppercase tracking-wider font-bold',
                  )}
                >
                  {t(`medicationDetail.field.${key}`, {}, { defaultValue: label })}
                </dt>
                <dd className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

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
            {t('medicationDetail.refillHistory', {}, { defaultValue: 'Refill history' })}
          </h2>
          <dl className={cm.cn('space-y-3')}>
            <div>
              <dt
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-wider font-bold',
                )}
              >
                {t('medicationDetail.refillsUsed', {}, { defaultValue: 'Refills used' })}
              </dt>
              <dd
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tabular-nums')}
                data-mol-id="refills-used"
              >
                {med.refills_used ?? 0} / {med.refills_total ?? 0}
              </dd>
            </div>
            <div>
              <dt
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-wider font-bold',
                )}
              >
                {t('medicationDetail.status', {}, { defaultValue: 'Status' })}
              </dt>
              <dd className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'capitalize')}>
                {med.status ??
                  (med.is_active === false
                    ? t('medicationDetail.statusInactive', {}, { defaultValue: 'Inactive' })
                    : t('medicationDetail.statusActive', {}, { defaultValue: 'Active' }))}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {med.notes && (
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
          <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}>
            {med.notes}
          </p>
        </section>
      )}
    </div>
  )
}
