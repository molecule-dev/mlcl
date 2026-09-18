import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Provider {
  id: string
  first_name: string
  last_name: string
  specialty: string
  title: string
  avatar_url?: string
  rating: number
  total_reviews: number
  consultation_fee: number
  languages: string[]
  is_accepting_patients: boolean
}

interface Specialty {
  id: string
  slug?: string
  label: string
  icon?: string
}

export function Providers() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [providers, setProviders] = useState<Provider[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('')

  useEffect(() => {
    http.get('/api/providers/specialties').then((res) => setSpecialties(unwrapList<Specialty>(res)))
  }, [http])

  useEffect(() => {
    if (searchQuery.length >= 2) {
      http
        .get(`/api/providers/search?q=${encodeURIComponent(searchQuery)}`)
        .then((res) => setProviders(unwrapList<Provider>(res)))
    } else {
      const params = new URLSearchParams()
      if (selectedSpecialty) params.set('specialty', selectedSpecialty)
      params.set('available', 'true')
      http.get(`/api/providers?${params}`).then((res) => setProviders(unwrapList<Provider>(res)))
    }
  }, [http, searchQuery, selectedSpecialty])

  const inputClass = cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'w-full border border-outline-variant rounded-md bg-surface',
  )

  return (
    <div
      data-mol-id="page-providers"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}
    >
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('providers.title', {}, { defaultValue: 'Find a Provider' })}
        </h1>
      </header>

      <div className={cm.cn(cm.flex({ gap: 'md', wrap: 'wrap' }))}>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t(
            'providers.searchPlaceholder',
            {},
            { defaultValue: 'Search by name, specialty...' },
          )}
          className={cm.cn(inputClass, 'flex-1', 'search-input')}
          style={{ minWidth: '240px' }}
        />
        <select
          value={selectedSpecialty}
          onChange={(e) => setSelectedSpecialty(e.target.value)}
          className={cm.cn(inputClass, 'sm:w-auto', 'filter-select')}
          aria-label={t('providers.filterBySpecialty', {}, { defaultValue: 'Filter by specialty' })}
        >
          <option value="">
            {t('providers.allSpecialties', {}, { defaultValue: 'All Specialties' })}
          </option>
          {specialties.map((s) => (
            <option key={s.id} value={s.slug || s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {providers.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('providers.noResults', {}, { defaultValue: 'No providers found.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
          {providers.map((provider) => (
            <Link
              key={provider.id}
              to={`/providers/${provider.id}/book`}
              className={cm.cn(
                'provider-card',
                cm.card(),
                cm.sp('p', 5),
                cm.flex({ align: 'start', gap: 'md' }),
                'hover:bg-surface-container transition-colors',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.h(12),
                  cm.w(12),
                  'rounded-full bg-primary-container text-on-primary-container shrink-0 overflow-hidden',
                )}
              >
                {provider.avatar_url ? (
                  <img
                    src={provider.avatar_url}
                    alt={`${provider.first_name} ${provider.last_name}`}
                    className={'h-full w-full object-cover'}
                  />
                ) : (
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {provider.first_name[0]}
                    {provider.last_name[0]}
                  </span>
                )}
              </div>
              <div className={cm.cn(cm.flex1, 'min-w-0 space-y-1')}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'truncate')}>
                  {provider.title} {provider.first_name} {provider.last_name}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'truncate')}>
                  {provider.specialty}
                </p>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}>
                  <span className={cm.cn(cm.fontWeight('semibold'), 'text-warning')}>
                    {Number(provider.rating ?? 0).toFixed(1)} ★
                  </span>
                  <span className={'text-on-surface-variant'}>
                    {t(
                      'providers.reviews',
                      { count: provider.total_reviews ?? 0 },
                      { defaultValue: '({{count}} reviews)' },
                    )}
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-primary')}>
                  {t(
                    'providers.consultationFee',
                    { fee: Number(provider.consultation_fee ?? 0) },
                    { defaultValue: '${{fee}} per visit' },
                  )}
                </p>
                {provider.is_accepting_patients && (
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'inline-block rounded bg-success-container text-on-success-container',
                    )}
                  >
                    {t(
                      'providers.acceptingPatients',
                      {},
                      { defaultValue: 'Accepting new patients' },
                    )}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
