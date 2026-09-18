import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface Endpoint {
  id: string
  method: Method
  path: string
  summary: string
  resource: string // for grouping
  deprecated: boolean
}

const METHOD_BG: Record<Method, string> = {
  GET: 'var(--color-method-get-bg)',
  POST: 'var(--color-method-post-bg)',
  PUT: 'var(--color-method-put-bg)',
  DELETE: 'var(--color-method-delete-bg)',
  PATCH: 'var(--color-method-patch-bg)',
}

const METHOD_FG: Record<Method, string> = {
  GET: 'var(--color-method-get)',
  POST: 'var(--color-method-post)',
  PUT: 'var(--color-method-put)',
  DELETE: 'var(--color-method-delete)',
  PATCH: 'var(--color-method-patch)',
}

export function Endpoints() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/endpoints')
      .then((res) => {
        if (!cancelled) setEndpoints(unwrapList<Endpoint>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('endpoints.loadError', {}, { defaultValue: 'Failed to load endpoints.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    if (!query.trim()) return endpoints
    const q = query.toLowerCase().trim()
    return endpoints.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q),
    )
  }, [endpoints, query])

  const grouped = useMemo(() => {
    const map = new Map<string, Endpoint[]>()
    for (const e of filtered) {
      const arr = map.get(e.resource) ?? []
      arr.push(e)
      map.set(e.resource, arr)
    }
    return Array.from(map.entries())
  }, [filtered])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary font-mono',
          )}
        >
          {t('endpoints.eyebrow', {}, { defaultValue: 'REST_API' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('endpoints.heading', {}, { defaultValue: 'Endpoints' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'endpoints.subheading',
            {},
            {
              defaultValue:
                'All REST endpoints, grouped by resource. Click a method/path to see the full reference.',
            },
          )}
        </p>
        {!loading && !error && endpoints.length > 0 ? (
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
                'endpoints.totalCount',
                { count: endpoints.length },
                { defaultValue: '{{count}} endpoints' },
              )}
            </span>
            {(() => {
              const deprecated = endpoints.filter((e) => e.deprecated).length
              return deprecated > 0 ? (
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'bg-warning/15 text-warning uppercase tracking-wider font-mono',
                  )}
                >
                  {t(
                    'endpoints.deprecatedCount',
                    { count: deprecated },
                    { defaultValue: '{{count}} deprecated' },
                  )}
                </span>
              ) : null
            })()}
          </div>
        ) : null}
      </header>

      <div className={cm.cn(cm.card(), cm.sp('p', 4))}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'endpoints.searchPlaceholder',
            {},
            { defaultValue: 'Search method, path, or summary…' },
          )}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'w-full border border-outline-variant rounded-md font-mono',
          )}
        />
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('endpoints.empty', {}, { defaultValue: 'No endpoints match.' })}
        </p>
      ) : (
        <div className={cm.cn('space-y-6')}>
          {grouped.map(([resource, items]) => (
            <section key={resource} className={cm.cn(cm.card(), 'overflow-hidden')}>
              <header
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  'bg-surface-container border-b border-outline-variant',
                )}
              >
                <h2
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wide',
                  )}
                >
                  {resource}
                </h2>
              </header>
              <ul className="divide-y divide-outline-variant">
                {items.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/docs/endpoints/${e.id}`}
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        'block hover:bg-surface-container',
                      )}
                    >
                      <div className={cm.flex({ align: 'center', gap: 'md' })}>
                        <span
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            cm.roundedFull,
                            'font-mono uppercase shrink-0 w-16 text-center',
                          )}
                          style={{
                            backgroundColor: METHOD_BG[e.method],
                            color: METHOD_FG[e.method],
                          }}
                        >
                          {e.method}
                        </span>
                        <code
                          className={cm.cn(
                            cm.fontWeight('semibold'),
                            'font-mono',
                            e.deprecated ? 'line-through' : '',
                          )}
                        >
                          {e.path}
                        </code>
                        {e.deprecated ? (
                          <span
                            className={cm.cn(
                              cm.sp('px', 2),
                              cm.textSize('xs'),
                              cm.fontWeight('semibold'),
                              cm.roundedFull,
                              'bg-warning/15 text-warning',
                            )}
                          >
                            {t('endpoints.deprecated', {}, { defaultValue: 'deprecated' })}
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.sp('mt', 1),
                          'text-on-surface-variant',
                          'pl-20',
                        )}
                      >
                        {e.summary}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
