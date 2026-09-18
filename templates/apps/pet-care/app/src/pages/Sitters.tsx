import { useEffect, useState } from 'react'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type SitterAvailability, SitterCard } from '../components/SitterCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiSitter {
  id: string
  display_name?: string
  bio?: string
  avg_rating?: number | string
  total_bookings?: number
  hourly_rate_cents?: number
  services?: string[]
  is_active?: boolean
  is_verified?: boolean
  location_city?: string
  photo_url?: string
}

function availabilityOf(s: ApiSitter): SitterAvailability {
  if (s.is_active === false) return 'unavailable'
  return 'available'
}

/** English defaults for known service keys — rendered through t() below. */
const SPECIALTY_LABELS: Record<string, string> = {
  walks: 'Dog walking',
  drop_in: 'Drop-in visits',
  overnight: 'Overnight',
  boarding: 'Boarding',
  medication: 'Medication',
  training: 'Training',
}

function formatSpecialties(t: TranslateFunction, services?: string[]): string[] {
  if (!services || services.length === 0) return []
  return services.map((s) =>
    t(`sitters.services.${s}`, {}, { defaultValue: SPECIALTY_LABELS[s] ?? s }),
  )
}

export function Sitters() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [sitters, setSitters] = useState<ApiSitter[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/sitters?limit=50')
      .then((res) => {
        if (cancelled) return
        setSitters(unwrapList<ApiSitter>(res))
      })
      .catch((err: unknown) => {
        console.error('[Sitters] failed to load sitters', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const data = sitters.map((s) => ({
    id: s.id,
    name: s.display_name ?? t('sitters.unnamed', {}, { defaultValue: 'Unnamed sitter' }),
    bio: s.bio,
    rating: typeof s.avg_rating === 'string' ? Number(s.avg_rating) : (s.avg_rating ?? 0),
    reviewCount: s.total_bookings ?? 0,
    hourlyRate: s.hourly_rate_cents ? Math.round(s.hourly_rate_cents / 100) : 0,
    specialties: formatSpecialties(t, s.services),
    availability: availabilityOf(s),
    location: s.location_city,
    photoUrl: s.photo_url,
  }))

  const q = search.trim().toLowerCase()
  const filtered = q
    ? data.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.location?.toLowerCase().includes(q) ?? false) ||
          s.specialties.some((sp) => sp.toLowerCase().includes(q)),
      )
    : data

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-sitters">
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
            {t('sitters.eyebrow', {}, { defaultValue: 'Marketplace' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('sitters.title', {}, { defaultValue: 'Find a sitter' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'sitters.subtitle',
              {},
              { defaultValue: 'Vetted, insured, and reviewed by real pet owners near you.' },
            )}
          </p>
        </div>
        <div className={cm.cn('relative', cm.w('full'), 'sm:w-80')}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cm.cn(
              cm.w('full'),
              cm.sp('pl', 12),
              cm.sp('pr', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 transition-all',
            )}
            placeholder={t(
              'sitters.searchPlaceholder',
              {},
              { defaultValue: 'Search sitters, neighborhoods…' },
            )}
          />
          <span
            className={cm.cn(
              'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
            )}
          >
            search
          </span>
        </div>
      </div>

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('sitters.loading', {}, { defaultValue: 'Loading sitters…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div
          className={cm.cn(cm.textCenter, cm.sp('py', 12), 'rounded-xl bg-surface-container-low')}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-6xl text-primary mb-2 block opacity-50',
            )}
          >
            person_search
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {t('sitters.empty.title', {}, { defaultValue: 'No sitters match' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'sitters.empty.body',
              {},
              { defaultValue: 'Try clearing the search to see everyone available near you.' },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
          {filtered.map((s) => (
            <SitterCard
              key={s.id}
              id={s.id}
              name={s.name}
              photoUrl={'photoUrl' in s ? s.photoUrl : undefined}
              rating={s.rating}
              reviewCount={s.reviewCount}
              specialties={s.specialties}
              hourlyRate={s.hourlyRate}
              availability={s.availability}
              bio={s.bio}
              location={s.location}
            />
          ))}
        </div>
      )}
    </div>
  )
}
