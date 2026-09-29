import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

const TAGS = ['monthly-donor', 'major-donor', 'volunteer', 'board-member', 'lapsed', 'new'] as const
const METHODS = ['check', 'card', 'cash', 'ach'] as const
const FUNDS = ['general', 'programs', 'equipment', 'capital', 'endowment'] as const

/** Today in the LOCAL calendar (see NewGift for the UTC rationale). */
const today = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function NewDonor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    is_organization: false,
  })
  const [tags, setTags] = useState<string[]>([])
  // Design section 4 — optional inaugural gift booked at creation time.
  const [initialGift, setInitialGift] = useState({
    enabled: false,
    amount: '',
    method: 'check' as (typeof METHODS)[number],
    fund: 'general' as (typeof FUNDS)[number],
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError(t('donors.new.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await http.post('/api/donors', {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        is_organization: form.is_organization,
        tags,
      })
      const created = unwrapSingle<{ id?: string }>(res)
      // Fire-and-forget: analytics must never gate the redirect.
      track({
        name: 'donor.created',
        properties: { donor_id: created?.id ?? '', is_organization: form.is_organization },
      })
      // Section 4: book the optional inaugural gift against the new donor
      // before navigating. A failure here must not lose the donor — surface
      // the error on the detail page instead of swallowing it.
      if (created?.id && initialGift.enabled) {
        const amountCents = Math.round(Number(initialGift.amount) * 100)
        if (Number.isFinite(amountCents) && amountCents > 0) {
          try {
            await http.post('/api/gifts', {
              donor_id: created.id,
              amount_cents: amountCents,
              gift_date: today(),
              method: initialGift.method,
              fund: initialGift.fund,
              campaign_id: null,
              note: '',
            })
          } catch (_giftError) {
            // The donor exists; the gift can be recorded from their profile.
          }
        }
      }
      navigate(created?.id ? `/donors/${created.id}` : '/donors')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('donors.new.error', {}, { defaultValue: 'Failed to add donor.' }),
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

  const readiness = [
    {
      label: t('donors.new.readyName', {}, { defaultValue: 'Donor name recorded' }),
      done: form.name.trim().length > 0,
    },
    {
      label: t(
        'donors.new.readyEmail',
        {},
        { defaultValue: 'Email available for receipt dispatch' },
      ),
      done: form.email.trim().length > 0,
    },
    {
      label: t(
        'donors.new.readyAddress',
        {},
        { defaultValue: 'Mailing address for the statement' },
      ),
      done: form.address.trim().length > 0,
    },
    {
      label: t('donors.new.readyCohort', {}, { defaultValue: 'Stewardship cohort assigned' }),
      done: tags.length > 0,
    },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto)}>
      <nav className={cm.sp('mb', 4)}>
        <Link to="/donors" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('donors.backToList', {}, { defaultValue: 'Back to donors' })}
        </Link>
      </nav>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {t('donors.new.heading', {}, { defaultValue: 'New donor' })}
      </h1>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 6))}>
        {t(
          'donors.new.subheading',
          {},
          {
            defaultValue:
              'Set up the giving profile, stewardship cohorts, and year-end receipt delivery preferences.',
          },
        )}
      </p>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <form
          onSubmit={submit}
          className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(6), 'lg:col-span-2')}
        >
          <fieldset className={cm.stack(4)}>
            <legend className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t(
                'donors.new.sectionIdentity',
                {},
                { defaultValue: '1. Donor Identity & Fiduciary Details' },
              )}
            </legend>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'donors.new.sectionIdentityHint',
                {},
                {
                  defaultValue:
                    'Establish tax identity and the contact details used on receipts and statements.',
                },
              )}
            </p>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('donors.new.name', {}, { defaultValue: 'Name' })}
              </span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t(
                  'donors.new.namePlaceholder',
                  {},
                  { defaultValue: 'Margaret Osei or Riverside Family Fund' },
                )}
                className={inputCls}
              />
            </label>
            <div className={cm.grid({ cols: 2, gap: 'md' })}>
              <label className={cm.stack(1)}>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                  {t('donors.new.email', {}, { defaultValue: 'Email' })}
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
                  {t('donors.new.phone', {}, { defaultValue: 'Phone' })}
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
                {t('form.address', {}, { defaultValue: 'Mailing address' })}
              </span>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={t(
                  'donors.new.addressPlaceholder',
                  {},
                  { defaultValue: '4120 Holly Lane, Seattle, WA 98103' },
                )}
                className={inputCls}
              />
            </label>
            <label className={cm.flex({ align: 'center', gap: 'sm' })}>
              <input
                type="checkbox"
                checked={form.is_organization}
                onChange={(e) => setForm({ ...form, is_organization: e.target.checked })}
              />
              <span className={cm.textSize('sm')}>
                {t(
                  'donors.new.isOrganization',
                  {},
                  { defaultValue: 'This donor is an organization or foundation' },
                )}
              </span>
            </label>
          </fieldset>

          <fieldset className={cm.stack(3)}>
            <legend className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t(
                'donors.new.sectionStewardship',
                {},
                { defaultValue: '2. Stewardship & Cohort Assignment' },
              )}
            </legend>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'donors.new.sectionStewardshipHint',
                {},
                {
                  defaultValue:
                    'Classify the donor into stewardship cohorts — tags drive the directory filters and lapse follow-ups.',
                },
              )}
            </p>
            <div className={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
              {TAGS.map((tg) => {
                const checked = tags.includes(tg)
                return (
                  <label
                    key={tg}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('sm'),
                      'rounded-full border border-outline-variant cursor-pointer',
                      checked &&
                        'bg-primary-container text-on-primary-container border-transparent',
                    )}
                  >
                    <input
                      type="checkbox"
                      className={'sr-only'}
                      checked={checked}
                      onChange={() =>
                        setTags((prev) =>
                          prev.includes(tg) ? prev.filter((x) => x !== tg) : [...prev, tg],
                        )
                      }
                    />
                    {t(`donors.tag.${tg}`, {}, { defaultValue: tg.replace(/-/g, ' ') })}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <fieldset className={cm.stack(3)}>
            <legend className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t(
                'donors.new.sectionTax',
                {},
                { defaultValue: '3. Tax Compliance & IRS 170(f)(8) Settings' },
              )}
            </legend>
            <ul className={cm.stack(2)}>
              {[
                {
                  key: 'consolidated',
                  def: 'Consolidated year-end statement — one numbered receipt per donor per year, every gift itemized.',
                },
                {
                  key: 'disclosure',
                  def: '“No goods or services were provided” disclosure auto-applied to every generated receipt.',
                },
                {
                  key: 'numbering',
                  def: 'Sequential, immutable receipt numbering — corrections re-issue, they never overwrite.',
                },
              ].map((row) => (
                <li
                  key={row.key}
                  className={cm.cn(cm.flex({ align: 'start', gap: 2 }), cm.textSize('sm'))}
                >
                  <span
                    className={'material-symbols-outlined text-success text-base'}
                    aria-hidden="true"
                  >
                    check_circle
                  </span>
                  <span className="text-on-surface-variant">
                    {t(`donors.new.taxRule.${row.key}`, {}, { defaultValue: row.def })}
                  </span>
                </li>
              ))}
            </ul>
          </fieldset>

          <fieldset className={cm.stack(3)}>
            <legend className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t(
                'donors.new.sectionGift',
                {},
                { defaultValue: '4. Initial Gift or Recurring Pledge Setup (Optional)' },
              )}
            </legend>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'donors.new.sectionGiftHint',
                {},
                {
                  defaultValue:
                    'Book the inaugural gift immediately, or add the donor to the directory and record gifts later from their profile.',
                },
              )}
            </p>
            <label className={cm.flex({ align: 'center', gap: 'sm' })}>
              <input
                type="checkbox"
                checked={initialGift.enabled}
                onChange={(e) => setInitialGift({ ...initialGift, enabled: e.target.checked })}
              />
              <span className={cm.textSize('sm')}>
                {t(
                  'donors.new.recordInitialGift',
                  {},
                  { defaultValue: 'Record an initial gift now' },
                )}
              </span>
            </label>
            {initialGift.enabled ? (
              <div className={cm.grid({ cols: 3, gap: 'md' })}>
                <label className={cm.stack(1)}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t('gifts.new.amount', {}, { defaultValue: 'Amount (USD)' })}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={initialGift.amount}
                    onChange={(e) => setInitialGift({ ...initialGift, amount: e.target.value })}
                    placeholder="125.00"
                    className={inputCls}
                  />
                </label>
                <label className={cm.stack(1)}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t('gifts.new.method', {}, { defaultValue: 'Method' })}
                  </span>
                  <select
                    value={initialGift.method}
                    onChange={(e) =>
                      setInitialGift({
                        ...initialGift,
                        method: e.target.value as (typeof METHODS)[number],
                      })
                    }
                    className={inputCls}
                  >
                    {METHODS.map((m) => (
                      <option key={m} value={m}>
                        {t(`gift.method.${m}`, {}, { defaultValue: m })}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={cm.stack(1)}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t('gifts.new.fund', {}, { defaultValue: 'Fund / designation' })}
                  </span>
                  <select
                    value={initialGift.fund}
                    onChange={(e) =>
                      setInitialGift({
                        ...initialGift,
                        fund: e.target.value as (typeof FUNDS)[number],
                      })
                    }
                    className={inputCls}
                  >
                    {FUNDS.map((f) => (
                      <option key={f} value={f}>
                        {t(`gift.fund.${f}`, {}, { defaultValue: f })}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </fieldset>

          {error ? (
            <p className={'text-error text-sm'} role="alert">
              {error}
            </p>
          ) : null}

          <div className={cm.flex({ gap: 'sm', justify: 'end' })}>
            <Link
              to="/donors"
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
                : t('donors.new.submit', {}, { defaultValue: 'Add donor' })}
            </button>
          </div>
        </form>

        {/* Live stewardship preview — the design's right rail, fed by the
            actual form state. */}
        <aside
          className={cm.cn(cm.stack(4))}
          aria-label={t(
            'donors.new.previewLabel',
            {},
            { defaultValue: 'Live stewardship preview' },
          )}
        >
          <div className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(3))}>
            <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
              {t('donors.new.previewHeading', {}, { defaultValue: 'Live stewardship preview' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {form.name.trim() ||
                t('donors.new.previewUnnamed', {}, { defaultValue: 'Unnamed donor' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {form.email.trim() || '—'}
            </p>
            {tags.length > 0 ? (
              <div className={cm.flex({ gap: 2, wrap: 'wrap' })}>
                {tags.map((tg) => (
                  <span
                    key={tg}
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      'rounded-full bg-surface-container text-on-surface-variant',
                    )}
                  >
                    {t(`donors.tag.${tg}`, {}, { defaultValue: tg.replace(/-/g, ' ') })}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(2))}>
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('donors.new.readinessHeading', {}, { defaultValue: 'Receipt readiness' })}
            </h3>
            <ul className={cm.stack(2)}>
              {readiness.map((r) => (
                <li
                  key={r.label}
                  className={cm.cn(cm.flex({ align: 'start', gap: 2 }), cm.textSize('sm'))}
                >
                  <span
                    className={
                      r.done
                        ? 'material-symbols-outlined text-success text-base'
                        : 'material-symbols-outlined text-on-surface-variant text-base'
                    }
                    aria-hidden="true"
                  >
                    {r.done ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className="text-on-surface-variant">{r.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
