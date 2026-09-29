import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

/** The standard trade dispatch flow shown under the form. */
const DISPATCH_FLOW: { title: string; body: string }[] = [
  {
    title: 'Account & location record created',
    body: 'This form — the customer, the jobsite, and the access notes every tech reviews before shifting into park.',
  },
  {
    title: 'Draft estimate / work order',
    body: 'Price the job from line items — parts, labor, and rates per quantity.',
  },
  {
    title: '1-tap customer SMS approval',
    body: 'The customer signs the estimate from their phone; acceptance creates the job automatically.',
  },
  {
    title: 'Dispatch van & mobile invoice',
    body: 'Assign a technician on the board, then invoice straight from the completed job.',
  },
]

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
  const sectionTitleCls = cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-display')

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto)}>
      <nav className={cm.sp('mb', 4)}>
        <Link to="/customers" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('customers.backToList', {}, { defaultValue: 'Back to customers' })}
        </Link>
      </nav>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {t('customers.new.heading', {}, { defaultValue: 'New customer' })}
      </h1>
      <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 6), 'text-on-surface-variant')}>
        {t(
          'customers.new.subheading',
          {},
          {
            defaultValue:
              'Create the customer record, service location, and billing terms — the draft dossier every future job starts from.',
          },
        )}
      </p>

      <form onSubmit={submit} className={cm.stack(6)}>
        <fieldset className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(4))}>
          <legend className={cm.cn(sectionTitleCls, cm.sp('mb', 2))}>
            {t(
              'customers.new.accountHeading',
              {},
              { defaultValue: 'Account Classification & Primary Contact' },
            )}
          </legend>
          <label className={cm.stack(1)}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('customers.new.name', {}, { defaultValue: 'Name' })}
            </span>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t(
                'customers.new.namePlaceholder',
                {},
                { defaultValue: 'Halberd Bakery' },
              )}
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
          <p
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              'text-on-surface-variant',
            )}
          >
            <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">
              sms
            </span>
            {t(
              'customers.new.smsNote',
              {},
              {
                defaultValue:
                  'The primary mobile receives automated “tech en route” SMS tracking and 1-tap signoffs.',
              },
            )}
          </p>
        </fieldset>

        <fieldset className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(4))}>
          <legend className={cm.cn(sectionTitleCls, cm.sp('mb', 2))}>
            {t(
              'customers.new.locationHeading',
              {},
              { defaultValue: 'Primary Service Location & Jobsite Logistics' },
            )}
          </legend>
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
          <div className={cm.stack(2)}>
            <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              <span
                className="material-symbols-outlined text-sm align-middle mr-1 text-warning"
                aria-hidden="true"
              >
                warning
              </span>
              {t(
                'customers.new.accessHeading',
                {},
                { defaultValue: 'Critical Field Tech Access & Site Logistics' },
              )}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'customers.new.accessBlurb',
                {},
                {
                  defaultValue:
                    'Visible on the mobile job record — technicians review this before shifting into park.',
                },
              )}
            </p>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t(
                  'customers.new.notes',
                  {},
                  { defaultValue: 'Parking, dogs & entry instructions' },
                )}
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
          </div>
        </fieldset>

        <section data-mol-id="new-customer-billing-terms" className={cm.card()}>
          <h2
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 4),
              cm.textSize('lg'),
              cm.fontWeight('semibold'),
              'border-b border-outline-variant',
            )}
          >
            <span
              className="material-symbols-outlined text-base align-middle mr-2 text-primary"
              aria-hidden="true"
            >
              payments
            </span>
            {t(
              'customers.new.billingHeading',
              {},
              { defaultValue: 'Billing Terms & Financial Rules' },
            )}
          </h2>
          <div className={cm.cn(cm.stack(2), cm.sp('p', 5))}>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'customers.new.billingBody',
                {},
                {
                  defaultValue:
                    'New accounts start on Due-Upon-Receipt (Net 0) terms. Invoices are generated from completed jobs with the quote’s line items already copied in, and the customer can pay the moment the invoice lands. Record-keeping statuses (draft, sent, paid) stay editable so your ledger matches reality.',
                },
              )}
            </p>
            <p
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-success',
              )}
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                check_circle
              </span>
              {t(
                'customers.new.billingProof',
                {},
                {
                  defaultValue:
                    'Export the full customer ledger to CSV at any time — no hostage data.',
                },
              )}
            </p>
          </div>
        </section>

        <section data-mol-id="new-customer-dispatch-flow" className={cm.card()}>
          <h3
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 4),
              cm.textSize('lg'),
              cm.fontWeight('semibold'),
              'border-b border-outline-variant',
            )}
          >
            <span
              className="material-symbols-outlined text-base align-middle mr-2 text-primary"
              aria-hidden="true"
            >
              bolt
            </span>
            {t('customers.new.flowHeading', {}, { defaultValue: 'Standard Trade Dispatch Flow' })}
          </h3>
          <ol className={cm.cn(cm.stack(3), cm.sp('p', 5))}>
            {DISPATCH_FLOW.map((step, i) => (
              <li key={step.title} className={cm.flex({ align: 'start', gap: 'sm' })}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    'h-6 w-6 shrink-0 font-bold bg-primary-container text-on-primary-container text-xs mt-0.5',
                  )}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span>
                  <strong className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t(
                      `customers.new.flow${i}.title`,
                      {},
                      { defaultValue: `${i + 1}. ${step.title}` },
                    )}
                  </strong>
                  <span className={cm.cn(cm.textSize('sm'), 'block text-on-surface-variant')}>
                    {t(`customers.new.flow${i}.body`, {}, { defaultValue: step.body })}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

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
            data-mol-id="new-customer-submit"
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
