import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SURFACE_PANEL } from '../branding.js'
import { type HttpMethod, MethodBadge } from '../components/MethodBadge.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { statusFromCode, StatusPill } from '../components/StatusPill.js'

const PANEL_BORDER = 'var(--color-border)'

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

interface SavedRequest {
  id: string
  name?: string
  method?: string
  url?: string
  headers?: string | Record<string, string>
  query_params?: string | Record<string, string>
  body_type?: string
  body_content?: string
  auth_type?: string
  auth_config?: string | Record<string, unknown>
  collection_id?: string | null
}

interface EnvironmentRow {
  id: string
  name?: string
  is_active?: boolean
}

interface ExecuteResponse {
  status?: number
  body?: unknown
  headers?: Record<string, string>
  duration_ms?: number
  error?: string
}

interface AssertionResult {
  defaultLabel: string
  passed: boolean
}

function buildAssertions(resp: ExecuteResponse): AssertionResult[] {
  const status = resp.status ?? 0
  const duration = resp.duration_ms ?? 0
  const sizeBytes =
    typeof resp.body === 'string'
      ? resp.body.length
      : resp.body
        ? JSON.stringify(resp.body).length
        : 0
  return [
    { defaultLabel: 'Response received', passed: status > 0 },
    { defaultLabel: 'Status code is 2xx', passed: status >= 200 && status < 300 },
    { defaultLabel: 'Response time is below 1000 ms', passed: duration > 0 && duration < 1000 },
    { defaultLabel: 'Body is non-empty', passed: sizeBytes > 0 },
    { defaultLabel: 'No transport error', passed: !resp.error },
  ]
}

function formatBody(body: unknown): string {
  if (body == null) return ''
  if (typeof body === 'string') {
    try {
      return JSON.stringify(JSON.parse(body), null, 2)
    } catch (_error) {
      // body is not JSON — display it as-is
      return body
    }
  }
  try {
    return JSON.stringify(body, null, 2)
  } catch (_error) {
    // non-serialisable body (circular ref, etc.) — fall back to string coercion
    return String(body)
  }
}

/** One editable key/value row (params + headers editors). */
interface KVRow {
  id: number
  key: string
  value: string
  enabled: boolean
}

let kvRowSeq = 1
function emptyRow(): KVRow {
  return { id: kvRowSeq++, key: '', value: '', enabled: true }
}

/** Parse the API's JSON-string (or object) columns into editable rows. */
function rowsFromSaved(raw: unknown): KVRow[] {
  let obj: Record<string, unknown> = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    obj = raw as Record<string, unknown>
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        obj = parsed as Record<string, unknown>
      }
    } catch (_error) {
      // malformed JSON column — fall back to an empty editor
    }
  }
  const rows = Object.entries(obj).map(([key, value]) => ({
    id: kvRowSeq++,
    key,
    value: typeof value === 'string' ? value : String(value ?? ''),
    enabled: true,
  }))
  return rows.length > 0 ? [...rows, emptyRow()] : [emptyRow()]
}

/** Collapse editable rows into the API's record shape (enabled + named only). */
function collectRows(rows: KVRow[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of rows) {
    if (row.enabled && row.key.trim()) out[row.key.trim()] = row.value
  }
  return out
}

function parseAuthConfig(raw: unknown): Record<string, string> {
  let obj: Record<string, unknown> = {}
  if (raw && typeof raw === 'object') obj = raw as Record<string, unknown>
  else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') obj = parsed as Record<string, unknown>
    } catch (_error) {
      // malformed auth_config JSON — treat as empty
    }
  }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) out[k] = typeof v === 'string' ? v : String(v ?? '')
  return out
}

type AuthType = 'none' | 'basic' | 'bearer' | 'oauth' | 'apikey'

const AUTH_TYPES: AuthType[] = ['none', 'basic', 'bearer', 'oauth', 'apikey']

type BodyType = 'none' | 'json' | 'text'

type RequestTab = 'params' | 'auth' | 'headers' | 'body' | 'tests'

const VALID_TABS: RequestTab[] = ['params', 'auth', 'headers', 'body', 'tests']

