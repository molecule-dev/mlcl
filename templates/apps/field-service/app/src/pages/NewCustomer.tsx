import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

export function NewCustomer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError(t('customers.new.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await http.post('/api/customers', {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim(),
        notes: form.notes.trim(),
      })
      const created = unwrapSingle<{ id?: string }>(res)
      track({ name: 'customer.created', properties: { customer_id: created?.id ?? null } })
      navigate(created?.id ? `/customers/${created.id}` : '/customers')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('customers.new.error', {}, { defaultValue: 'Failed to add customer.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'border border-outline-variant rounded-md w-full',
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto)}>
      <nav className={cm.sp('mb', 4)}>
        <Link to="/customers" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('customers.backToList', {}, { defaultValue: 'Back to customers' })}
        </Link>
      </nav>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('customers.new.heading', {}, { defaultValue: 'New customer' })}
      </h1>

      <form onSubmit={submit} className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(4))}>
        <label className={cm.stack(1)}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('customers.new.name', {}, { defaultValue: 'Name' })}
          </span>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('customers.new.namePlaceholder', {}, { defaultValue: 'Halberd Bakery' })}
            className={inputCls}
          />
        </label>
        <div className={cm.grid({ cols: 2, gap: 'md' })}>
          <label className={cm.stack(1)}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('customers.new.email', {}, { defaultValue: 'Email' })}
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className={cm.stack(1)}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('customers.new.phone', {}, { defaultValue: 'Phone' })}
            </span>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputCls}
            />
          </label>
        </div>
        <label className={cm.stack(1)}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {/* App-namespaced key: the generic `form.address` is defined by the
                shared @molecule/app-locales-common bundle ("Address"), which
                would silently override this label. This field is the service
                address — the job site — so the specific label wins. */}
            {t('customers.new.address', {}, { defaultValue: 'Service address' })}
          </span>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder={t(
              'customers.new.addressPlaceholder',
              {},
              { defaultValue: '214 Grand St, Hoboken, NJ 07030' },
            )}
            className={inputCls}
          />
        </label>
        <label className={cm.stack(1)}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('customers.new.notes', {}, { defaultValue: 'Notes' })}
          </span>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder={t(
              'customers.new.notesPlaceholder',
              {},
              { defaultValue: 'Gate codes, dogs, access windows…' },
            )}
            className={inputCls}
          />
        </label>

        {error ? (
          <p className={'text-error text-sm'} role="alert">
            {error}
          </p>
        ) : null}

        <div className={cm.flex({ gap: 'sm', justify: 'end' })}>
          <Link
            to="/customers"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded-md',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
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
              ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
              : t('customers.new.submit', {}, { defaultValue: 'Add customer' })}
          </button>
        </div>
      </form>
    </div>
  )
}
