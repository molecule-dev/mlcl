import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EnvironmentCard, type EnvironmentData } from '../components/EnvironmentCard.js'
import { unwrapList } from '../lib/unwrap.js'

export function Environments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [envs, setEnvs] = useState<EnvironmentData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/environments')
      .then((res) => {
        if (!cancelled) setEnvs(unwrapList<EnvironmentData>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('environments.loadError', {}, { defaultValue: 'Failed to load environments.' }),
          )
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
      <header className={'mb-8'}>
        <p className={'font-mono text-xs font-bold uppercase tracking-widest text-primary mb-2'}>
          {t('environments.eyebrow', {}, { defaultValue: '$ conduit env --list' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('environments.heading', {}, { defaultValue: 'Environments' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'environments.subheading',
            {},
            { defaultValue: 'Live deployment status across every target.' },
          )}
        </p>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('environments.loading', {}, { defaultValue: 'Loading environments…' })}
        </p>
      ) : envs.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('environments.empty', {}, { defaultValue: 'No environments configured.' })}
        </p>
      ) : (
        <div className={'grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'}>
          {envs.map((env) => (
            <EnvironmentCard key={env.id} environment={env} />
          ))}
        </div>
      )}
    </div>
  )
}