function tabFromHash(hash: string): RequestTab {
  const candidate = hash.replace(/^#/, '') as RequestTab
  return VALID_TABS.includes(candidate) ? candidate : 'auth'
}

/** Inline key/value row editor shared by the Params and Headers tabs. */
function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  keyLabel,
  valueLabel,
  removeLabel,
  addLabel,
}: {
  rows: KVRow[]
  onChange: (rows: KVRow[]) => void
  keyPlaceholder: string
  valuePlaceholder: string
  keyLabel: string
  valueLabel: string
  removeLabel: string
  addLabel: string
}) {
  const cm = getClassMap()
  const update = (id: number, patch: Partial<KVRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  return (
    <div className={cm.cn('flex flex-col gap-2')} data-mol-id="kv-editor">
      {/* Visually-hidden column headers keep the inputs labelled for screen readers. */}
      <div className={cm.cn('sr-only')}>
        <span>{keyLabel}</span>
        <span>{valueLabel}</span>
      </div>
      {rows.map((row) => (
        <div key={row.id} className={cm.cn('flex items-center gap-2')}>
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => update(row.id, { enabled: e.target.checked })}
            aria-label={`${keyLabel}: ${row.key || keyPlaceholder} — enabled`}
            className={cm.cn('h-4 w-4 shrink-0 accent-current')}
            style={{ accentColor: 'var(--color-primary)' }}
          />
          <input
            type="text"
            value={row.key}
            onChange={(e) => update(row.id, { key: e.target.value })}
            placeholder={keyPlaceholder}
            aria-label={keyLabel}
            className={cm.cn('min-w-0 flex-1 px-2 py-2 rounded-md font-mono text-xs outline-none')}
            style={{
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              border: `1px solid ${PANEL_BORDER}`,
            }}
          />
          <input
            type="text"
            value={row.value}
            onChange={(e) => update(row.id, { value: e.target.value })}
            placeholder={valuePlaceholder}
            aria-label={valueLabel}
            className={cm.cn(
              'min-w-0 flex-[1.4] px-2 py-2 rounded-md font-mono text-xs outline-none',
            )}
            style={{
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              border: `1px solid ${PANEL_BORDER}`,
            }}
          />
          <button
            type="button"
            onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
            aria-label={removeLabel}
            className={cm.cn(
              'shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors hover:opacity-80',
            )}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              delete
            </span>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, emptyRow()])}
        className={cm.cn(
          'self-start inline-flex items-center gap-1 px-3 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest transition-colors hover:opacity-80',
        )}
        style={{ color: 'var(--color-primary)' }}
      >
        <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
          add
        </span>
        {addLabel}
      </button>
    </div>
  )
}

