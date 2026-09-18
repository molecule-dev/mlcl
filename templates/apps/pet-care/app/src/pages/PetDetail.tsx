import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  type BookingStatus,
  BookingTimelineEntry,
  type BookingType,
} from '../components/BookingTimelineEntry.js'
import type { PetSpecies } from '../components/PetProfileCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ApiPet {
  id: string
  name: string
  species: string
  breed?: string
  date_of_birth?: string
  weight_kg?: number
  microchip_id?: string
  photo_url?: string
  notes?: string
  health_status?: string
}

interface ApiVetRecord {
  id: string
  pet_id: string
  kind?: string
  title?: string
  occurred_on?: string
  vet_name?: string
  summary?: string
}

interface ApiBooking {
  id: string
  service?: string
  status?: string
  start_date?: string
  starts_at?: string
  sitter_name?: string
  pet_ids?: string[]
  notes?: string
}

const SPECIES_ICON: Record<PetSpecies, string> = {
  dog: 'sound_detection_dog_barking',
  cat: 'pets',
  bird: 'flutter',
  rabbit: 'cruelty_free',
  fish: 'water',
  other: 'pets',
}

function speciesOf(s: string | undefined): PetSpecies {
  switch (s) {
    case 'dog':
    case 'cat':
    case 'bird':
    case 'rabbit':
    case 'fish':
      return s
    default:
      return 'other'
  }
}

