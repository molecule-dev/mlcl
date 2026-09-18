import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

const STEPS = ['template', 'parties', 'variables', 'review'] as const
type Step = (typeof STEPS)[number]

export function NewContract() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [step, setStep] = useState<Step>('template')
  const [title, setTitle] = useState('')
  const [template, setTemplate] = useState(params.get('template') ?? '')
  const [counterpartyName, setCounterpartyName] = useState('')
  const [counterpartyEmail, setCounterpartyEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [effective, setEffective] = useState(new Date().toISOString().slice(0, 10))
  const [expires, setExpires] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stepIndex = STEPS.indexOf(step)

  function next() {
    const i = STEPS.indexOf(step)
    if (i < STEPS.length - 1) setStep(STEPS[i + 1])
  }
  function prev() {
    const i = STEPS.indexOf(step)
    if (i > 0) setStep(STEPS[i - 1])
  }

  async function send() {
    if (submitting) return
    setError(null)
    if (!counterpartyName.trim()) {
      setError(
        t('newContract.errCounterparty', {}, { defaultValue: 'Counterparty name is required.' }),
      )
      setStep('parties')
      return
    }
    if (!counterpartyEmail.trim()) {
      setError(t('newContract.errEmail', {}, { defaultValue: 'Signer email is required.' }))
      setStep('parties')
      return
    }
    setSubmitting(true)
    try {
      const amountNumber = amount ? Number(amount) : NaN
      const amountCents = Number.isFinite(amountNumber) ? Math.round(amountNumber * 100) : 0
      const finalTitle =
        title.trim() ||
        (template.trim()
          ? `${template} — ${counterpartyName}`
          : t(
              'newContract.defaultTitle',
              { name: counterpartyName },
              { defaultValue: 'Agreement with {{name}}' },
            ))
      // The API only accepts a UUID template_id (templates created in-app have
      // UUID ids; the Templates page "Use" button passes one via ?template=).
      // Free-text entries still travel in the body_md comment below.
      const trimmedTemplate = template.trim()
      const isTemplateUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmedTemplate,
      )
      const payload = {
        title: finalTitle,
        template_id: isTemplateUuid ? trimmedTemplate : undefined,
        party_name: counterpartyName,
        party_email: counterpartyEmail,
        type: 'msa',
        amount_cents: amountCents,
        currency: 'USD',
        effective_at: effective ? new Date(effective).toISOString() : null,
        expires_at: expires ? new Date(expires).toISOString() : null,
        body_md: template
          ? `<!-- template: ${template} -->\n\n# ${finalTitle}\n\nThis agreement is made between the parties.`
          : `# ${finalTitle}\n\nThis agreement is made between the parties.`,
      }
      const created = await http.post<{ id: string }>('/api/contracts', payload)
      const id = unwrapSingle<{ id: string }>(created)?.id
      navigate(id ? `/contracts/${id}` : '/contracts')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('newContract.failed', {}, { defaultValue: 'Could not create contract.' }),
      )
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto)}>
      <Link to="/contracts" className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}>
        ← {t('newContract.back', {}, { defaultValue: 'Contracts' })}
      </Link>
      <h1
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 4), cm.sp('mb', 6))}
      >
        {t('newContract.heading', {}, { defaultValue: 'New contract' })}
      </h1>

      <ol className={cm.cn(cm.flex({ gap: 'sm', align: 'center' }), cm.sp('mb', 6))}>
        {STEPS.map((s, i) => {
          const isActive = i === stepIndex
          const isDone = i < stepIndex
          return (
            <li key={s} className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className={cm.cn(
                  'h-8 w-8 rounded-full grid place-items-center text-sm',
                  cm.fontWeight('semibold'),
                  isDone
                    ? 'bg-success text-on-primary'
                    : isActive
                      ? 'bg-primary text-on-primary'
                      : cm.cn('bg-surface-container', 'text-on-surface-variant'),
                )}
              >
                {i + 1}
              </span>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  isActive ? cm.fontWeight('semibold') : 'text-on-surface-variant',
                )}
              >
                {t(
                  `newContract.step.${s}`,
                  {},
                  { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                )}
              </span>
              {i < STEPS.length - 1 ? <span className={'w-8 h-px bg-outline-variant'} /> : null}
            </li>
          )
        })}
      </ol>

      <section className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}>
        {step === 'template' && (
          <>
            <h2 className={cm.sectionHeading}>
              {t('newContract.templateHeading', {}, { defaultValue: 'Pick a template' })}
            </h2>
            <Field
              id="newcontract-title"
              label={t('newContract.title', {}, { defaultValue: 'Contract title' })}
              value={title}
              onChange={setTitle}
              placeholder={t(
                'newContract.titlePlaceholder',
                {},
                { defaultValue: 'Master Services Agreement' },
              )}
            />
            <Field
              id="newcontract-template"
              label={t('newContract.templateId', {}, { defaultValue: 'Template ID' })}
              value={template}
              onChange={setTemplate}
              placeholder="tpl_msa_v3"
            />
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'newContract.templateHint',
                {},
                { defaultValue: 'Browse all templates from the /templates page.' },
              )}
            </p>
          </>
        )}
        {step === 'parties' && (
          <>
            <h2 className={cm.sectionHeading}>
              {t('newContract.partiesHeading', {}, { defaultValue: 'Counterparty' })}
            </h2>
            <Field
              id="newcontract-counterparty-name"
              label={t('newContract.counterpartyName', {}, { defaultValue: 'Company name' })}
              value={counterpartyName}
              onChange={setCounterpartyName}
              required
            />
            <Field
              id="newcontract-counterparty-email"
              label={t('newContract.counterpartyEmail', {}, { defaultValue: 'Signer email' })}
              value={counterpartyEmail}
              onChange={setCounterpartyEmail}
              type="email"
              required
            />
          </>
        )}
        {step === 'variables' && (
          <>
            <h2 className={cm.sectionHeading}>
              {t('newContract.variablesHeading', {}, { defaultValue: 'Contract variables' })}
            </h2>
            <Field
              id="newcontract-amount"
              label={t('newContract.amount', {}, { defaultValue: 'Amount ($)' })}
              type="number"
              value={amount}
              onChange={setAmount}
            />
            <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
              <Field
                id="newcontract-effective"
                label={t('newContract.effective', {}, { defaultValue: 'Effective date' })}
                type="date"
                value={effective}
                onChange={setEffective}
              />
              <Field
                id="newcontract-expires"
                label={t('newContract.expires', {}, { defaultValue: 'Expiration date' })}
                type="date"
                value={expires}
                onChange={setExpires}
              />
            </div>
          </>
        )}
        {step === 'review' && (
          <>
            <h2 className={cm.sectionHeading}>
              {t('newContract.reviewHeading', {}, { defaultValue: 'Review' })}
            </h2>
            <dl className={cm.cn('space-y-2', cm.textSize('sm'))}>
              <Row
                label={t('newContract.review.template', {}, { defaultValue: 'Template' })}
                value={template || '—'}
              />
              <Row
                label={t('newContract.review.counterparty', {}, { defaultValue: 'Counterparty' })}
                value={counterpartyName || '—'}
              />
              <Row
                label={t('newContract.review.signer', {}, { defaultValue: 'Signer' })}
                value={counterpartyEmail || '—'}
              />
              <Row
                label={t('form.amount', {}, { defaultValue: 'Amount' })}
                value={amount ? `$${amount}` : '—'}
              />
              <Row
                label={t('newContract.review.dates', {}, { defaultValue: 'Effective → Expires' })}
                value={`${effective} → ${expires || '—'}`}
              />
            </dl>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant',
                cm.sp('pt', 3),
                'border-t border-outline-variant',
              )}
            >
              {t(
                'newContract.reviewNote',
                {},
                {
                  defaultValue:
                    'Sending will email a signing link to the counterparty and create the contract in Pending status.',
                },
              )}
            </p>
          </>
        )}
      </section>

      {error ? (
        <p
          role="alert"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.sp('mt', 4),
            cm.textSize('sm'),
            'rounded-lg bg-error/10 text-error font-semibold',
          )}
        >
          {error}
        </p>
      ) : null}

      <div className={cm.cn(cm.flex({ justify: 'between' }), cm.sp('mt', 6))}>
        <button
          type="button"
          onClick={prev}
          disabled={stepIndex === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('medium'),
            'border border-outline rounded-md hover:bg-surface-container disabled:opacity-30',
          )}
        >
          {t('common.back', {}, { defaultValue: 'Back' })}
        </button>
        {stepIndex < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md',
            )}
          >
            {t('newContract.nextCta', {}, { defaultValue: 'Next' })}
          </button>
        ) : (
          <button
            type="button"
            onClick={send}
            disabled={submitting}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {submitting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('newContract.sendCta', {}, { defaultValue: 'Send for signature' })}
          </button>
        )}
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
}: {
  id?: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  placeholder?: string
}) {
  const cm = getClassMap()
  return (
    <label className="block" htmlFor={id}>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'center', justify: 'between' })}>
      <dt className={'text-on-surface-variant'}>{label}</dt>
      <dd className={cm.fontWeight('medium')}>{value}</dd>
    </div>
  )
}
