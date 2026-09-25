import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { unwrapList } from '../lib/unwrap.js'

interface Shipment {
  id: string
  tracking_number: string
  carrier: string
  status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception'
  origin_city: string
  origin_state: string
  destination_city: string
  destination_state: string
  eta: string
  customer: string
  created_at: string
}

interface CarrierOption {
  id: string
  name: string
  code: string
}

const FILTERS = [
  'all',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'exception',
  'pending',
] as const
type Filter = (typeof FILTERS)[number]

const STATUS_COLOR: Record<Shipment['status'], string> = {
  pending: 'bg-surface-container text-on-surface',
  in_transit: 'bg-primary-container text-on-primary-container',
  out_for_delivery: 'bg-warning-container text-on-warning-container',
  delivered: 'bg-success-container text-on-success-container',
  exception: 'bg-error-container text-on-error-container',
}

export function Shipments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Shipment[]>([])
  const [carriers, setCarriers] = useState<CarrierOption[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [draft, setDraft] = useState({
    tracking_number: '',
    carrier_id: '',
    recipient_name: '',
    recipient_email: '',
    origin: '',
    destination: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function refresh() {
    setLoading(true)
    return http
      .get('/api/shipments')
      .then((res) => {
        setList(unwrapList<Shipment>(res))
        setError(null)
      })
      .catch(() =>
        setError(t('shipments.loadError', {}, { defaultValue: 'Failed to load shipments.' })),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http
        .get('/api/shipments')
        .then((res) => {
          if (!cancelled) setList(unwrapList<Shipment>(res))
        })
        .catch(() => {
          if (!cancelled)
            setError(t('shipments.loadError', {}, { defaultValue: 'Failed to load shipments.' }))
        }),
      http
        .get('/api/carriers')
        .then((res) => {
          if (!cancelled) setCarriers(unwrapList<CarrierOption>(res))
        })
        .catch(() => null),
    ]).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function submitNew(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!draft.tracking_number.trim() || !draft.destination.trim()) {
      setSubmitError(
        t(
          'shipments.requiredError',
          {},
          { defaultValue: 'Tracking number and destination are required.' },
        ),
      )
      return
    }
    setSubmitting(true)
    try {
      const res = await http.post<{ id?: string }>('/api/shipments', {
        tracking_number: draft.tracking_number.trim(),
        carrier_id: draft.carrier_id || undefined,
        recipient_name: draft.recipient_name.trim() || undefined,
        recipient_email: draft.recipient_email.trim() || undefined,
        origin: draft.origin.trim() || undefined,
        destination: draft.destination.trim(),
      })
      track({
        name: 'shipment.created',
        properties: {
          shipment_id: res?.data?.id,
          tracking_number: draft.tracking_number.trim(),
        },
      })
      setCreatorOpen(false)
      setDraft({
        tracking_number: '',
        carrier_id: '',
        recipient_name: '',
        recipient_email: '',
        origin: '',
        destination: '',
      })
      await refresh()
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err)
      setSubmitError(
        msg || t('shipments.createFailed', {}, { defaultValue: 'Could not create shipment.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((s) => {
      if (filter !== 'all' && s.status !== filter) return false
      if (
        q &&
        !s.tracking_number.toLowerCase().includes(q) &&
        !s.customer.toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [list, filter, search])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('shipments.heading', {}, { defaultValue: 'Shipments' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'shipments.subheading',
              { count: visible.length, total: list.length },
              { defaultValue: '{{count}} of {{total}} shipments' },
            )}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="button-new-shipment"
          onClick={() => setCreatorOpen(true)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
            'inline-flex items-center justify-center min-h-10',
          )}
        >
          + {t('shipments.createLabel', {}, { defaultValue: 'New shipment' })}
        </button>
      </header>

      {creatorOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          data-mol-id="dialog-new-shipment"
          className={cm.cn(
            cm.overlay,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('p', 4),
            'z-50',
          )}
        >
          <form
            onSubmit={submitNew}
            className={cm.cn(cm.card(), cm.sp('p', 6), cm.maxW('lg'), 'w-full space-y-4')}
          >
            <header>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('shipments.newDialog.heading', {}, { defaultValue: 'New shipment' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                {t(
                  'shipments.newDialog.subheading',
                  {},
                  {
                    defaultValue:
                      'Track a shipment by entering its carrier label number and destination.',
                  },
                )}
              </p>
            </header>
            <Field
              label={t('shipments.field.tracking', {}, { defaultValue: 'Tracking number' })}
              required
            >
              <input
                data-mol-id="input-tracking"
                type="text"
                required
                value={draft.tracking_number}
                onChange={(e) => setDraft((d) => ({ ...d, tracking_number: e.target.value }))}
                className={fieldClass(cm)}
              />
            </Field>
            <Field label={t('shipments.field.carrier', {}, { defaultValue: 'Carrier' })}>
              <select
                data-mol-id="select-carrier"
                value={draft.carrier_id}
                onChange={(e) => setDraft((d) => ({ ...d, carrier_id: e.target.value }))}
                className={fieldClass(cm)}
              >
                <option value="">
                  {t('shipments.field.carrierAny', {}, { defaultValue: 'Auto-detect' })}
                </option>
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className={cm.flex({ gap: 'md' })}>
              <Field
                label={t('shipments.field.recipientName', {}, { defaultValue: 'Recipient name' })}
                className="flex-1"
              >
                <input
                  data-mol-id="input-recipient-name"
                  type="text"
                  value={draft.recipient_name}
                  onChange={(e) => setDraft((d) => ({ ...d, recipient_name: e.target.value }))}
                  className={fieldClass(cm)}
                />
              </Field>
              <Field
                label={t('shipments.field.recipientEmail', {}, { defaultValue: 'Recipient email' })}
                className="flex-1"
              >
                <input
                  data-mol-id="input-recipient-email"
                  type="email"
                  value={draft.recipient_email}
                  onChange={(e) => setDraft((d) => ({ ...d, recipient_email: e.target.value }))}
                  className={fieldClass(cm)}
                />
              </Field>
            </div>
            <Field label={t('shipments.field.origin', {}, { defaultValue: 'Origin' })}>
              <input
                data-mol-id="input-origin"
                type="text"
                value={draft.origin}
                onChange={(e) => setDraft((d) => ({ ...d, origin: e.target.value }))}
                placeholder={t(
                  'shipments.field.originPlaceholder',
                  {},
                  { defaultValue: 'City, State, Country' },
                )}
                className={fieldClass(cm)}
              />
            </Field>
            <Field
              label={t('shipments.field.destination', {}, { defaultValue: 'Destination' })}
              required
            >
              <input
                data-mol-id="input-destination"
                type="text"
                required
                value={draft.destination}
                onChange={(e) => setDraft((d) => ({ ...d, destination: e.target.value }))}
                placeholder={t(
                  'shipments.field.destinationPlaceholder',
                  {},
                  { defaultValue: 'City, State, Country' },
                )}
                className={fieldClass(cm)}
              />
            </Field>
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
                  'rounded-md border border-outline-variant text-on-surface',
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
                  ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                  : t('shipments.newDialog.submit', {}, { defaultValue: 'Create shipment' })}
              </button>
            </footer>
          </form>
        </div>
      ) : null}

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap')}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(
            'shipments.searchPlaceholder',
            {},
            { defaultValue: 'Tracking # or customer name…' },
          )}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'border border-outline-variant rounded-md flex-1 min-w-0 max-w-md font-mono',
            cm.textSize('sm'),
          )}
        />
        <nav
          aria-label={t('shipments.filterLabel', {}, { defaultValue: 'Filter shipments' })}
          className={cm.cn(cm.flex({ gap: 'xs', align: 'center' }), 'flex-wrap')}
        >
          {FILTERS.map((f) => {
            const active = filter === f
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'rounded-full',
                  // 40px hit target on touch; compact on pointer devices.
                  'inline-flex items-center justify-center min-h-10 md:min-h-0',
                  active
                    ? 'bg-primary text-on-primary'
                    : cm.cn('bg-surface border border-outline-variant', 'text-on-surface-variant'),
                )}
                aria-pressed={active}
              >
                {t(
                  `shipments.filter.${f}`,
                  {},
                  { defaultValue: f.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {error ? (
        <LoadErrorBanner
          message={error}
          retryLabel={t('common.retry', {}, { defaultValue: 'Retry' })}
          retryMolId="button-retry-shipments"
          onRetry={refresh}
        />
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('shipments.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <div className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter)}>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {list.length === 0
              ? t(
                  'shipments.emptyAll',
                  {},
                  {
                    defaultValue:
                      'No shipments yet. Create your first shipment to start tracking deliveries.',
                  },
                )
              : t(
                  'shipments.emptyFiltered',
                  {},
                  { defaultValue: 'No shipments match this filter or search.' },
                )}
          </p>
        </div>
      ) : (
        <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
          <table className={'w-full text-left text-sm'}>
            <thead>
              <tr className={'border-b border-outline-variant'}>
                <Th>{t('shipments.col.tracking', {}, { defaultValue: 'Tracking #' })}</Th>
                <Th>{t('shipments.col.carrier', {}, { defaultValue: 'Carrier' })}</Th>
                <Th>{t('nav.customer', {}, { defaultValue: 'Customer' })}</Th>
                <Th>{t('shipments.col.route', {}, { defaultValue: 'Route' })}</Th>
                <Th>{t('shipments.col.eta', {}, { defaultValue: 'ETA' })}</Th>
                <Th>{t('nav.status', {}, { defaultValue: 'Status' })}</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr
                  key={s.id}
                  className={'border-b border-outline-variant hover:bg-surface-container'}
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <Link
                      to={`/shipments/${s.id}`}
                      className={cm.cn(
                        cm.fontWeight('medium'),
                        'font-mono',
                        cm.textSize('xs'),
                        // Enlarge the tap target without changing the row layout.
                        'inline-block p-2 -m-2',
                      )}
                    >
                      {s.tracking_number}
                    </Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {s.carrier}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('medium'))}>
                    {s.customer}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-on-surface-variant',
                      cm.textSize('xs'),
                    )}
                  >
                    {s.origin_city}, {s.origin_state} → {s.destination_city}, {s.destination_state}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-on-surface-variant',
                      cm.textSize('xs'),
                    )}
                  >
                    {new Date(s.eta).toLocaleDateString()}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        'rounded',
                        STATUS_COLOR[s.status],
                      )}
                    >
                      {t(
                        `shipments.status.${s.status}`,
                        {},
                        { defaultValue: s.status.replace('_', ' ') },
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <th
      className={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        'text-on-surface-variant',
        'uppercase tracking-wider',
      )}
    >
      {children}
    </th>
  )
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn('block', className)}>
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
      {children}
    </label>
  )
}

function fieldClass(cm: ReturnType<typeof getClassMap>): string {
  return cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'border border-outline-variant rounded-md w-full bg-surface text-on-surface',
  )
}
