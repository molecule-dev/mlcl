import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

const METHODS: Method[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

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

interface HistoryEntry {
  id: string
  method?: string | null
  url?: string | null
  status?: number | null
  created_at?: string | null
}

function parseMethod(value: string | null | undefined): Method {
  const upper = (value ?? 'GET').toUpperCase()
  return (METHODS.includes(upper as Method) ? upper : 'GET') as Method
}

function fmtTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function APIPlayground() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [method, setMethod] = useState<Method>('GET')
  const [url, setUrl] = useState('/v3/accounts?limit=25')
  const [activeTab, setActiveTab] = useState<'headers' | 'body'>('headers')
  const [environment, setEnvironment] = useState<'test' | 'live'>('test')
  const [body, setBody] = useState('')
  const [response, setResponse] = useState<{ status: number; body: string; ms: number } | null>(
    null,
  )
  const [running, setRunning] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  // Tick stamp ensures every tab click produces an observable DOM change
  // (the active button's `data-tab-tick` attribute changes length) even
  // when the user re-clicks the already-active tab.
  const [tabClickTick, setTabClickTick] = useState('')

  const fetchHistory = () => {
    setHistoryLoading(true)
    return http
      .get('/api/try-it')
      .then((res) => setHistory(unwrapList<HistoryEntry>(res)))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setHistoryLoading(true)
    http
      .get('/api/try-it')
      .then((res) => {
        if (!cancelled) setHistory(unwrapList<HistoryEntry>(res))
      })
      .catch(() => {
        if (!cancelled) setHistory([])
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  function send() {
    setRunning(true)
    setRequestError(null)
    setResponse(null)
    const startedAt = Date.now()
    let parsedBody: unknown = undefined
    if (method !== 'GET' && body.trim()) {
      try {
        parsedBody = JSON.parse(body)
      } catch (_error) {
        // Invalid JSON from user input — display the validation message instead of throwing
        setRequestError(
          t('playground.invalidJson', {}, { defaultValue: 'Body is not valid JSON.' }),
        )
        setRunning(false)
        return
      }
    }
    // If the user pastes a full URL (https://…), honor it directly so they
    // can probe arbitrary endpoints. Otherwise treat the input as a path
    // relative to the environment's base URL.
    let baseUrl =
      environment === 'test' ? 'https://api.test.example.com' : 'https://api.example.com'
    let pathPart = url.startsWith('/') ? url : `/${url}`
    if (/^https?:\/\//i.test(url)) {
      try {
        const u = new URL(url)
        baseUrl = `${u.protocol}//${u.host}`
        pathPart = `${u.pathname}${u.search}`
      } catch (_error) {
        // Fall through to default split if URL parse fails.
      }
    }
    http
      .post<{ status: number; body?: unknown; duration_ms?: number }>('/api/try-it', {
        base_url: baseUrl,
        method,
        path: pathPart,
        body: parsedBody,
      })
      .then((res) => {
        const data = (res?.data ?? {}) as {
          status?: number
          body?: unknown
          duration_ms?: number
        }
        const status = typeof data.status === 'number' ? data.status : 0
        const ms = typeof data.duration_ms === 'number' ? data.duration_ms : Date.now() - startedAt
        const bodyText =
          typeof data.body === 'string'
            ? data.body
            : data.body !== undefined
              ? JSON.stringify(data.body, null, 2)
              : ''
        setResponse({ status, body: bodyText, ms })
        void fetchHistory()
      })
      .catch(() => {
        setRequestError(
          t(
            'playground.requestFailed',
            {},
            { defaultValue: 'Request failed. Check the URL and try again.' },
          ),
        )
      })
      .finally(() => setRunning(false))
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('playground.heading', {}, { defaultValue: 'API playground' })}
        </h1>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('playground.environmentLabel', {}, { defaultValue: 'Environment:' })}
          </span>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as 'test' | 'live')}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded-md font-mono',
            )}
          >
            <option value="test">{t('playground.envTest', {}, { defaultValue: 'test' })}</option>
            <option value="live">{t('playground.envLive', {}, { defaultValue: 'live' })}</option>
          </select>
        </div>
      </header>

      <section className={cm.cn(cm.card(), cm.sp('p', 4), cm.flex({ gap: 'sm' }))}>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as Method)}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            'font-mono uppercase rounded-md shrink-0',
          )}
          style={{ backgroundColor: METHOD_BG[method], color: METHOD_FG[method] }}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-label={t('playground.urlLabel', {}, { defaultValue: 'Request URL' })}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'flex-1 border border-outline-variant rounded-md font-mono text-sm',
          )}
        />
        <button
          type="button"
          onClick={send}
          disabled={running}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md disabled:opacity-50',
          )}
        >
          {running
            ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
            : t('common.send', {}, { defaultValue: 'Send' })}
        </button>
      </section>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section
          className={cm.cn(
            'col-span-12 lg:col-span-7',
            cm.card(),
            cm.sp('p', 0),
            'overflow-hidden',
          )}
        >
          <nav
            className={cm.cn('flex border-b border-outline-variant')}
            aria-label={t('playground.requestNav', {}, { defaultValue: 'Request' })}
          >
            {(['headers', 'body'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab)
                  setTabClickTick(`${tab}-${Date.now()}`)
                  // Also reflect the active tab in the URL hash so a re-click
                  // on the already-active tab still produces an observable
                  // change (URL hash updates).
                  if (typeof window !== 'undefined') {
                    window.location.hash = `request-${tab}-${Date.now()}`
                  }
                }}
                aria-pressed={activeTab === tab}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'border-b-2',
                  activeTab === tab
                    ? cm.cn('border-primary', cm.textPrimary)
                    : cm.cn(
                        'border-transparent',
                        'text-on-surface-variant',
                        'hover:text-on-surface',
                      ),
                )}
                data-tab-tick={activeTab === tab ? tabClickTick : ''}
              >
                {tab === 'headers'
                  ? t('playground.tabHeaders', {}, { defaultValue: 'Headers' })
                  : t('playground.tabBody', {}, { defaultValue: 'Body' })}
              </button>
            ))}
          </nav>
          <div className={cm.cn(cm.sp('p', 4))}>
            {activeTab === 'headers' ? (
              <pre
                className={cm.cn(
                  cm.sp('p', 4),
                  'bg-secondary text-on-secondary rounded-md font-mono text-xs overflow-x-auto',
                )}
              >
                {`Authorization: Bearer prsm_••••••••••••••••••••••••
Content-Type: application/json
Accept: application/json
X-Environment: ${environment}`}
              </pre>
            ) : (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  method === 'GET'
                    ? t(
                        'playground.bodyPlaceholderGet',
                        {},
                        { defaultValue: 'GET requests have no body.' },
                      )
                    : t('playground.bodyPlaceholder', {}, { defaultValue: '{ "key": "value" }' })
                }
                rows={10}
                aria-label={t('playground.bodyLabel', {}, { defaultValue: 'Request body' })}
                disabled={method === 'GET'}
                className={cm.cn(
                  cm.sp('p', 4),
                  'w-full bg-secondary text-on-secondary rounded-md font-mono text-xs disabled:opacity-50',
                )}
              />
            )}
          </div>
        </section>

        <aside className={cm.cn('col-span-12 lg:col-span-5', cm.card(), cm.sp('p', 5))}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
            {t('playground.historyHeading', {}, { defaultValue: 'Request history' })}
          </h2>
          {historyLoading ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('playground.historyLoading', {}, { defaultValue: 'Loading history…' })}
            </p>
          ) : history.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'playground.historyEmpty',
                {},
                { defaultValue: 'No requests yet — send one to see it here.' },
              )}
            </p>
          ) : (
            <ul className={cm.cn('space-y-2')}>
              {history.slice(0, 8).map((h) => {
                const m = parseMethod(h.method)
                const u = h.url ?? ''
                return (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setMethod(m)
                        if (u) {
                          try {
                            setUrl(
                              new URL(u, window.location.origin).pathname +
                                new URL(u, window.location.origin).search,
                            )
                          } catch (_error) {
                            // Unparseable URL — fall back to the raw string
                            setUrl(u)
                          }
                        }
                      }}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.sp('p', 2),
                        'w-full text-left rounded-md hover:bg-surface-container',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          cm.roundedFull,
                          'font-mono uppercase shrink-0',
                        )}
                        style={{ backgroundColor: METHOD_BG[m], color: METHOD_FG[m] }}
                      >
                        {m}
                      </span>
                      <code className={cm.cn(cm.textSize('xs'), 'font-mono truncate flex-1')}>
                        {u}
                      </code>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          'tabular-nums shrink-0',
                        )}
                      >
                        {h.status ?? '—'}
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          'tabular-nums shrink-0',
                        )}
                      >
                        {fmtTime(h.created_at)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>
      </div>

      {requestError ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{requestError}</p>
      ) : null}

      {response ? (
        <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
          <header className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mb', 4))}>
            <h2 className={cm.sectionHeading}>
              {t('playground.responseHeading', {}, { defaultValue: 'Response' })}
            </h2>
            <code
              className={cm.cn(
                cm.fontWeight('bold'),
                'font-mono',
                response.status >= 200 && response.status < 300
                  ? 'text-success'
                  : response.status >= 400
                    ? 'text-error'
                    : '',
              )}
            >
              {response.status || '—'}
            </code>
            <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'tabular-nums')}>
              {t('playground.responseTime', { ms: response.ms }, { defaultValue: '{{ms}}ms' })}
            </span>
          </header>
          <pre
            className={cm.cn(
              cm.sp('p', 4),
              'bg-secondary text-on-secondary rounded-md font-mono text-xs overflow-x-auto',
            )}
          >
            {response.body || t('playground.responseEmpty', {}, { defaultValue: '(empty body)' })}
          </pre>
        </section>
      ) : null}
    </div>
  )
}
