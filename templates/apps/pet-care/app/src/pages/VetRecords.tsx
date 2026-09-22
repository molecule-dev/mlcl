import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AddVetRecordModal } from '../components/AddVetRecordModal.js'
import { LoadErrorBanner } from '../components/LoadErrorBanner.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiVetRecord {
  id: string
  pet_id: string
  kind?: string
  title?: string
  occurred_on?: string
  vet_name?: string
  clinic_name?: string
  summary?: string
  follow_up_date?: string
}

interface ApiPet {
  id: string
  name: string
}

type RecordCategory = 'vaccination' | 'checkup' | 'surgery' | 'lab' | 'other'

const CATEGORY_COLOR: Record<RecordCategory, string> = {
  vaccination: 'var(--color-pet-vaccinated)',
  checkup: 'var(--color-pet-booked)',
  surgery: 'var(--color-pet-critical)',
  lab: 'var(--color-pet-attention)',
  other: 'var(--color-pet-healthy)',
}

const CATEGORY_ICON: Record<RecordCategory, string> = {
  vaccination: 'vaccines',
  checkup: 'medical_services',
  surgery: 'surgical',
  lab: 'science',
  other: 'medical_information',
}

function categorize(kind: string | undefined, title: string | undefined): RecordCategory {
  if (kind === 'vaccine') return 'vaccination'
  if (kind === 'surgery') return 'surgery'
  if (kind === 'test') return 'lab'
  if (kind === 'visit') return 'checkup'
  const r = (title || '').toLowerCase()
  if (r.includes('vacc') || r.includes('booster') || r.includes('rabies')) return 'vaccination'
  if (r.includes('surger') || r.includes('spay') || r.includes('neuter') || r.includes('dental'))
    return 'surgery'
  if (r.includes('lab') || r.includes('test') || r.includes('panel')) return 'lab'
  if (r.includes('check')) return 'checkup'
  return 'other'
}

export function VetRecords() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [records, setRecords] = useState<ApiVetRecord[]>([])
  const [pets, setPets] = useState<ApiPet[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const loadAll = () => {
    setLoading(true)
    setLoadError(false)
    Promise.allSettled([http.get('/api/vet-records?limit=100'), http.get('/api/pets')]).then(
      ([r, p]) => {
        if (r.status === 'fulfilled') setRecords(unwrapList<ApiVetRecord>(r.value))
        else {
          console.error('[VetRecords] records failed', r.reason)
          setLoadError(true)
        }
        if (p.status === 'fulfilled') setPets(unwrapList<ApiPet>(p.value))
        else console.error('[VetRecords] pets failed', p.reason)
        setLoading(false)
      },
    )
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAll is stable within the render; re-run only when http changes
  }, [http])

  const petNameById = useMemo(() => new Map(pets.map((p) => [p.id, p.name])), [pets])
  const data = records.map((r) => ({
    ...r,
    pet_name: petNameById.get(r.pet_id) || '—',
    category: categorize(r.kind, r.title),
  }))

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-vet-records">
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
            {t('vetRecords.eyebrow', {}, { defaultValue: 'Clinical history' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('vetRecords.title', {}, { defaultValue: 'Vet records' })}
          </h1>
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
          data-mol-id="cta-add-vet-record"
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>add</span>
          {t('vetRecords.uploadCta', {}, { defaultValue: 'Add record' })}
        </button>
      </div>

      {loadError && !loading ? (
        <LoadErrorBanner onRetry={() => loadAll()} />
      ) : loading ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('vetRecords.loading', {}, { defaultValue: 'Loading records…' })}
        </p>
      ) : data.length === 0 ? (
        <div
          className={cm.cn(cm.textCenter, cm.sp('py', 12), 'rounded-xl bg-surface-container-low')}
          data-mol-id="vet-records-empty"
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-6xl text-primary mb-2 block opacity-50',
            )}
          >
            medical_information
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {t('vetRecords.empty.title', {}, { defaultValue: 'No records yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {pets.length === 0
              ? t(
                  'vetRecords.empty.noPet',
                  {},
                  {
                    defaultValue: 'Add a pet first, then log vet visits, vaccinations, and tests.',
                  },
                )
              : t(
                  'vetRecords.empty.body',
                  {},
                  { defaultValue: 'Track vet visits, vaccinations, and tests in one place.' },
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
              {t('vetRecords.empty.cta', {}, { defaultValue: 'Add first record' })}
            </button>
          )}
        </div>
      ) : (
        <div className={cm.cn('rounded-2xl bg-surface-container-lowest shadow-sm overflow-hidden')}>
          <table className={cm.cn(cm.w('full'), cm.textSize('sm'))}>
            <thead>
              <tr className={cm.cn('bg-primary text-on-primary')}>
                <th
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.textCenter,
                    cm.w(0),
                    'uppercase tracking-widest text-[10px] font-bold',
                  )}
                >
                  {t('form.type', {}, { defaultValue: 'Type' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    'text-left uppercase tracking-widest text-[10px] font-bold',
                  )}
                >
                  {t('vetRecords.columns.record', {}, { defaultValue: 'Record' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    'text-left uppercase tracking-widest text-[10px] font-bold',
                  )}
                >
                  {t('vetRecords.columns.pet', {}, { defaultValue: 'Pet' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    'text-left uppercase tracking-widest text-[10px] font-bold',
                  )}
                >
                  {t('vetRecords.columns.vet', {}, { defaultValue: 'Vet' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    'text-left uppercase tracking-widest text-[10px] font-bold',
                  )}
                >
                  {t('form.date', {}, { defaultValue: 'Date' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/30')}>
              {data.map((r) => (
                <tr
                  key={r.id}
                  className={cm.cn('hover:bg-surface-container-low transition-colors')}
                  data-mol-id={`vet-record-${r.id}`}
                >
                  <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), cm.w(0))}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.roundedFull,
                        'shrink-0 w-9 h-9 mx-auto',
                      )}
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, ' + CATEGORY_COLOR[r.category] + ' 14%, white)',
                        color: CATEGORY_COLOR[r.category],
                      }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base')}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {CATEGORY_ICON[r.category]}
                      </span>
                    </span>
                  </td>
                  <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}>
                    <Link
                      to={`/vet-records/${r.id}`}
                      className={cm.cn(cm.fontWeight('semibold'), 'block hover:text-primary')}
                      data-mol-id={`vet-record-link-${r.id}`}
                    >
                      {r.title || '—'}
                    </Link>
                    {r.summary && (
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.sp('mt', 1),
                          'text-on-surface-variant truncate max-w-md',
                        )}
                      >
                        {r.summary}
                      </p>
                    )}
                  </td>
                  <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}>
                    {r.pet_id ? (
                      <Link
                        to={`/pets/${r.pet_id}`}
                        className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
                      >
                        {r.pet_name}
                      </Link>
                    ) : (
                      <span className={cm.fontWeight('semibold')}>{r.pet_name}</span>
                    )}
                  </td>
                  <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), 'text-on-surface-variant')}>
                    {r.vet_name || '—'}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 4),
                      'tabular-nums text-on-surface-variant',
                    )}
                    style={{ fontFamily: 'var(--mol-font-mono)' }}
                  >
                    {r.occurred_on
                      ? new Date(r.occurred_on).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddVetRecordModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => loadAll()}
      />
    </div>
  )
}
