import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

const STEPS = ['shop', 'categories', 'payouts', 'review'] as const
type StepId = (typeof STEPS)[number]

const STEP_META: Record<StepId, { label: string; eyebrow: string }> = {
  shop: { label: 'Shop basics', eyebrow: 'Step 1 · Tell us about your shop' },
  categories: { label: 'Categories & samples', eyebrow: 'Step 2 · What do you make?' },
  payouts: { label: 'Payout & taxes', eyebrow: 'Step 3 · Where do payouts go?' },
  review: { label: 'Review & submit', eyebrow: 'Step 4 · Final review' },
}

// Slugs match the Catalog page's category filters.
const CATEGORIES = [
  { slug: 'home', label: 'Home & Living' },
  { slug: 'apparel', label: 'Apparel' },
  { slug: 'jewelry', label: 'Jewelry' },
  { slug: 'art', label: 'Art & Prints' },
  { slug: 'paper', label: 'Paper Goods' },
  { slug: 'wellness', label: 'Wellness' },
  { slug: 'kitchen', label: 'Kitchen' },
  { slug: 'kids', label: 'Kids' },
]

interface VendorForm {
  shopName: string
  tagline: string
  website: string
  contact: string
  about: string
  bankAccount: string
  taxId: string
  currency: string
  samples: string
}

const EMPTY_FORM: VendorForm = {
  shopName: '',
  tagline: '',
  website: '',
  contact: '',
  about: '',
  bankAccount: '',
  taxId: '',
  currency: 'EUR',
  samples: '',
}

