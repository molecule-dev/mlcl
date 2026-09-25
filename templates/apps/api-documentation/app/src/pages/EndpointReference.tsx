import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { unwrapSingle } from '../lib/unwrap.js'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface Parameter {
  name: string
  location: 'path' | 'query' | 'header' | 'body'
  type: string
  required: boolean
  description: string
}

interface ResponseExample {
  status: number
  description: string
  body: string
}

interface CodeSample {
  language: 'curl' | 'node' | 'python' | 'go' | 'ruby' | 'php'
  code: string
}

interface EndpointDetail {
  id: string
  method: Method
  path: string
  summary: string
  description: string
  parameters: Parameter[]
  responses: ResponseExample[]
  samples: CodeSample[]
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

const STATUS_COLOR: Record<number, string> = {
  200: 'text-success',
  201: 'text-success',
  204: 'text-success',
  400: 'text-warning',
  401: 'text-warning',
  404: 'text-warning',
  500: 'text-error',
}

export function EndpointReference() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [endpoint, setEndpoint] = useState<EndpointDetail | null>(null)
  const [activeSample, setActiveSample] = useState<CodeSample['language']>('curl')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setNotFound(false)
    http
      .get(`/api/endpoints/${id}`)
      .then((res) => {
        if (!cancelled) setEndpoint(unwrapSingle<EndpointDetail>(res))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        // A 404 means the id is bogus (or someone else's) — say so instead
        // of the generic "failed to load"; anything else offers a retry.
        const status = err instanceof Error && 'status' in err ? Number(err.status) : NaN
        if (status === 404) {
          setNotFound(true)
        } else {
          setError(
            t('endpointReference.loadError', {}, { defaultValue: 'Failed to load endpoint.' }),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, retryTick, t])

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error)
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
        <Link
          to="/docs/endpoints"
          className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
        >
          ← {t('endpointReference.back', {}, { defaultValue: 'All endpoints' })}
        </Link>
        <LoadErrorBanner
          message={error}
          onRetry={() => {
            setRetryTick((v) => v + 1)
          }}
          retryLabel={t('common.retry', {}, { defaultValue: 'Retry' })}
        />
      </div>
    )
  if (notFound || !endpoint)
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
        <Link
          to="/docs/endpoints"
          className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
        >
          ← {t('endpointReference.back', {}, { defaultValue: 'All endpoints' })}
        </Link>
        <div
          role="alert"
          className={cm.cn(cm.card(), cm.sp('p', 8), cm.stack(4), 'items-center text-center')}
        >
          <span
            className={cm.cn(
              cm.textSize('3xl'),
              'material-symbols-outlined text-on-surface-variant',
            )}
            aria-hidden="true"
          >
            search_off
          </span>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
            )}
          >
            {t('endpointReference.notFound', {}, { defaultValue: 'Endpoint not found.' })}
          </p>
        </div>
      </div>
    )

  const sample = endpoint.samples.find((s) => s.language === activeSample) ?? endpoint.samples[0]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <Link
        to="/docs/endpoints"
        className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
      >
        ← {t('endpointReference.back', {}, { defaultValue: 'All endpoints' })}
      </Link>

      <header className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'font-mono uppercase shrink-0',
            )}
            style={{
              backgroundColor: METHOD_BG[endpoint.method],
              color: METHOD_FG[endpoint.method],
            }}
          >
            {endpoint.method}
          </span>
          <code
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'font-mono min-w-0 [overflow-wrap:anywhere]',
            )}
          >
            {endpoint.path}
          </code>
        </div>
        <h1 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 4))}>
          {endpoint.summary}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {endpoint.description}
        </p>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-7 space-y-6')}>
          <div className={cm.cn(cm.card(), cm.sp('p', 6))}>
            <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
              {t('endpointReference.parametersHeading', {}, { defaultValue: 'Parameters' })}
            </h2>
            {/* 4 columns don't fit a 390px phone — scroll horizontally rather
                than crush the cells. */}
            <div className="-mx-2 px-2 overflow-x-auto">
              <table className={cm.cn('w-full min-w-[420px]')}>
                <thead
                  className={cm.cn(
                    cm.textSize('xs'),
                    'uppercase tracking-wide',
                    'text-on-surface-variant',
                  )}
                >
                  <tr>
                    <th className={cm.cn(cm.sp('py', 2), 'text-left')}>
                      {t('endpointReference.col.name', {}, { defaultValue: 'Name' })}
                    </th>
                    <th className={cm.cn(cm.sp('py', 2), 'text-left')}>
                      {t('endpointReference.col.in', {}, { defaultValue: 'In' })}
                    </th>
                    <th className={cm.cn(cm.sp('py', 2), 'text-left')}>
                      {t('endpointReference.col.type', {}, { defaultValue: 'Type' })}
                    </th>
                    <th className={cm.cn(cm.sp('py', 2), 'text-left')}>
                      {t('endpointReference.col.required', {}, { defaultValue: 'Required' })}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {endpoint.parameters.map((p) => (
                    <tr key={`${p.location}-${p.name}`}>
                      <td className={cm.cn(cm.sp('py', 3), 'font-mono', cm.fontWeight('semibold'))}>
                        {p.name}
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.sp('mt', 1),
                            'text-on-surface-variant',
                            'font-sans',
                          )}
                        >
                          {p.description}
                        </p>
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('py', 3),
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          'uppercase',
                        )}
                      >
                        {p.location}
                      </td>
                      <td className={cm.cn(cm.sp('py', 3), 'font-mono text-sm')}>{p.type}</td>
                      <td
                        className={cm.cn(
                          cm.sp('py', 3),
                          cm.textSize('sm'),
                          p.required
                            ? cm.cn('text-error', cm.fontWeight('semibold'))
                            : 'text-on-surface-variant',
                        )}
                      >
                        {p.required
                          ? t('endpointReference.requiredYes', {}, { defaultValue: 'yes' })
                          : t('endpointReference.requiredNo', {}, { defaultValue: 'no' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={cm.cn(cm.card(), cm.sp('p', 6))}>
            <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
              {t('endpointReference.responsesHeading', {}, { defaultValue: 'Responses' })}
            </h2>
            <ul className={cm.cn('space-y-4')}>
              {endpoint.responses.map((r) => (
                <li key={r.status}>
                  <header
                    className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 2))}
                  >
                    <code
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'font-mono',
                        STATUS_COLOR[r.status] ?? '',
                      )}
                    >
                      {r.status}
                    </code>
                    <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {r.description}
                    </span>
                  </header>
                  <pre
                    className={cm.cn(
                      cm.sp('p', 4),
                      'bg-secondary text-on-secondary rounded-md font-mono text-xs [overflow-wrap:anywhere] whitespace-pre-wrap',
                    )}
                  >
                    {r.body}
                  </pre>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside
          className={cm.cn('col-span-12 lg:col-span-5', cm.card(), cm.sp('p', 6), 'sticky top-24')}
        >
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
            {t('endpointReference.codeSamples', {}, { defaultValue: 'Code samples' })}
          </h2>
          <div className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('mb', 3), 'flex-wrap')}>
            {endpoint.samples.map((s) => (
              <button
                key={s.language}
                type="button"
                onClick={() => setActiveSample(s.language)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.roundedFull,
                  'font-mono uppercase',
                  activeSample === s.language
                    ? cm.cn('bg-primary text-on-primary')
                    : cm.cn(
                        'bg-surface-container',
                        'text-on-surface-variant',
                        'hover:bg-surface-container-high',
                      ),
                )}
              >
                {s.language}
              </button>
            ))}
          </div>
          <pre
            className={cm.cn(
              cm.sp('p', 4),
              'bg-secondary text-on-secondary rounded-md font-mono text-xs [overflow-wrap:anywhere] whitespace-pre-wrap',
            )}
          >
            {sample?.code ?? ''}
          </pre>
        </aside>
      </div>
    </div>
  )
}
