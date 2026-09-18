import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { ServiceCard, type ServiceCardData } from '../components/ServiceCard.js'
import { unwrapList } from '../lib/unwrap.js'

export function Services() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [services, setServices] = useState<ServiceCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/services')
      .then((res) => {
        if (!cancelled) setServices(unwrapList<ServiceCardData>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('services.loadError', {}, { defaultValue: 'Failed to load services.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('mb-8')}>
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
          style={{ color: BRAND_COLOR }}
        >
          {t('services.eyebrow', {}, { defaultValue: '$ signalink services --health' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('services.heading', {}, { defaultValue: 'Service catalog' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'services.subheading',
            { appName: APP_NAME },
            {
              defaultValue:
                'Every service that ingests into {{appName}}, with live health and ownership.',
            },
          )}
        </p>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('services.loading', {}, { defaultValue: 'Loading services…' })}
        </p>
      ) : services.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('services.empty', {}, { defaultValue: 'No services discovered yet.' })}
        </p>
      ) : (
        <ul
          className={cm.cn('grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')}
        >
          {services.map((s) => (
            <li key={s.id}>
              <ServiceCard service={s} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
