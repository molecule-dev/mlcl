import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface SDK {
  language: string
  package_name: string
  install_command: string
  version: string
  github_url: string
  example: string
}

export function SDKs() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [sdks, setSdks] = useState<SDK[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/sdks')
      .then((res) => {
        if (!cancelled) setSdks(unwrapList<SDK>(res))
      })
      .catch(() => {
        if (!cancelled) setError(t('sdks.loadError', {}, { defaultValue: 'Failed to load SDKs.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary font-mono',
          )}
        >
          {t('sdks.eyebrow', {}, { defaultValue: 'CLIENT_LIBS' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('sdks.heading', {}, { defaultValue: 'SDKs' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'sdks.subheading',
            { appName: APP_NAME },
            {
              defaultValue:
                'Official client libraries for the {{appName}} API. All in sync with the OpenAPI spec.',
            },
          )}
        </p>
        {!loading && !error && sdks.length > 0 ? (
          <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-primary-container text-primary uppercase tracking-wider font-mono',
              )}
            >
              {t(
                'sdks.totalCount',
                { count: sdks.length },
                { defaultValue: '{{count}} languages' },
              )}
            </span>
          </div>
        ) : null}
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : sdks.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('sdks.empty', {}, { defaultValue: 'No SDKs published yet.' })}
        </p>
      ) : (
        <ul className={cm.grid({ cols: 2, gap: 'md' })}>
          {sdks.map((s) => (
            <li key={s.language} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <header className={cm.flex({ align: 'center', justify: 'between' })}>
                <div>
                  <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                    {s.language}
                  </h2>
                  <code
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'font-mono')}
                  >
                    {s.package_name}
                  </code>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.roundedFull,
                    'bg-primary-container font-mono',
                    cm.textPrimary,
                  )}
                >
                  v{s.version}
                </span>
              </header>
              <pre
                className={cm.cn(
                  cm.sp('p', 3),
                  'bg-secondary text-on-secondary rounded-md font-mono text-xs overflow-x-auto',
                )}
              >
                {s.install_command}
              </pre>
              <pre
                className={cm.cn(
                  cm.sp('p', 3),
                  'bg-secondary text-on-secondary rounded-md font-mono text-xs overflow-x-auto',
                )}
              >
                {s.example}
              </pre>
              <a
                href={s.github_url}
                target="_blank"
                rel="noreferrer"
                className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
              >
                {t('sdks.githubCta', {}, { defaultValue: 'View on GitHub →' })}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