export function VendorOnboarding() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { isAuthenticated } = useAuth()
  const [step, setStep] = useState<StepId>('shop')
  const [picked, setPicked] = useState<string[]>([])
  const [form, setForm] = useState<VendorForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateField = <K extends keyof VendorForm>(key: K, value: VendorForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const idx = STEPS.indexOf(step)
  const advance = () => {
    if (step === 'review') {
      void submitApplication()
      return
    }
    if (step === 'shop' && !form.shopName.trim()) {
      setError(
        t('vendorOnboarding.errors.shopName', {}, { defaultValue: 'Shop name is required.' }),
      )
      return
    }
    setError(null)
    const next = STEPS[idx + 1]
    if (next) setStep(next)
  }
  const back = () => {
    const prev = STEPS[idx - 1]
    if (prev) setStep(prev)
  }

  async function submitApplication() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/vendor/apply' } } })
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await http.post('/api/vendors/apply', {
        storeName: form.shopName,
        storeDescription: form.tagline ? `${form.tagline}\n\n${form.about}` : form.about,
        bankAccount: form.bankAccount
          ? { account: form.bankAccount, taxId: form.taxId, currency: form.currency }
          : null,
      })
      track({
        name: 'shop.created',
        properties: { shop_name: form.shopName },
      })
      setSubmitted(true)
      setForm(EMPTY_FORM)
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : t(
              'vendorOnboarding.errors.submit',
              {},
              { defaultValue: 'Could not submit your application.' },
            )
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const togglePick = (cat: string) => {
    setPicked((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]))
  }

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 4),
          'border-b border-outline-variant',
        )}
      >
        <Link
          to="/"
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
          aria-label={APP_NAME}
        >
          <BrandWordmark as="span" size="sm" />
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <ThemeToggle />
          <Link
            to="/"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant hover:text-primary')}
          >
            {t('vendorOnboarding.exit', {}, { defaultValue: 'Save & continue later' })}
          </Link>
        </div>
      </header>

      <main
        className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[1100px] space-y-8')}
      >
        {/* Hero */}
        <section
          className={cm.cn(
            cm.sp('p', 10),
            'relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-container to-info text-on-primary',
          )}
        >
          <div className="relative z-10 max-w-2xl">
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.sp('mb', 4),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                'inline-flex items-center uppercase tracking-widest bg-surface/15 backdrop-blur-md',
              )}
            >
              {t(
                'vendorOnboarding.eyebrow',
                { appName: APP_NAME },
                { defaultValue: 'Apply to sell on {{appName}}' },
              )}
            </p>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-4xl md:text-5xl tracking-tight leading-[1.05] font-extrabold',
              )}
            >
              {APP_TAGLINE}
            </h1>
            <p className={cm.cn(cm.sp('mt', 4), cm.textSize('lg'), 'opacity-85 leading-relaxed')}>
              {t(
                'vendorOnboarding.heroBody',
                {},
                {
                  defaultValue:
                    'A flat 8% commission, payouts every Friday, your storefront, your story. Tell us a little about your shop and we’ll be in touch within 48 hours.',
                },
              )}
            </p>
          </div>
          <div
            className={
              'absolute -right-24 -top-24 w-[26rem] h-[26rem] rounded-full bg-surface/15 blur-3xl'
            }
            aria-hidden
          />
        </section>

        {/* Stepper */}
        <ol className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          {STEPS.map((s, i) => {
            const active = i <= idx
            return (
              <li key={s} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'h-9 w-9 rounded-full transition-colors',
                    active
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant',
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    active ? 'text-on-surface' : 'text-on-surface-variant',
                  )}
                >
                  {t(`vendorOnboarding.step.${s}.label`, {}, { defaultValue: STEP_META[s].label })}
                </span>
                {i < STEPS.length - 1 && (
                  <span
                    className={cm.cn('mx-2 h-0 w-10 border-t border-outline-variant')}
                    aria-hidden
                  />
                )}
              </li>
            )
          })}
        </ol>

        <article
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-3xl border border-outline-variant bg-surface space-y-6',
          )}
        >
          <div className={cm.cn(cm.stack(1))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-orange-700 dark:text-primary',
              )}
            >
              {t(
                `vendorOnboarding.step.${step}.eyebrow`,
                {},
                { defaultValue: STEP_META[step].eyebrow },
              )}
            </p>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-2xl tracking-tight font-extrabold text-on-surface',
              )}
            >
              {t(
                `vendorOnboarding.step.${step}.label`,
                {},
                { defaultValue: STEP_META[step].label },
              )}
            </h2>
          </div>

          {step === 'shop' && (
            <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
              {[
                { id: 'shopName' as const, label: 'Shop name', placeholder: 'Mira & Co. Ceramics' },
                {
                  id: 'tagline' as const,
                  label: 'Short tagline',
                  placeholder: 'Hand-thrown stoneware from Lisbon',
                },
                {
                  id: 'website' as const,
                  label: 'Website (optional)',
                  placeholder: 'https://miraandco.shop',
                },
                {
                  id: 'contact' as const,
                  label: 'Contact email',
                  placeholder: 'hello@miraandco.shop',
                },
              ].map((field) => (
                <label key={field.id} className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
                  <span className="font-semibold text-on-surface-variant">
                    {t(`vendorOnboarding.field.${field.id}`, {}, { defaultValue: field.label })}
                  </span>
                  <input
                    type="text"
                    name={field.id}
                    value={form[field.id]}
                    onChange={(e) => updateField(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    data-testid={`vendor-onboarding-${field.id}`}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
                    )}
                  />
                </label>
              ))}
              <label className={cm.cn(cm.stack(1), cm.textSize('sm'), 'md:col-span-2')}>
                <span className="font-semibold text-on-surface-variant">
                  {t('vendorOnboarding.about', {}, { defaultValue: 'Tell us about your shop' })}
                </span>
                <textarea
                  rows={4}
                  name="about"
                  value={form.about}
                  onChange={(e) => updateField('about', e.target.value)}
                  placeholder={t(
                    'vendorOnboarding.aboutPlaceholder',
                    {},
                    { defaultValue: 'Where you make, what you make, why it matters.' },
                  )}
                  data-testid="vendor-onboarding-about"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors resize-none',
                  )}
                />
              </label>
            </div>
          )}

          {step === 'categories' && (
            <div className={cm.cn(cm.stack(4))}>
              <p className={'text-on-surface-variant text-sm'}>
                {t(
                  'vendorOnboarding.categoriesHint',
                  {},
                  { defaultValue: 'Pick everything that fits — you can adjust later.' },
                )}
              </p>
              <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
                {CATEGORIES.map((cat) => {
                  const active = picked.includes(cat.slug)
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => togglePick(cat.slug)}
                      aria-pressed={active}
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.roundedFull,
                        'border transition-colors',
                        active
                          ? 'bg-primary text-on-primary border-primary'
                          : 'border-outline-variant text-on-surface hover:border-primary',
                      )}
                    >
                      {t(`catalog.category.${cat.slug}`, {}, { defaultValue: cat.label })}
                    </button>
                  )
                })}
              </div>
              <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
                <span className="font-semibold text-on-surface-variant">
                  {t(
                    'vendorOnboarding.samplesLabel',
                    {},
                    { defaultValue: 'Sample work — Instagram, portfolio, photos' },
                  )}
                </span>
                <input
                  type="text"
                  placeholder="https://instagram.com/miraandco"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
                  )}
                />
              </label>
            </div>
          )}

          {step === 'payouts' && (
            <div className={cm.cn(cm.stack(4))}>
              <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
                <span className="font-semibold text-on-surface-variant">
                  {t('vendorOnboarding.bankLabel', {}, { defaultValue: 'Bank account / IBAN' })}
                </span>
                <input
                  type="text"
                  name="bankAccount"
                  value={form.bankAccount}
                  onChange={(e) => updateField('bankAccount', e.target.value)}
                  placeholder="GB29 NWBK 6016 1331 9268 19"
                  data-testid="vendor-onboarding-bankAccount"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
                  )}
                />
              </label>
              <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
                <span className="font-semibold text-on-surface-variant">
                  {t('vendorOnboarding.taxIdLabel', {}, { defaultValue: 'Tax ID' })}
                </span>
                <input
                  type="text"
                  name="taxId"
                  value={form.taxId}
                  onChange={(e) => updateField('taxId', e.target.value)}
                  placeholder="EU VAT / IRS EIN"
                  data-testid="vendor-onboarding-taxId"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
                  )}
                />
              </label>
              <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
                <span className="font-semibold text-on-surface-variant">
                  {t('vendorOnboarding.currencyLabel', {}, { defaultValue: 'Settle in currency' })}
                </span>
                <select
                  name="currency"
                  value={form.currency}
                  onChange={(e) => updateField('currency', e.target.value)}
                  data-testid="vendor-onboarding-currency"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
                  )}
                >
                  {['EUR', 'GBP', 'USD', 'BRL', 'INR'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {step === 'review' && (
            <div className={cm.cn(cm.stack(4))}>
              <p className="text-on-surface-variant">
                {t(
                  'vendorOnboarding.reviewBody',
                  {},
                  {
                    defaultValue:
                      'Looks good. We’ll review your shop within 48 hours and send your first payout the Friday after your first sale.',
                  },
                )}
              </p>
              <dl
                className={cm.cn(
                  cm.grid({ cols: 1, gap: 'sm' }),
                  cm.sp('p', 4),
                  'rounded-2xl border border-outline-variant bg-surface-container-low text-sm md:grid-cols-2',
                )}
                data-testid="vendor-onboarding-review-summary"
              >
                {[
                  {
                    key: 'shopName',
                    label: t('vendorOnboarding.field.shopName', {}, { defaultValue: 'Shop name' }),
                    value: form.shopName || '—',
                  },
                  {
                    key: 'tagline',
                    label: t('vendorOnboarding.review.tagline', {}, { defaultValue: 'Tagline' }),
                    value: form.tagline || '—',
                  },
                  {
                    key: 'website',
                    label: t('vendorOnboarding.review.website', {}, { defaultValue: 'Website' }),
                    value: form.website || '—',
                  },
                  {
                    key: 'contact',
                    label: t('vendorOnboarding.review.contact', {}, { defaultValue: 'Contact' }),
                    value: form.contact || '—',
                  },
                  {
                    key: 'categories',
                    label: t(
                      'vendorOnboarding.review.categories',
                      {},
                      { defaultValue: 'Categories' },
                    ),
                    value: picked.length
                      ? picked
                          .map((slug) => {
                            const cat = CATEGORIES.find((c) => c.slug === slug)
                            return t(
                              `catalog.category.${slug}`,
                              {},
                              { defaultValue: cat?.label ?? slug },
                            )
                          })
                          .join(', ')
                      : '—',
                  },
                  {
                    key: 'bankAccount',
                    label: t(
                      'vendorOnboarding.bankLabel',
                      {},
                      { defaultValue: 'Bank account / IBAN' },
                    ),
                    value: form.bankAccount || '—',
                  },
                  {
                    key: 'taxId',
                    label: t('vendorOnboarding.taxIdLabel', {}, { defaultValue: 'Tax ID' }),
                    value: form.taxId || '—',
                  },
                  {
                    key: 'currency',
                    label: t('vendorOnboarding.review.currency', {}, { defaultValue: 'Currency' }),
                    value: form.currency,
                  },
                ].map(({ key, label, value }) => (
                  <div key={key} className={cm.cn(cm.stack(0))}>
                    <dt className="text-on-surface-variant font-semibold">{label}</dt>
                    <dd className="text-on-surface">{value}</dd>
                  </div>
                ))}
              </dl>
              <ul className={cm.cn(cm.stack(2), cm.textSize('sm'), 'text-on-surface-variant')}>
                {[
                  t(
                    'vendorOnboarding.review.point1',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        '{{appName}} takes a flat 8% commission — no listing fees, no hidden charges.',
                    },
                  ),
                  t(
                    'vendorOnboarding.review.point2',
                    {},
                    { defaultValue: 'Payouts settle every Friday in your local currency.' },
                  ),
                  t(
                    'vendorOnboarding.review.point3',
                    {},
                    { defaultValue: 'You can pause your shop or remove it any time.' },
                  ),
                ].map((line) => (
                  <li key={line} className={cm.cn(cm.flex({ align: 'start', gap: 'xs' }))}>
                    <span
                      className="material-symbols-outlined text-success"
                      style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                      aria-hidden
                    >
                      check_circle
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p
              data-testid="vendor-onboarding-error"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl border border-error/40 bg-error-container/30 text-error',
              )}
            >
              {error}
            </p>
          )}
          {submitted && (
            <p
              data-testid="vendor-onboarding-success"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl border border-success/40 bg-success-container/30 text-success',
              )}
            >
              {t(
                'vendorOnboarding.successMessage',
                {},
                {
                  defaultValue:
                    'Application submitted! We will review your shop and email you within 48 hours.',
                },
              )}
            </p>
          )}

          <footer className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
            <button
              type="button"
              onClick={back}
              disabled={idx === 0 || submitting}
              data-testid="vendor-onboarding-back"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'text-on-surface-variant hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              ← {t('common.back', {}, { defaultValue: 'Back' })}
            </button>
            <button
              type="button"
              onClick={advance}
              disabled={submitting || submitted}
              data-testid="vendor-onboarding-advance"
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.roundedFull,
                'bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              {submitting
                ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
                : step === 'review'
                  ? submitted
                    ? t('vendorOnboarding.submittedCta', {}, { defaultValue: 'Submitted' })
                    : t('vendorOnboarding.submitCta', {}, { defaultValue: 'Submit application' })
                  : t('common.continue', {}, { defaultValue: 'Continue' })}
            </button>
          </footer>
        </article>
      </main>
    </div>
  )
}

export default VendorOnboarding
