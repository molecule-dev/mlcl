import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { AddMedicationModal } from '../components/AddMedicationModal.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiMedication {
  id: string
  pet_id: string
  name: string
  dosage?: string
  frequency?: string
  prescriber?: string
  start_date?: string
  end_date?: string
  instructions?: string
  is_active?: boolean
}

interface ApiPet {
  id: string
  name: string
}

type RefillStatus = 'fine' | 'due_soon' | 'overdue' | 'no_end'

const REFILL_BG: Record<RefillStatus, string> = {
  fine: 'bg-success-container text-on-success-container',
  due_soon: 'bg-warning-container text-on-warning-container',
  overdue: 'bg-error-container text-on-error-container',
  no_end: 'bg-info-container text-on-info-container',
}

const REFILL_BORDER: Record<RefillStatus, string> = {
  fine: 'var(--color-pet-healthy)',
  due_soon: 'var(--color-pet-attention)',
  overdue: 'var(--color-pet-critical)',
  no_end: 'var(--color-pet-vaccinated)',
}

function refillStatusFor(endDate: string | undefined): { status: RefillStatus; days: number } {
  if (!endDate) return { status: 'no_end', days: 0 }
  const end = new Date(endDate)
  const days = Math.floor((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0) return { status: 'overdue', days }
  if (days < 7) return { status: 'due_soon', days }
  return { status: 'fine', days }
}

export function Medications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [meds, setMeds] = useState<ApiMedication[]>([])
  const [pets, setPets] = useState<ApiPet[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const loadAll = () => {
    setLoading(true)
    setLoadError(false)
    Promise.allSettled([
      http.get('/api/medications?active=true&limit=100'),
      http.get('/api/pets'),
    ]).then(([m, p]) => {
      if (m.status === 'fulfilled') setMeds(unwrapList<ApiMedication>(m.value))
      else {
        console.error('[Medications] meds failed', m.reason)
        setLoadError(true)
      }
      if (p.status === 'fulfilled') setPets(unwrapList<ApiPet>(p.value))
      else console.error('[Medications] pets failed', p.reason)
      setLoading(false)
    })
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAll is stable within the render; re-run only when http changes
  }, [http])

  const petNameById = useMemo(() => new Map(pets.map((p) => [p.id, p.name])), [pets])
  const data = meds.map((m) => {
    const { status, days } = refillStatusFor(m.end_date)
    return {
      id: m.id,
      pet_name: petNameById.get(m.pet_id) || '—',
      pet_id: m.pet_id,
      name: m.name,
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      prescriber: m.prescriber || '',
      refillInDays: days,
      refillStatus: status,
    }
  })

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-medications">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-widest text-primary-dark dark:text-primary mb-1',
            )}
          >
            {t('status.active', {}, { defaultValue: 'Active' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('medications.title', {}, { defaultValue: 'Medications' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'medications.subtitle',
              { count: data.length },
              { defaultValue: '{{count}} active prescriptions across your household.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          disabled={pets.length === 0}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-xl text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-50',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
          }}
          data-mol-id="cta-add-medication"
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>add</span>
          {t('medications.addCta', {}, { defaultValue: 'Add medication' })}
        </button>
      </div>

      {loadError && !loading ? (
        <LoadErrorBanner
          data-mol-id="load-error-banner"
          message={t('common.loadError.title', {}, { defaultValue: 'Something went wrong' })}
          detail={t(
            'common.loadError.body',
            {},
            { defaultValue: 'We could not load this content. Check your connection and retry.' },
          )}
          onRetry={() => loadAll()}
        />
      ) : loading ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('medications.loading', {}, { defaultValue: 'Loading meds…' })}
        </p>
      ) : data.length === 0 ? (
        <div
          className={cm.cn(cm.textCenter, cm.sp('py', 12), 'rounded-xl bg-surface-container-low')}
          data-mol-id="medications-empty"
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-6xl text-primary mb-2 block opacity-50',
            )}
          >
            medication
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {t('medications.empty.title', {}, { defaultValue: 'No active medications' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {pets.length === 0
              ? t(
                  'medications.empty.noPet',
                  {},
                  { defaultValue: 'Add a pet first to track their medications.' },
                )
              : t(
                  'medications.empty.body',
                  {},
                  { defaultValue: 'Track dosages, refills, and prescriber notes for every pet.' },
                )}
          </p>
          {pets.length > 0 && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className={cm.cn(
                cm.sp('mt', 4),
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-xl text-white inline-flex',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
              }}
            >
              {t('medications.empty.cta', {}, { defaultValue: 'Add first medication' })}
            </button>
          )}
        </div>
      ) : (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {data.map((m) => (
            <article
              key={m.id}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('p', 5),
                'rounded-2xl bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
                cm.accentCard({ tone: 'custom' }),
              )}
              style={{ ['--mol-accent' as string]: REFILL_BORDER[m.refillStatus] }}
              data-mol-id={`medication-${m.id}`}
            >
              <div
                className={cm.cn(
                  cm.shrink0,
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'shadow-sm w-14 h-14',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
                  color: 'white',
                }}
                aria-hidden="true"
              >
                <span
                  className={cm.cn('material-symbols-outlined text-xl')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  medication
                </span>
              </div>
              <div className={cm.cn(cm.flex1, 'min-w-0')}>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }))}>
                  <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'truncate')}>
                    {m.name}
                  </p>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'text-on-surface-variant',
                    )}
                  >
                    · {m.pet_name}
                  </span>
                </div>
                {(m.dosage || m.frequency) && (
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant tabular-nums')}
                    style={{ fontFamily: 'var(--mol-font-mono)' }}
                  >
                    {[m.dosage, m.frequency].filter(Boolean).join(' · ')}
                  </p>
                )}
                {m.prescriber && (
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mt', 1),
                      'text-on-surface-variant truncate',
                    )}
                  >
                    {m.prescriber}
                  </p>
                )}
              </div>
              <div
                className={cm.cn(
                  cm.shrink0,
                  cm.flex({ direction: 'col', align: 'end', gap: 'xs' }),
                )}
              >
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'px-3 py-1 text-[10px] uppercase tracking-widest rounded-full',
                    REFILL_BG[m.refillStatus],
                  )}
                >
                  {m.refillStatus === 'overdue'
                    ? t(
                        'medications.refill.overdue',
                        { days: Math.abs(m.refillInDays) },
                        { defaultValue: 'Ended {{days}}d ago' },
                      )
                    : m.refillStatus === 'due_soon'
                      ? t(
                          'medications.refill.dueSoon',
                          { days: m.refillInDays },
                          { defaultValue: 'Ends in {{days}}d' },
                        )
                      : m.refillStatus === 'no_end'
                        ? t('medications.refill.ongoing', {}, { defaultValue: 'Ongoing' })
                        : t(
                            'medications.refill.fine',
                            { days: m.refillInDays },
                            { defaultValue: '{{days}}d remaining' },
                          )}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <AddMedicationModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => loadAll()}
      />
    </div>
  )
}
