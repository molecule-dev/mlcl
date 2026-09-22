import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface NewCustomerForm {
  company: string
  contact_name: string
  contact_email: string
}

interface Customer {
  id: string
  company: string
  contact_name: string
  contact_email: string
  outstanding_cents: number
  total_billed_cents: number
  last_invoice_at: string | null
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Customers() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState<NewCustomerForm>({
    company: '',
    contact_name: '',
    contact_email: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/customers')
      .then((res) => {
        if (!cancelled) setCustomers(unwrapList<Customer>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('customers.loadError', {}, { defaultValue: 'Failed to load customers.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company.trim()) return
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await http.post('/api/customers', form)
      const body = (res as { data?: unknown })?.data ?? res
      const created = ((body as { data?: unknown })?.data ?? body) as Customer
      track({
        name: 'customer.created',
        properties: { id: created?.id, company: created?.company },
      })
      setCustomers((prev) => [created, ...prev])
      setForm({ company: '', contact_name: '', contact_email: '' })
      setShowNew(false)
    } catch (error) {
      setFormError(t('customers.createError', {}, { defaultValue: 'Could not create customer.' }))
      logError('customers.create', error)
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return customers
    const q = query.toLowerCase().trim()
    return customers.filter(
      (c) =>
        c.company.toLowerCase().includes(q) ||
        c.contact_name.toLowerCase().includes(q) ||
        c.contact_email.toLowerCase().includes(q),
    )
  }, [customers, query])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('customers.heading', {}, { defaultValue: 'Customers' })}
        </h1>
        <button
          type="button"
          onClick={() => setShowNew((prev) => !prev)}
          aria-expanded={showNew}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {showNew
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('customers.newCta', {}, { defaultValue: 'New customer' })}
        </button>
      </header>

      {showNew ? (
        <form
          onSubmit={handleCreate}
          className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
          aria-label={t('customers.newFormLabel', {}, { defaultValue: 'New customer' })}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('customers.newHeading', {}, { defaultValue: 'Add customer' })}
          </h2>
          <label className="block">
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t('form.company', {}, { defaultValue: 'Company' })}
            </span>
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
              required
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full border border-outline-variant rounded-md',
              )}
            />
          </label>
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('customers.field.contactName', {}, { defaultValue: 'Contact name' })}
              </span>
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md',
                )}
              />
            </label>
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('customers.field.contactEmail', {}, { defaultValue: 'Contact email' })}
              </span>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md',
                )}
              />
            </label>
          </div>
          {formError ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{formError}</p> : null}
          <div className={cm.cn(cm.flex({ gap: 'sm', justify: 'end' }))}>
            <button
              type="submit"
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md disabled:opacity-50',
              )}
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('customers.saveCta', {}, { defaultValue: 'Save customer' })}
            </button>
          </div>
        </form>
      ) : null}

      <div className={cm.cn(cm.card(), cm.sp('p', 4))}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'customers.searchPlaceholder',
            {},
            { defaultValue: 'Search company or contact…' },
          )}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'w-full border border-outline-variant rounded-md',
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
          {t('customers.empty', {}, { defaultValue: 'No customers match.' })}
        </p>
      ) : (
        <section className={cm.cn(cm.card(), 'overflow-hidden')}>
          <table className={cm.cn('w-full')}>
            <thead
              className={cm.cn(
                'bg-surface-container',
                cm.textSize('xs'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
              )}
            >
              <tr>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('form.company', {}, { defaultValue: 'Company' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('nav.contact', {}, { defaultValue: 'Contact' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('status.outstanding', {}, { defaultValue: 'Outstanding' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('customers.col.totalBilled', {}, { defaultValue: 'Total billed' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('customers.col.lastInvoice', {}, { defaultValue: 'Last invoice' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map((c) => (
                <tr key={c.id} className={cm.cn('hover:bg-surface-container')}>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <Link
                      to={`/customers/${c.id}`}
                      className={cm.cn(cm.fontWeight('semibold'), 'hover:underline')}
                    >
                      {c.company}
                    </Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm'))}>
                    <p>{c.contact_name}</p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {c.contact_email}
                    </p>
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      cm.fontWeight('semibold'),
                      c.outstanding_cents > 0 ? 'text-warning' : '',
                    )}
                  >
                    {fmtUsd(c.outstanding_cents)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      'text-on-surface-variant',
                    )}
                  >
                    {fmtUsd(c.total_billed_cents)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                      'whitespace-nowrap',
                    )}
                  >
                    {fmtDate(c.last_invoice_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