export function Workspace() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [url, setUrl] = useState<string>('')
  const activeRequestTab = tabFromHash(location.hash)
  const setActiveRequestTab = (tab: RequestTab) => {
    navigate(`${location.pathname}#${tab}`, { replace: false })
  }
  const [saved, setSaved] = useState<SavedRequest[] | null>(null)
  const [activeEnv, setActiveEnv] = useState<EnvironmentRow | null>(null)
  const [response, setResponse] = useState<ExecuteResponse | null>(null)
  const [busy, setBusy] = useState<'send' | 'save' | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [statusTone, setStatusTone] = useState<'ok' | 'error'>('ok')

  // Builder state — hydrated from the first saved request, persisted on save/send.
  const [paramRows, setParamRows] = useState<KVRow[]>([emptyRow()])
  const [headerRows, setHeaderRows] = useState<KVRow[]>([emptyRow()])
  const [bodyType, setBodyType] = useState<BodyType>('none')
  const [bodyContent, setBodyContent] = useState('')
  const [authType, setAuthType] = useState<AuthType>('bearer')
  const [authToken, setAuthToken] = useState('')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authKeyName, setAuthKeyName] = useState('')
  const [authKeyValue, setAuthKeyValue] = useState('')
  const hydratedRef = useRef(false)

  const buildAuthConfig = (): Record<string, string> => {
    if (authType === 'basic') {
      return { username: authUsername, password: authPassword }
    }
    if (authType === 'apikey') {
      return { key: authKeyName, value: authKeyValue }
    }
    if (authType === 'bearer' || authType === 'oauth') {
      return { token: authToken }
    }
    return {}
  }

  // Load existing saved requests + active environment, then hydrate the builder.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<SavedRequest[]>('/api/requests').catch(() => ({ data: [] as SavedRequest[] })),
      http
        .get<EnvironmentRow[]>('/api/environments')
        .catch(() => ({ data: [] as EnvironmentRow[] })),
    ]).then(([rs, es]) => {
      if (cancelled) return
      const rows = Array.isArray(rs.data) ? rs.data : []
      const envs = Array.isArray(es.data) ? es.data : []
      setSaved(rows)
      const active = envs.find((e) => e.is_active) ?? envs[0] ?? null
      setActiveEnv(active)
      const first = rows[0]
      if (first && !hydratedRef.current) {
        hydratedRef.current = true
        setMethod((first.method as HttpMethod) ?? 'GET')
        setUrl(first.url ?? '')
        setParamRows(rowsFromSaved(first.query_params))
        setHeaderRows(rowsFromSaved(first.headers))
        setBodyType(
          first.body_type === 'json' || first.body_type === 'text' ? first.body_type : 'none',
        )
        setBodyContent(typeof first.body_content === 'string' ? first.body_content : '')
        const type = String(first.auth_type ?? 'none').toLowerCase() as AuthType
        if (AUTH_TYPES.includes(type)) setAuthType(type)
        const cfg = parseAuthConfig(first.auth_config)
        setAuthToken(cfg.token ?? cfg.accessToken ?? '')
        setAuthUsername(cfg.username ?? '')
        setAuthPassword(cfg.password ?? '')
        setAuthKeyName(cfg.key ?? cfg.headerName ?? '')
        setAuthKeyValue(cfg.value ?? '')
      }
    })
    return () => {
      cancelled = true
    }
  }, [http])

  /** The full builder payload the API persists. */
  const builderPayload = () => ({
    method,
    url,
    headers: collectRows(headerRows),
    query_params: collectRows(paramRows),
    body_type: bodyType,
    body_content: bodyType === 'none' ? '' : bodyContent,
    auth_type: authType,
    auth_config: buildAuthConfig(),
  })

  const handleSend = async () => {
    if (busy) return
    setBusy('send')
    setStatusMsg(null)
    try {
      // Persist the request (or reuse the first saved) so we can use the
      // existing /api/requests/:id/execute endpoint.
      let target: SavedRequest | null = saved?.[0] ?? null
      if (!target) {
        const created = await http.post<SavedRequest>('/api/requests', {
          name: t('workspace.unnamed', {}, { defaultValue: 'Untitled request' }),
          ...builderPayload(),
        })
        target = created.data
        setSaved([target, ...(saved ?? [])])
        void track({ name: 'request.created', properties: { request_id: target.id, method } })
      } else {
        await http.put<SavedRequest>(`/api/requests/${target.id}`, builderPayload())
      }
      const exec = await http.post<ExecuteResponse>(`/api/requests/${target.id}/execute`, {})
      setResponse(exec.data)
      void track({
        name: 'request.sent',
        properties: {
          request_id: target.id,
          method,
          status: exec.data?.status ?? 0,
          duration_ms: exec.data?.duration_ms ?? 0,
        },
      })
      setStatusTone('ok')
      setStatusMsg(
        t('workspace.statusSent', {}, { defaultValue: 'Request fired — see response below.' }),
      )
    } catch (err) {
      setStatusTone('error')
      setStatusMsg(
        err instanceof Error
          ? err.message
          : t('workspace.statusError', {}, { defaultValue: 'Could not send the request.' }),
      )
    } finally {
      setBusy(null)
    }
  }

  const handleSave = async () => {
    if (busy) return
    setBusy('save')
    setStatusMsg(null)
    try {
      const target = saved?.[0]
      if (target) {
        await http.put<SavedRequest>(`/api/requests/${target.id}`, builderPayload())
        setStatusTone('ok')
        setStatusMsg(
          t('workspace.statusSaved', {}, { defaultValue: 'Request saved to this workspace.' }),
        )
      } else {
        const created = await http.post<SavedRequest>('/api/requests', {
          name: t('workspace.unnamed', {}, { defaultValue: 'Untitled request' }),
          ...builderPayload(),
        })
        setSaved([created.data, ...(saved ?? [])])
        void track({
          name: 'request.created',
          properties: { request_id: created.data?.id, method },
        })
        setStatusTone('ok')
        setStatusMsg(
          t('workspace.statusSaved', {}, { defaultValue: 'Request saved to this workspace.' }),
        )
      }
    } catch (err) {
      setStatusTone('error')
      setStatusMsg(
        err instanceof Error
          ? err.message
          : t('workspace.saveError', {}, { defaultValue: 'Could not save the request.' }),
      )
    } finally {
      setBusy(null)
    }
  }

  const enabledParams = paramRows.filter((r) => r.enabled && r.key.trim()).length
  const enabledHeaders = headerRows.filter((r) => r.enabled && r.key.trim()).length

  const requestTabs = [
    { key: 'params', defaultLabel: 'Params', badge: String(enabledParams) },
    { key: 'auth', defaultLabel: 'Auth', badge: authType === 'none' ? '0' : '1' },
    { key: 'headers', defaultLabel: 'Headers', badge: String(enabledHeaders) },
    { key: 'body', defaultLabel: 'Body', badge: bodyType === 'none' ? '–' : '1' },
    { key: 'tests', defaultLabel: 'Tests', badge: '5' },
  ] as const

  const assertions = response ? buildAssertions(response) : []
  const passed = assertions.filter((a) => a.passed).length
  const failed = assertions.length - passed
  const responseSize = response?.body
    ? typeof response.body === 'string'
      ? response.body.length
      : JSON.stringify(response.body).length
    : 0
  const responseHeaders = response?.headers ?? {}
  const responseHeaderEntries = Object.entries(responseHeaders)

  const editorInputStyle = {
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text-primary)',
    border: `1px solid ${PANEL_BORDER}`,
  }

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, cm.minH('screen'), 'p-4 md:p-6')}
    >
      <header className={cm.cn('flex items-start justify-between gap-4 flex-wrap mb-6')}>
        <div className={cm.cn('min-w-0')}>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('workspace.eyebrow', {}, { defaultValue: '$ pylon workspace --pane split' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'workspace.subheading',
              {},
              {
                defaultValue:
                  'Compose a request, fire it, then assert the response — all in one pane.',
              },
            )}
          </p>
        </div>
        <div className={cm.cn('flex items-center gap-2')}>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy !== null || !url}
            className={cm.cn(
              'px-3 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border transition-colors hover:opacity-80 disabled:opacity-50',
            )}
            style={{
              borderColor: 'color-mix(in srgb, var(--color-text) 18%, transparent)',
              color: 'var(--color-text-primary)',
              backgroundColor: 'color-mix(in srgb, var(--color-surface-elevated) 60%, transparent)',
            }}
            data-mol-id="workspace-save"
          >
            {busy === 'save'
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.save', {}, { defaultValue: 'Save' })}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={busy !== null || !url}
            className={cm.cn(
              'px-4 py-2 rounded-md font-mono text-xs font-extrabold uppercase tracking-widest transition-all hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-50',
            )}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
              boxShadow:
                '0 8px 22px -10px color-mix(in srgb, var(--color-primary) 60%, transparent)',
            }}
            data-mol-id="workspace-send"
          >
            {busy === 'send'
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('common.send', {}, { defaultValue: 'Send' })}
            <span
              className={cm.cn('px-1 rounded text-[10px] font-mono hidden sm:inline')}
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-text) 25%, transparent)' }}
            >
              ⌘↵
            </span>
          </button>
        </div>
      </header>

      {statusMsg ? (
        <div
          className={cm.cn('mb-4 px-4 py-2 rounded-md font-mono text-xs')}
          style={
            statusTone === 'error'
              ? {
                  backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
                  color: 'var(--color-error)',
                }
              : {
                  backgroundColor: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)',
                  color: 'var(--color-success)',
                }
          }
          role="status"
          data-mol-id="workspace-status-message"
        >
          {statusMsg}
        </div>
      ) : null}

      {/* Top stats */}
      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-6')}>
        <MetricStatCard
          eyebrow={t('nav.status', {}, { defaultValue: 'Status' })}
          value={response?.status ? String(response.status) : '—'}
          unit={response?.status ? (statusFromCode(response.status) === 'success' ? 'OK' : '') : ''}
          tone={
            response?.status
              ? statusFromCode(response.status) === 'success'
                ? 'success'
                : statusFromCode(response.status) === 'serverError'
                  ? 'error'
                  : 'warning'
              : 'neutral'
          }
          icon="check_circle"
          caption={t('workspace.metric.statusCaption', {}, { defaultValue: 'Last response' })}
        />
        <MetricStatCard
          eyebrow={t('workspace.metric.latency', {}, { defaultValue: 'Latency' })}
          value={response?.duration_ms ? String(response.duration_ms) : '—'}
          unit="ms"
          tone={
            response?.duration_ms
              ? response.duration_ms < 200
                ? 'success'
                : response.duration_ms < 1000
                  ? 'warning'
                  : 'error'
              : 'neutral'
          }
          icon="speed"
          caption={t(
            'workspace.metric.latencyCaption',
            {},
            { defaultValue: 'Round-trip from this run' },
          )}
        />
        <MetricStatCard
          eyebrow={t('workspace.metric.size', {}, { defaultValue: 'Payload' })}
          value={
            responseSize
              ? responseSize >= 1024
                ? (responseSize / 1024).toFixed(1)
                : String(responseSize)
              : '—'
          }
          unit={responseSize ? (responseSize >= 1024 ? 'KB' : 'B') : ''}
          tone={response ? 'info' : 'neutral'}
          icon="data_object"
          caption={t('workspace.metric.sizeCaption', {}, { defaultValue: 'Response body bytes' })}
        />
        <MetricStatCard
          eyebrow={t('workspace.metric.tests', {}, { defaultValue: 'Tests' })}
          value={response ? `${passed}` : '—'}
          unit={response ? `/ ${assertions.length}` : ''}
          tone={response ? (failed > 0 ? 'warning' : 'success') : 'neutral'}
          icon="bug_report"
          caption={
            response
              ? failed > 0
                ? t(
                    'workspace.metric.testsFailing',
                    { count: failed },
                    { defaultValue: '{{count}} failing' },
                  )
                : t(
                    'workspace.metric.testsAllPassing',
                    {},
                    { defaultValue: 'All assertions green' },
                  )
              : t('workspace.metric.testsIdle', {}, { defaultValue: 'Send a request to evaluate' })
          }
        />
      </section>

      {/* URL bar */}
      <div
        className={cm.cn('rounded-xl p-3 mb-6 flex items-center gap-2 font-mono')}
        style={{ backgroundColor: SURFACE_PANEL, border: `1px solid ${PANEL_BORDER}` }}
      >
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as HttpMethod)}
          className={cm.cn(
            'bg-transparent border-none outline-none font-extrabold text-sm pr-2 cursor-pointer shrink-0',
          )}
          style={{ color: 'var(--color-text-primary)' }}
          aria-label={t('workspace.methodLabel', {}, { defaultValue: 'HTTP method' })}
          data-mol-id="workspace-method"
        >
          {METHODS.map((m) => (
            <option key={m} value={m} style={{ backgroundColor: 'var(--color-background)' }}>
              {m}
            </option>
          ))}
        </select>
        <span className={cm.cn('shrink-0')} style={{ color: 'var(--color-surface)' }}>
          |
        </span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t(
            'workspace.urlPlaceholder',
            {},
            { defaultValue: 'https://api.example.com/v1/resource' },
          )}
          className={cm.cn('flex-1 min-w-0 bg-transparent border-none outline-none text-sm')}
          style={{ color: 'var(--color-text-primary)' }}
          aria-label={t('workspace.urlLabel', {}, { defaultValue: 'Request URL' })}
          data-mol-id="workspace-url"
        />
        <span
          className={cm.cn(
            'font-mono text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded shrink-0 truncate max-w-24 hidden sm:inline-block',
          )}
          title={activeEnv?.name}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-method-patch) 18%, transparent)',
            color: 'var(--color-method-patch)',
          }}
        >
          {activeEnv?.name ?? t('workspace.environment', {}, { defaultValue: 'No env' })}
        </span>
      </div>

      <div className={cm.cn('grid gap-6 grid-cols-1 lg:grid-cols-2')}>
        {/* Request panel */}
        <section
          className={cm.cn('rounded-2xl overflow-hidden flex flex-col')}
          style={{ backgroundColor: SURFACE_PANEL, border: `1px solid ${PANEL_BORDER}` }}
        >
          <header
            className={cm.cn('flex items-center gap-1 px-2 border-b overflow-x-auto')}
            style={{
              borderColor: PANEL_BORDER,
              backgroundColor: 'color-mix(in srgb, var(--color-background) 40%, transparent)',
            }}
          >
            {requestTabs.map((tab) => {
              const active = activeRequestTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveRequestTab(tab.key)}
                  className={cm.cn(
                    'px-3 py-3 font-mono text-[11px] font-extrabold uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap shrink-0',
                  )}
                  style={{
                    color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    borderColor: active ? 'var(--color-primary)' : 'transparent',
                  }}
                  data-mol-id={`workspace-tab-${tab.key}`}
                >
                  {t(`workspace.tab.${tab.key}`, {}, { defaultValue: tab.defaultLabel })}
                  <span
                    className={cm.cn('ml-2 px-1.5 py-0.5 rounded text-[10px]')}
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--color-surface-elevated) 80%, transparent)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {tab.badge}
                  </span>
                </button>
              )
            })}
          </header>
          <div className={cm.cn('p-4 md:p-5 flex-1')}>
            {activeRequestTab === 'params' ? (
              <KeyValueEditor
                rows={paramRows}
                onChange={setParamRows}
                keyPlaceholder={t('workspace.kv.key', {}, { defaultValue: 'Key' })}
                valuePlaceholder={t('workspace.kv.value', {}, { defaultValue: 'Value' })}
                keyLabel={t('workspace.kv.paramKey', {}, { defaultValue: 'Query param key' })}
                valueLabel={t('workspace.kv.paramValue', {}, { defaultValue: 'Query param value' })}
                removeLabel={t('workspace.kv.removeRow', {}, { defaultValue: 'Remove row' })}
                addLabel={t('workspace.kv.addParam', {}, { defaultValue: 'Add param' })}
              />
            ) : activeRequestTab === 'headers' ? (
              <KeyValueEditor
                rows={headerRows}
                onChange={setHeaderRows}
                keyPlaceholder={t('workspace.kv.key', {}, { defaultValue: 'Key' })}
                valuePlaceholder={t('workspace.kv.value', {}, { defaultValue: 'Value' })}
                keyLabel={t('workspace.kv.headerKey', {}, { defaultValue: 'Header name' })}
                valueLabel={t('workspace.kv.headerValue', {}, { defaultValue: 'Header value' })}
                removeLabel={t('workspace.kv.removeRow', {}, { defaultValue: 'Remove row' })}
                addLabel={t('workspace.kv.addHeader', {}, { defaultValue: 'Add header' })}
              />
            ) : activeRequestTab === 'body' ? (
              <div className={cm.cn('flex flex-col gap-3')}>
                <div className={cm.cn('flex items-center gap-3')}>
                  <label
                    className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                    style={{ color: 'var(--color-text-secondary)' }}
                    htmlFor="workspace-body-type"
                  >
                    {t('workspace.body.type', {}, { defaultValue: 'Type' })}
                  </label>
                  <select
                    id="workspace-body-type"
                    value={bodyType}
                    onChange={(e) => setBodyType(e.target.value as BodyType)}
                    className={cm.cn('px-3 py-2 rounded-md font-mono text-xs')}
                    style={editorInputStyle}
                  >
                    <option value="none">
                      {t('workspace.body.none', {}, { defaultValue: 'None' })}
                    </option>
                    <option value="json">
                      {t('workspace.body.json', {}, { defaultValue: 'JSON' })}
                    </option>
                    <option value="text">
                      {t('workspace.body.text', {}, { defaultValue: 'Raw text' })}
                    </option>
                  </select>
                </div>
                {bodyType !== 'none' ? (
                  <textarea
                    value={bodyContent}
                    onChange={(e) => setBodyContent(e.target.value)}
                    rows={8}
                    spellCheck={false}
                    placeholder={
                      bodyType === 'json' ? '{\n  "key": "{{value}}"\n}' : 'raw payload…'
                    }
                    aria-label={t(
                      'workspace.body.contentLabel',
                      {},
                      { defaultValue: 'Request body' },
                    )}
                    data-mol-id="workspace-body-content"
                    className={cm.cn(
                      'w-full px-3 py-2 rounded-md font-mono text-xs outline-none resize-y min-h-32',
                    )}
                    style={editorInputStyle}
                  />
                ) : (
                  <p className={cm.cn('text-[11px]')} style={{ color: 'var(--color-text-muted)' }}>
                    {t(
                      'workspace.body.noneHint',
                      {},
                      {
                        defaultValue:
                          'No request body will be sent. Pick JSON or raw text to add one.',
                      },
                    )}
                  </p>
                )}
                <p
                  className={cm.cn('text-[11px]')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t(
                    'workspace.body.hint',
                    {},
                    {
                      defaultValue:
                        '{{envVars}} are substituted before the request fires. Bodies are sent on POST/PUT/PATCH/DELETE.',
                    },
                  )}
                </p>
              </div>
            ) : activeRequestTab === 'tests' ? (
              <div
                className={cm.cn('rounded-md p-4 text-center')}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                  border: `1px solid ${PANEL_BORDER}`,
                }}
              >
                <span
                  className={cm.cn(
                    'material-symbols-outlined text-3xl opacity-40 mb-2 inline-block',
                  )}
                  aria-hidden="true"
                >
                  checklist
                </span>
                <p className={cm.cn('text-sm mb-1')} style={{ color: 'var(--color-text-primary)' }}>
                  {t(
                    'workspace.tests.autoTitle',
                    {},
                    { defaultValue: 'Built-in assertions run on every response' },
                  )}
                </p>
                <p
                  className={cm.cn('text-[11px]')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t(
                    'workspace.tests.autoHint',
                    {},
                    {
                      defaultValue:
                        'Status family, latency, body size, and transport health are asserted automatically — results appear under “Test results” in the response panel.',
                    },
                  )}
                </p>
              </div>
            ) : (
              /* auth (default tab) */
              <div className={cm.cn('flex flex-col gap-4')}>
                <div className={cm.cn('flex items-center gap-3')}>
                  <span
                    className={cm.cn('text-[10px] font-black uppercase tracking-widest font-mono')}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {t('workspace.authType', {}, { defaultValue: 'Type' })}
                  </span>
                  <select
                    value={authType}
                    onChange={(e) => setAuthType(e.target.value as AuthType)}
                    className={cm.cn('px-3 py-2 rounded-md font-mono text-xs')}
                    style={editorInputStyle}
                    aria-label={t('workspace.authTypeLabel', {}, { defaultValue: 'Auth type' })}
                    data-mol-id="workspace-auth-type"
                  >
                    <option value="none">
                      {t('workspace.authOption.none', {}, { defaultValue: 'None' })}
                    </option>
                    <option value="basic">
                      {t('workspace.authOption.basic', {}, { defaultValue: 'Basic Auth' })}
                    </option>
                    <option value="bearer">
                      {t('workspace.authOption.bearer', {}, { defaultValue: 'Bearer Token' })}
                    </option>
                    <option value="oauth">
                      {t('workspace.authOption.oauth', {}, { defaultValue: 'OAuth 2.0' })}
                    </option>
                    <option value="apikey">
                      {t('workspace.authOption.apikey', {}, { defaultValue: 'API Key' })}
                    </option>
                  </select>
                </div>
                <div
                  className={cm.cn('rounded-md p-4')}
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                    border: `1px solid ${PANEL_BORDER}`,
                  }}
                >
                  {authType === 'basic' ? (
                    <div className={cm.cn('flex flex-col gap-3')}>
                      <div className={cm.cn('flex flex-col gap-1')}>
                        <label
                          className={cm.cn(
                            'font-mono text-[10px] font-black uppercase tracking-widest',
                          )}
                          style={{ color: 'var(--color-text-secondary)' }}
                          htmlFor="workspace-auth-username"
                        >
                          {t('workspace.auth.username', {}, { defaultValue: 'Username' })}
                        </label>
                        <input
                          id="workspace-auth-username"
                          type="text"
                          value={authUsername}
                          onChange={(e) => setAuthUsername(e.target.value)}
                          autoComplete="off"
                          className={cm.cn(
                            'w-full px-3 py-2 rounded-md font-mono text-sm outline-none',
                          )}
                          style={editorInputStyle}
                        />
                      </div>
                      <div className={cm.cn('flex flex-col gap-1')}>
                        <label
                          className={cm.cn(
                            'font-mono text-[10px] font-black uppercase tracking-widest',
                          )}
                          style={{ color: 'var(--color-text-secondary)' }}
                          htmlFor="workspace-auth-password"
                        >
                          {t('workspace.auth.password', {}, { defaultValue: 'Password' })}
                        </label>
                        <input
                          id="workspace-auth-password"
                          type="password"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          autoComplete="off"
                          className={cm.cn(
                            'w-full px-3 py-2 rounded-md font-mono text-sm outline-none',
                          )}
                          style={editorInputStyle}
                        />
                      </div>
                    </div>
                  ) : authType === 'apikey' ? (
                    <div className={cm.cn('flex flex-col gap-3')}>
                      <div className={cm.cn('flex flex-col gap-1')}>
                        <label
                          className={cm.cn(
                            'font-mono text-[10px] font-black uppercase tracking-widest',
                          )}
                          style={{ color: 'var(--color-text-secondary)' }}
                          htmlFor="workspace-auth-key"
                        >
                          {t('workspace.auth.keyName', {}, { defaultValue: 'Header name' })}
                        </label>
                        <input
                          id="workspace-auth-key"
                          type="text"
                          value={authKeyName}
                          onChange={(e) => setAuthKeyName(e.target.value)}
                          placeholder="X-API-Key"
                          className={cm.cn(
                            'w-full px-3 py-2 rounded-md font-mono text-sm outline-none',
                          )}
                          style={editorInputStyle}
                        />
                      </div>
                      <div className={cm.cn('flex flex-col gap-1')}>
                        <label
                          className={cm.cn(
                            'font-mono text-[10px] font-black uppercase tracking-widest',
                          )}
                          style={{ color: 'var(--color-text-secondary)' }}
                          htmlFor="workspace-auth-key-value"
                        >
                          {t('workspace.auth.keyValue', {}, { defaultValue: 'Key value' })}
                        </label>
                        <input
                          id="workspace-auth-key-value"
                          type="password"
                          value={authKeyValue}
                          onChange={(e) => setAuthKeyValue(e.target.value)}
                          className={cm.cn(
                            'w-full px-3 py-2 rounded-md font-mono text-sm outline-none',
                          )}
                          style={editorInputStyle}
                        />
                      </div>
                    </div>
                  ) : authType === 'none' ? (
                    <p
                      className={cm.cn('text-[11px]')}
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {t(
                        'workspace.auth.noneHint',
                        {},
                        { defaultValue: 'No authorization header will be sent with this request.' },
                      )}
                    </p>
                  ) : (
                    <>
                      <div className={cm.cn('flex items-center justify-between mb-2')}>
                        <label
                          className={cm.cn(
                            'font-mono text-[10px] font-black uppercase tracking-widest',
                          )}
                          style={{ color: 'var(--color-text-secondary)' }}
                          htmlFor="workspace-token"
                        >
                          {t('workspace.token', {}, { defaultValue: 'Token' })}
                        </label>
                        <span
                          className={cm.cn('font-mono text-[10px] font-bold px-2 py-0.5 rounded')}
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--color-method-patch) 18%, transparent)',
                            color: 'var(--color-method-patch)',
                          }}
                        >
                          {t('workspace.envVar', {}, { defaultValue: 'env variable' })}
                        </span>
                      </div>
                      <input
                        id="workspace-token"
                        type="password"
                        value={authToken}
                        onChange={(e) => setAuthToken(e.target.value)}
                        placeholder={t(
                          'workspace.tokenPlaceholder',
                          {},
                          { defaultValue: '{{API_TOKEN}}' },
                        )}
                        className={cm.cn(
                          'w-full px-3 py-2 rounded-md font-mono text-sm outline-none',
                        )}
                        style={{
                          backgroundColor: 'var(--color-background)',
                          color: 'var(--color-method-patch)',
                          border: `1px solid ${PANEL_BORDER}`,
                        }}
                      />
                      <p
                        className={cm.cn('mt-2 text-[11px]')}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {t(
                          'workspace.tokenHint',
                          {},
                          {
                            defaultValue:
                              'Sent as Authorization: Bearer <token> on every request in this collection.',
                          },
                        )}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Response panel */}
        <section
          className={cm.cn('rounded-2xl overflow-hidden flex flex-col')}
          style={{ backgroundColor: SURFACE_PANEL, border: `1px solid ${PANEL_BORDER}` }}
        >
          <header
            className={cm.cn('flex items-center justify-between px-4 py-3 border-b gap-2')}
            style={{
              borderColor: PANEL_BORDER,
              backgroundColor: 'color-mix(in srgb, var(--color-background) 40%, transparent)',
            }}
          >
            <div className={cm.cn('flex items-center gap-2 min-w-0')}>
              <MethodBadge method={method} />
              {response?.status ? (
                <StatusPill
                  status={statusFromCode(response.status)}
                  label={String(response.status)}
                  emphasis
                />
              ) : (
                <span
                  className={cm.cn(
                    'font-mono text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded',
                  )}
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--color-surface-elevated) 60%, transparent)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {t('workspace.idle', {}, { defaultValue: 'Idle' })}
                </span>
              )}
            </div>
            <div
              className={cm.cn('flex items-center gap-3 font-mono text-[11px] shrink-0 min-w-0')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {response?.duration_ms ? (
                <>
                  <span
                    className={cm.cn('whitespace-nowrap')}
                    style={{ color: 'var(--color-success)' }}
                  >
                    {response.duration_ms} ms
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className={cm.cn('whitespace-nowrap')}>
                    {responseSize >= 1024
                      ? `${(responseSize / 1024).toFixed(1)} KB`
                      : `${responseSize} B`}
                  </span>
                </>
              ) : (
                <span>{t('workspace.noResponseYet', {}, { defaultValue: 'No response yet' })}</span>
              )}
            </div>
          </header>
          {response?.error ? (
            <div
              className={cm.cn('mx-4 mt-4 px-3 py-2 rounded-md font-mono text-xs')}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
                color: 'var(--color-error)',
              }}
              role="alert"
              data-mol-id="workspace-response-error"
            >
              {response.error}
            </div>
          ) : null}
          <pre
            className={cm.cn(
              'flex-1 p-4 md:p-5 m-0 font-mono text-[12px] leading-relaxed overflow-auto whitespace-pre-wrap break-words max-h-[50vh] lg:max-h-none',
            )}
            style={{
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              minHeight: '12rem',
            }}
            data-mol-id="workspace-response-body"
          >
            {response
              ? formatBody(response.body)
              : t(
                  'workspace.responseHint',
                  {},
                  { defaultValue: '// Press Send to fire the request and capture the response.' },
                )}
          </pre>
          {response && responseHeaderEntries.length > 0 ? (
            <details
              className={cm.cn('border-t px-4 py-2')}
              style={{ borderColor: PANEL_BORDER }}
              data-mol-id="workspace-response-headers"
            >
              <summary
                className={cm.cn(
                  'font-mono text-[11px] font-extrabold uppercase tracking-widest cursor-pointer select-none',
                )}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t(
                  'workspace.responseHeaders',
                  { count: responseHeaderEntries.length },
                  { defaultValue: 'Response headers ({{count}})' },
                )}
              </summary>
              <ul className={cm.cn('py-2 max-h-40 overflow-auto')}>
                {responseHeaderEntries.map(([name, value]) => (
                  <li
                    key={name}
                    className={cm.cn('font-mono text-[11px] px-1 py-0.5 break-all')}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <span style={{ color: 'var(--color-text-primary)' }}>{name}:</span> {value}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <footer
            className={cm.cn('border-t')}
            style={{
              borderColor: PANEL_BORDER,
              backgroundColor: 'color-mix(in srgb, var(--color-background) 40%, transparent)',
            }}
          >
            <div
              className={cm.cn(
                'flex items-center px-4 py-2 border-b font-mono text-[11px] font-extrabold uppercase tracking-widest',
              )}
              style={{ borderColor: PANEL_BORDER }}
            >
              <span style={{ color: 'var(--color-text-primary)' }} className={cm.cn('mr-4')}>
                {t('workspace.testResults', {}, { defaultValue: 'Test results' })}
              </span>
              <span
                className={cm.cn('flex items-center gap-1')}
                style={{ color: 'var(--color-success)' }}
              >
                <span
                  className={cm.cn('w-2 h-2 rounded-full')}
                  style={{ backgroundColor: 'var(--color-method-get)' }}
                  aria-hidden="true"
                />
                {t(
                  'workspace.passedCount',
                  { count: passed },
                  { defaultValue: '{{count}} passed' },
                )}
              </span>
              <span
                className={cm.cn('ml-3 flex items-center gap-1')}
                style={{ color: failed > 0 ? 'var(--color-error)' : 'var(--color-text-secondary)' }}
              >
                <span
                  className={cm.cn('w-2 h-2 rounded-full')}
                  style={{
                    backgroundColor:
                      failed > 0 ? 'var(--color-method-delete)' : 'var(--color-border-light)',
                  }}
                  aria-hidden="true"
                />
                {t(
                  'workspace.failedCount',
                  { count: failed },
                  { defaultValue: '{{count}} failed' },
                )}
              </span>
            </div>
            <ul className={cm.cn('px-4 py-3 space-y-1.5 max-h-40 overflow-auto')}>
              {assertions.length === 0 ? (
                <li
                  className={cm.cn('font-mono text-[12px] px-3 py-1.5')}
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {t(
                    'workspace.noAssertions',
                    {},
                    { defaultValue: 'Run a request to evaluate built-in assertions.' },
                  )}
                </li>
              ) : (
                assertions.map((assertion, i) => (
                  <li
                    key={i}
                    className={cm.cn(
                      'flex items-center gap-2 font-mono text-[12px] px-3 py-1.5 rounded',
                    )}
                    style={{
                      color: assertion.passed ? 'var(--color-text-primary)' : 'var(--color-error)',
                      backgroundColor:
                        'color-mix(in srgb, var(--color-surface-elevated) 40%, transparent)',
                    }}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base shrink-0')}
                      style={{
                        color: assertion.passed
                          ? 'var(--color-method-get)'
                          : 'var(--color-method-delete)',
                      }}
                      aria-hidden="true"
                    >
                      {assertion.passed ? 'check_circle' : 'cancel'}
                    </span>
                    <span>
                      {t(`workspace.assertion.${i}`, {}, { defaultValue: assertion.defaultLabel })}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </footer>
        </section>
      </div>
    </div>
  )
}
