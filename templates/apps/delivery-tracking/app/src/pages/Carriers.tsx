import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Carrier {
  id: string
  name: string
  region: string
  shipments_30d: number
  on_time_rate: number
  exception_rate: number
  api_status: 'connected' | 'degraded' | 'disconnected'
  integrated_at: string
}

const STATUS_COLOR: Record<Carrier['api_status'], string> = {
  connected: 'bg-success-container text-on-success-container',
  degraded: 'bg-warning-container text-on-warning-container',
  disconnected: 'bg-error-container text-on-error-container',
}

export function Carriers() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Carrier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    code: '',
    tracking_url_template: '',
    base_url: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function refresh() {
    return http.get('/api/carriers').then((res) => setList(unwrapList<Carrier>(res)))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    refresh()
      .catch(() => {
        if (!cancelled)
          setError(t('carriers.loadError', {}, { defaultValue: 'Failed to load carriers.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, t])

  async function submitNew(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!draft.name.trim() || !draft.code.trim()) {
      setSubmitError(
        t('carriers.requiredError', {}, { defaultValue: 'Name and code are required.' }),
      )
      return
    }
    setSubmitting(true)
    try {
      await http.post('/api/carriers', {
        name: draft.name.trim(),
        code: draft.code.trim().toUpperCase(),
        tracking_url_template: draft.tracking_url_template.trim() || undefined,
        base_url: draft.base_url.trim() || undefined,
      })
      setCreatorOpen(false)
      setDraft({ name: '', code: '', tracking_url_template: '', base_url: '' })
      await refresh()
    } catch (err) {
      setSubmitError(
        (err as Error)?.message ??
          t('carriers.createFailed', {}, { defaultValue: 'Could not connect carrier.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('carriers.heading', {}, { defaultValue: 'Carriers' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'carriers.subheading',
              { count: list.length },
              { defaultValue: '{{count}} integrated' },
            )}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="button-connect-carrier"
          onClick={() => setCreatorOpen(true)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          + {t('carriers.connectLabel', {}, { defaultValue: 'Connect carrier' })}
        </button>
      </header>

      {creatorOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          data-mol-id="dialog-connect-carrier"
          className={cm.cn(cm.overlay, cm.flex({ align: 'center', justify: 'center' }), 'z-50')}
        >
          <form
            onSubmit={submitNew}
            className={cm.cn(cm.card(), cm.sp('p', 6), cm.maxW('md'), 'w-full space-y-4')}
          >
            <header>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('carriers.newDialog.heading', {}, { defaultValue: 'Connect a carrier' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                {t(
                  'carriers.newDialog.subheading',
                  {},
                  {
                    defaultValue:
                      'Add a carrier integration so its tracking numbers and webhooks resolve automatically.',
                  },
                )}
              </p>
            </header>
            <CarrierField
              label={t('carriers.field.name', {}, { defaultValue: 'Carrier name' })}
              dataId="input-name"
              value={draft.name}
              required
              onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
            />
            <CarrierField
              label={t('carriers.field.code', {}, { defaultValue: 'Code' })}
              dataId="input-code"
              value={draft.code}
              required
              onChange={(v) => setDraft((d) => ({ ...d, code: v }))}
              placeholder="UPS / FEDEX / DHL"
            />
            <CarrierField
              label={t('carriers.field.tracking', {}, { defaultValue: 'Tracking URL template' })}
              dataId="input-tracking"
              value={draft.tracking_url_template}
              onChange={(v) => setDraft((d) => ({ ...d, tracking_url_template: v }))}
              placeholder="https://example.com/track?n={tracking_number}"
            />
            <CarrierField
              label={t('carriers.field.base', {}, { defaultValue: 'API base URL' })}
              dataId="input-base-url"
              value={draft.base_url}
              onChange={(v) => setDraft((d) => ({ ...d, base_url: v }))}
              placeholder="https://api.example.com"
            />
            {submitError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{submitError}</p>
            ) : null}
            <footer className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), cm.sp('pt', 2))}>
              <button
                type="button"
                data-mol-id="button-cancel"
                onClick={() => {
                  setCreatorOpen(false)
                  setSubmitError(null)
                }}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-md border border-outline-variant',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                data-mol-id="button-submit"
                disabled={submitting}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md disabled:opacity-50',
                )}
              >
                {submitting
                  ? t('carriers.newDialog.submitting', {}, { defaultValue: 'Connecting…' })
                  : t('carriers.newDialog.submit', {}, { defaultValue: 'Connect carrier' })}
              </button>
            </footer>
          </form>
        </div>
      ) : null}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <ul className={'space-y-2'}>
          {list.map((c) => (
            <li key={c.id}>
              <Link
                to={`/carriers/${c.id}`}
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 5),
                  cm.flex({ align: 'center', gap: 'md' }),
                  'hover:bg-surface-container',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.h(12),
                    cm.w(12),
                    'rounded shrink-0 bg-primary-container text-on-primary-container',
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                    {c.name
                      .split(' ')
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'truncate')}>
                    {c.name}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{c.region}</p>
                </div>
                <Stat
                  label={t('carriers.col.shipments', {}, { defaultValue: 'Shipments (30d)' })}
                  value={c.shipments_30d.toLocaleString()}
                />
                <Stat
                  label={t('carriers.col.onTime', {}, { defaultValue: 'On-time' })}
                  value={`${Math.round(c.on_time_rate * 100)}%`}
                  accent
                />
                <Stat
                  label={t('carriers.col.exceptions', {}, { defaultValue: 'Exceptions' })}
                  value={`${(c.exception_rate * 100).toFixed(1)}%`}
                  warn={c.exception_rate > 0.02}
                />
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'rounded shrink-0',
                    STATUS_COLOR[c.api_status],
                  )}
                >
                  {t(`carriers.status.${c.api_status}`, {}, { defaultValue: c.api_status })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
  warn,
}: {
  label: string
  value: string
  accent?: boolean
  warn?: boolean
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.shrink0, cm.textCenter)} style={{ width: '100px' }}>
      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{label}</p>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          accent ? cm.textPrimary : warn ? 'text-error' : '',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function CarrierField({
  label,
  value,
  dataId,
  required,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  dataId?: string
  required?: boolean
  placeholder?: string
  onChange: (v: string) => void
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'text-on-surface-variant uppercase tracking-wider',
          cm.sp('mb', 1),
          'block',
        )}
      >
        {label}
        {required ? ' *' : null}
      </span>
      <input
        type="text"
        required={required}
        placeholder={placeholder}
        value={value}
        data-mol-id={dataId}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          'border border-outline-variant rounded-md w-full bg-surface text-on-surface',
        )}
      />
    </label>
  )
}