function fmtAge(dob: string | undefined): string {
  if (!dob) return '—'
  const t = Date.now() - new Date(dob).getTime()
  if (Number.isNaN(t)) return '—'
  const years = Math.floor(t / (365.25 * 24 * 3600 * 1000))
  if (years >= 1) return `${years} yr${years === 1 ? '' : 's'}`
  const months = Math.max(1, Math.floor(t / (30 * 24 * 3600 * 1000)))
  return `${months} mo`
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtTime(iso: string | undefined): string | undefined {
  if (!iso) return undefined
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function bookingTypeOf(service: string | undefined): BookingType {
  if (service === 'walks' || service === 'walk') return 'walk'
  if (service === 'overnight' || service === 'boarding') return 'sitting'
  if (service === 'medication') return 'vet'
  return 'sitting'
}

function bookingStatusOf(status: string | undefined): BookingStatus {
  if (
    status === 'confirmed' ||
    status === 'in_progress' ||
    status === 'completed' ||
    status === 'cancelled' ||
    status === 'pending' ||
    status === 'upcoming'
  )
    return status
  return 'upcoming'
}

export function PetDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [pet, setPet] = useState<ApiPet | null>(null)
  const [vetRecords, setVetRecords] = useState<ApiVetRecord[]>([])
  const [bookings, setBookings] = useState<ApiBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.allSettled([
      http.get(`/api/pets/${id}`),
      http.get(`/api/vet-records?pet_id=${id}&limit=20`),
      http.get('/api/bookings?limit=100'),
    ]).then(([p, v, b]) => {
      if (cancelled) return
      if (p.status === 'fulfilled') setPet(unwrapSingle<ApiPet>(p.value))
      else console.error('[PetDetail] pet failed', p.reason)
      if (v.status === 'fulfilled') setVetRecords(unwrapList<ApiVetRecord>(v.value))
      else console.error('[PetDetail] vet records failed', v.reason)
      if (b.status === 'fulfilled') setBookings(unwrapList<ApiBooking>(b.value))
      else console.error('[PetDetail] bookings failed', b.reason)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [http, id])

  const timeline = useMemo(() => {
    if (!pet) return []
    type Entry = {
      id: string
      sortKey: number
      dateLabel: string
      timeLabel?: string
      type: BookingType
      status: BookingStatus
      title: string
      providerName?: string
      summary?: string
    }
    const entries: Entry[] = []
    for (const b of bookings) {
      const linked = b.pet_ids?.includes(pet.id)
      if (!linked) continue
      const date = b.start_date || b.starts_at
      const dateMs = date ? new Date(date).getTime() : 0
      entries.push({
        id: `booking-${b.id}`,
        sortKey: dateMs,
        dateLabel: fmtDate(date),
        timeLabel: fmtTime(date),
        type: bookingTypeOf(b.service),
        status: bookingStatusOf(b.status),
        title: b.service || t('bookings.fallbackService', {}, { defaultValue: 'Booking' }),
        providerName: b.sitter_name,
        summary: b.notes,
      })
    }
    for (const v of vetRecords) {
      const dateMs = v.occurred_on ? new Date(v.occurred_on).getTime() : 0
      entries.push({
        id: `vet-${v.id}`,
        sortKey: dateMs,
        dateLabel: fmtDate(v.occurred_on),
        type: 'vet',
        status: 'completed',
        title:
          v.title ||
          (v.kind
            ? v.kind.charAt(0).toUpperCase() + v.kind.slice(1)
            : t('vetRecords.fallbackTitle', {}, { defaultValue: 'Vet visit' })),
        providerName: v.vet_name,
        summary: v.summary,
      })
    }
    entries.sort((a, b) => b.sortKey - a.sortKey)
    return entries
  }, [pet, vetRecords, bookings, t])

  if (loading && !pet) {
    return (
      <div className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('p', 8))}>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('petDetail.loading', {}, { defaultValue: 'Loading pet…' })}
        </p>
      </div>
    )
  }
  if (!pet) {
    return (
      <div className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('p', 8))}>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('petDetail.notFound', {}, { defaultValue: 'Pet not found.' })}
        </p>
        <Link to="/pets" className={cm.cn(cm.sp('mt', 4), 'text-primary')}>
          {t('petDetail.back', {}, { defaultValue: 'Back to pets' })}
        </Link>
      </div>
    )
  }

  const species = speciesOf(pet.species)

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-pet-detail">
      <Link
        to="/pets"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          cm.sp('mb', 4),
          'inline-flex text-on-surface-variant hover:text-primary',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
        {t('petDetail.back', {}, { defaultValue: 'Back to pets' })}
      </Link>

      <section
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-[2rem] text-white relative overflow-hidden shadow-2xl',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--mol-color-primary-dark) 0%, var(--color-pet-booked) 50%, var(--color-pet-healthy) 100%)',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn('relative z-10', cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }))}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'overflow-hidden border-4 border-surface/40 shadow-xl',
            )}
            style={{ width: '128px', height: '128px', background: 'rgba(255,255,255,0.18)' }}
          >
            {pet.photo_url ? (
              <img
                src={pet.photo_url}
                alt={pet.name}
                className={cm.cn('w-full h-full object-cover')}
              />
            ) : (
              <span
                className={cm.cn('material-symbols-outlined text-7xl text-white')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {SPECIES_ICON[species]}
              </span>
            )}
          </div>
          <div className={cm.cn(cm.flex1, 'min-w-0')}>
            <p
              className={cm.cn(
                'text-[11px] font-bold uppercase tracking-widest text-cyan-200/90 mb-2',
              )}
            >
              {t('petDetail.eyebrow', {}, { defaultValue: 'Pet profile' })}
            </p>
            <h1
              className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight')}
              data-mol-id="pet-name"
            >
              {pet.name}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-white/85')}>
              {pet.breed ? `${pet.breed} · ` : ''}
              {fmtAge(pet.date_of_birth)}
              {pet.weight_kg ? ` · ${pet.weight_kg} kg` : ''}
            </p>
            {pet.microchip_id && (
              <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }), cm.sp('mt', 4))}>
                <span
                  className={cm.cn(
                    'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/15 backdrop-blur-md text-white tabular-nums',
                  )}
                  style={{ fontFamily: 'var(--mol-font-mono)' }}
                >
                  ID · {pet.microchip_id}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-2', cm.sp('mt', 8))}>
        <section
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
        >
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary-dark dark:text-primary mb-3',
            )}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed')}>
            {pet.notes ||
              t(
                'petDetail.aboutEmpty',
                {},
                { defaultValue: "No notes yet — add some so sitters know your pet's quirks." },
              )}
          </p>
        </section>

        <section
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
        >
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary-dark dark:text-primary mb-3',
            )}
          >
            {t('petDetail.factsTitle', {}, { defaultValue: 'Quick facts' })}
          </h2>
          <dl className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {[
              {
                key: 'species',
                label: t('petDetail.facts.species', {}, { defaultValue: 'Species' }),
                value: t(`petDetail.species.${species}`, {}, { defaultValue: species }),
              },
              {
                key: 'breed',
                label: t('petDetail.facts.breed', {}, { defaultValue: 'Breed' }),
                value: pet.breed || '—',
              },
              {
                key: 'age',
                label: t('petDetail.facts.age', {}, { defaultValue: 'Age' }),
                value: fmtAge(pet.date_of_birth),
              },
              {
                key: 'weight',
                label: t('petDetail.facts.weight', {}, { defaultValue: 'Weight' }),
                value: pet.weight_kg ? `${pet.weight_kg} kg` : '—',
              },
              {
                key: 'microchip',
                label: t('petDetail.facts.microchip', {}, { defaultValue: 'Microchip' }),
                value: pet.microchip_id || '—',
              },
            ].map((fact) => (
              <div
                key={fact.key}
                className={cm.cn(cm.flex({ justify: 'between' }), cm.textSize('sm'))}
              >
                <dt className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface-variant')}>
                  {fact.label}
                </dt>
                <dd
                  className={cm.cn('tabular-nums')}
                  style={{
                    fontFamily: fact.key === 'microchip' ? 'var(--mol-font-mono)' : undefined,
                  }}
                >
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className={cm.sp('mt', 8)}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('petDetail.timelineTitle', {}, { defaultValue: 'Activity timeline' })}
        </h2>
        {timeline.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'petDetail.timelineEmpty',
              {},
              { defaultValue: 'No bookings or vet records yet for this pet.' },
            )}
          </p>
        ) : (
          <div>
            {timeline.map((entry, i) => (
              <BookingTimelineEntry
                key={entry.id}
                dateLabel={entry.dateLabel}
                timeLabel={entry.timeLabel}
                type={entry.type}
                status={entry.status}
                title={entry.title}
                providerName={entry.providerName || ''}
                summary={entry.summary}
                isLast={i === timeline.length - 1}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
