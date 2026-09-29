import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'
import type { Campaign, Donor } from '../types.js'

const METHODS = ['check', 'card', 'cash', 'ach'] as const
const FUNDS = ['general', 'programs', 'equipment', 'capital', 'endowment'] as const

/** Today in the LOCAL calendar — toISOString() dates from UTC and can
 *  default the form to tomorrow on UTC-positive hosts. */
const today = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function NewGift() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [donors, setDonors] = useState<Donor[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [form, setForm] = useState({
    donor_id: searchParams.get('donor_id') ?? '',
    amount: '',
    gift_date: today(),
    method: 'card' as (typeof METHODS)[number],
    fund: 'general' as (typeof FUNDS)[number],
    campaign_id: '',
    note: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/donors').then((r) => unwrapList<Donor>(r)),
      http.get('/api/campaigns').then((r) => unwrapList<Campaign>(r)),
    ])
      .then(([d, c]) => {
        if (cancelled) return
        setDonors(d)
        setCampaigns(c)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('gifts.new.loadError', {}, { defaultValue: 'Failed to load donors.' }))
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const amountCents = Math.round(Number(form.amount) * 100)
    if (!form.donor_id) {
      setError(t('gifts.new.donorRequired', {}, { defaultValue: 'Pick a donor.' }))
      return
    }
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError(
        t('gifts.new.amountRequired', {}, { defaultValue: 'Enter an amount greater than zero.' }),
      )
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await http.post('/api/gifts', {
        donor_id: form.donor_id,
        amount_cents: amountCents,
        gift_date: form.gift_date,
        method: form.method,
        fund: form.fund,
        campaign_id: form.campaign_id || null,
        note: form.note.trim(),
      })
      const created = unwrapSingle<{ id?: string }>(res)
      // Fire-and-forget: analytics must never gate the redirect.
      track({
        name: 'gift.recorded',
        properties: {
          gift_id: created?.id ?? '',
          donor_id: form.donor_id,
          amount_cents: amountCents,
          method: form.method,
          fund: form.fund,
          campaign_id: form.campaign_id || null,
        },
      })
      navigate(created?.id ? `/gifts/${created.id}` : '/gifts')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('gifts.new.error', {}, { defaultValue: 'Failed to record the gift.' }),
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

  const selectedDonor = donors.find((d) => d.id === form.donor_id) ?? null
  const previewAmount =
    form.amount && Number(form.amount) > 0
      ? `$${Number(form.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      : null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto)}>
      <nav className={cm.sp('mb', 4)}>
        <Link to="/gifts" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('gifts.backToList', {}, { defaultValue: 'Back to gifts' })}
        </Link>
      </nav>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {t('gifts.new.heading', {}, { defaultValue: 'Record Contribution or Pledge Payment' })}
      </h1>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 6))}>
        {t(
          'gifts.new.subheading',
          {},
          {
            defaultValue:
              'Enter the transaction details, designate the fund, link the donor profile, and the gift joins the year-end substantiation ledger automatically.',
          },
        )}
      </p>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <form
          onSubmit={submit}
          className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(6), 'lg:col-span-2')}
        >
          <fieldset className={cm.stack(3)}>
            <legend className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t(
                'gifts.new.sectionDonor',
                {},
                { defaultValue: '1. Donor Identification & Lookup' },
              )}
            </legend>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'gifts.new.sectionDonorHint',
                {},
                {
                  defaultValue:
                    'Attribute the gift to the donor profile it counts toward — lifetime totals update immediately.',
                },
              )}
            </p>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('gifts.new.donor', {}, { defaultValue: 'Donor' })}
              </span>
              <select
                required
                value={form.donor_id}
                onChange={(e) => setForm({ ...form, donor_id: e.target.value })}
                className={inputCls}
              >
                <option value="">
                  {t('gifts.new.pickDonor', {}, { defaultValue: 'Select a donor…' })}
                </option>
                {donors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <fieldset className={cm.stack(3)}>
            <legend className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t(
                'gifts.new.sectionFinancial',
                {},
                { defaultValue: '2. Financial & Transaction Details' },
              )}
            </legend>
            <div className={cm.grid({ cols: 2, gap: 'md' })}>
              <label className={cm.stack(1)}>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                  {t('gifts.new.amount', {}, { defaultValue: 'Amount (USD)' })}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="125.00"
                  className={inputCls}
                />
              </label>
              <label className={cm.stack(1)}>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                  {t('gifts.new.date', {}, { defaultValue: 'Date' })}
                </span>
                <input
                  type="date"
                  required
                  value={form.gift_date}
                  onChange={(e) => setForm({ ...form, gift_date: e.target.value })}
                  className={inputCls}
                />
              </label>
            </div>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('gifts.new.method', {}, { defaultValue: 'Method' })}
              </span>
              <select
                value={form.method}
                onChange={(e) =>
                  setForm({ ...form, method: e.target.value as (typeof METHODS)[number] })
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
          </fieldset>

          <fieldset className={cm.stack(3)}>
            <legend className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t(
                'gifts.new.sectionDesignation',
                {},
                { defaultValue: '3. Designation & Restriction Governance' },
              )}
            </legend>
            <div className={cm.grid({ cols: 2, gap: 'md' })}>
              <label className={cm.stack(1)}>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                  {t('gifts.new.fund', {}, { defaultValue: 'Fund / designation' })}
                </span>
                <select
                  value={form.fund}
                  onChange={(e) =>
                    setForm({ ...form, fund: e.target.value as (typeof FUNDS)[number] })
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
              <label className={cm.stack(1)}>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                  {t('gifts.new.campaign', {}, { defaultValue: 'Campaign (optional)' })}
                </span>
                <select
                  value={form.campaign_id}
                  onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">
                    {t('gifts.new.noCampaign', {}, { defaultValue: 'No campaign' })}
                  </option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('gifts.new.note', {}, { defaultValue: 'Note' })}
              </span>
              <textarea
                rows={2}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder={t(
                  'gifts.new.notePlaceholder',
                  {},
                  { defaultValue: 'In memory of…, gala table, matching gift…' },
                )}
                className={inputCls}
              />
            </label>
          </fieldset>

          <fieldset className={cm.stack(3)}>
            <legend className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t(
                'gifts.new.sectionIrs',
                {},
                { defaultValue: '4. IRS 170(f)(8) Compliance & Benefits Disclosure' },
              )}
            </legend>
            <ul className={cm.stack(2)}>
              <li className={cm.cn(cm.flex({ align: 'start', gap: 2 }), cm.textSize('sm'))}>
                <span
                  className={'material-symbols-outlined text-success text-base'}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <span className="text-on-surface-variant">
                  {t(
                    'gifts.new.irsDisclosure',
                    {},
                    {
                      defaultValue:
                        'Receipts state that no goods or services were provided in exchange unless you note them — keep gala tickets or benefit values in the note.',
                    },
                  )}
                </span>
              </li>
              <li className={cm.cn(cm.flex({ align: 'start', gap: 2 }), cm.textSize('sm'))}>
                <span
                  className={'material-symbols-outlined text-success text-base'}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <span className="text-on-surface-variant">
                  {t(
                    'gifts.new.irsYear',
                    {},
                    {
                      defaultValue:
                        'The gift date decides the calendar tax year the contribution substantiates.',
                    },
                  )}
                </span>
              </li>
              <li className={cm.cn(cm.flex({ align: 'start', gap: 2 }), cm.textSize('sm'))}>
                <span
                  className={'material-symbols-outlined text-success text-base'}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <span className="text-on-surface-variant">
                  {t(
                    'gifts.new.irsLedger',
                    {},
                    {
                      defaultValue:
                        'Recorded gifts join the immutable ledger — receipts reference them verbatim.',
                    },
                  )}
                </span>
              </li>
            </ul>
          </fieldset>

          {error ? (
            <p className={'text-error text-sm'} role="alert">
              {error}
            </p>
          ) : null}

          <div className={cm.flex({ gap: 'sm', justify: 'end' })}>
            <Link
              to="/gifts"
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
                ? t('gifts.new.saving', {}, { defaultValue: 'Recording…' })
                : t('gifts.new.submit', {}, { defaultValue: 'Record gift' })}
            </button>
          </div>
        </form>

        {/* Live IRS substantiation preview — mirrors the actual form state. */}
        <aside
          className={cm.stack(4)}
          aria-label={t(
            'gifts.new.previewLabel',
            {},
            { defaultValue: 'Live IRS substantiation preview' },
          )}
        >
          <div className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(3))}>
            <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
              <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {t(
                  'gifts.new.previewHeading',
                  {},
                  { defaultValue: 'Live IRS Substantiation Preview' },
                )}
              </h2>
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'rounded uppercase bg-surface-container text-primary whitespace-nowrap',
                )}
              >
                {t('gifts.new.previewTag', {}, { defaultValue: 'IRS 170(f)(8)' })}
              </span>
            </div>
            <dl className={cm.stack(2)}>
              <PreviewRow
                label={t('gifts.new.previewDonor', {}, { defaultValue: 'Donor contributor' })}
                value={selectedDonor?.name ?? '—'}
              />
              <PreviewRow
                label={t('gifts.new.previewDate', {}, { defaultValue: 'Contribution date' })}
                value={form.gift_date}
              />
              <PreviewRow
                label={t('gifts.new.previewFund', {}, { defaultValue: 'Designated fund' })}
                value={t(`gift.fund.${form.fund}`, {}, { defaultValue: form.fund })}
              />
              <PreviewRow
                label={t('gifts.new.previewAmount', {}, { defaultValue: 'Eligible amount' })}
                value={previewAmount ?? '—'}
                strong
              />
            </dl>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}>
              {t(
                'gifts.new.previewNote',
                {},
                {
                  defaultValue:
                    '“No goods or services were provided in exchange for this contribution other than intangible religious or charitable benefits.”',
                },
              )}
            </p>
          </div>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'gifts.new.previewFooter',
              {},
              {
                defaultValue:
                  'This gift joins the donor’s year-end statement — issue consolidated receipts from the Receipts page each January.',
              },
            )}
          </p>
        </aside>
      </div>
    </div>
  )
}

function PreviewRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'start', justify: 'between', gap: 'sm' })}>
      <dt className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{label}</dt>
      <dd
        className={cm.cn(
          cm.textSize('sm'),
          strong ? cm.fontWeight('bold') : cm.fontWeight('medium'),
          'text-right',
        )}
      >
        {value}
      </dd>
    </div>
  )
}
