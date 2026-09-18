import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Account {
  id: string
  name: string
  kind: string
  last4: string
  available_cents: number
}

interface Recipient {
  id: string
  name: string
  routing: string // last 4
  account_last4: string
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function Transfers() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [from, setFrom] = useState<string>('')
  const [toType, setToType] = useState<'account' | 'recipient'>('account')
  const [to, setTo] = useState<string>('')
  const [amount, setAmount] = useState<string>('100.00')
  const [memo, setMemo] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Bump on every toggle click so re-clicking the already-active option
  // still produces an observable DOM change.
  const [toTypeTick, setToTypeTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/accounts').catch(() => null),
      http.get('/api/recipients').catch(() => null),
    ])
      .then(([aRes, rRes]) => {
        if (cancelled) return
        const a = unwrapList<Account>(aRes)
        setAccounts(a)
        setRecipients(unwrapList<Recipient>(rRes))
        if (a.length > 0 && !from) setFrom(a[0].id)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('transfers.loadError', {}, { defaultValue: 'Failed to load accounts.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, from])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const cents = Math.round(Number(amount || '0') * 100)
      if (!from || !to) {
        setSubmitError(
          t(
            'transfers.errorMissingFields',
            {},
            {
              defaultValue: 'Choose a source account and a destination.',
            },
          ),
        )
        return
      }
      if (cents <= 0) {
        setSubmitError(
          t('transfers.errorAmount', {}, { defaultValue: 'Amount must be greater than zero.' }),
        )
        return
      }

      const body: Record<string, unknown> = {
        from_account_id: from,
        amount_cents: cents,
        description: memo || undefined,
      }
      if (toType === 'account') body.to_account_id = to
      else body.recipient_id = to
      try {
        await http.post('/api/transfers', body)
      } catch (err) {
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : t(
                'transfers.errorGeneric',
                {},
                {
                  defaultValue: 'Could not submit the transfer.',
                },
              )
        setSubmitError(message)
        return
      }
      // Refresh balances after a successful POST so the form's "available"
      // hint reflects the new ledger immediately.
      await http.get('/api/accounts').catch(() => null)
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 2500)
    } finally {
      setSubmitting(false)
    }
  }

  const fromAccount = accounts.find((a) => a.id === from)

  return (
    <div
      data-mol-id="page-transfers"
      data-to-type-tick={toTypeTick}
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}
    >
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {t('transfers.heading', {}, { defaultValue: 'Move money' })}
      </h1>
      <p
        data-mol-id="transfers-status"
        role="status"
        aria-live="polite"
        className={cm.cn(
          cm.textSize('sm'),
          cm.sp('mb', 6),
          submitted ? 'text-success' : submitting ? 'text-on-surface-variant' : cm.textMuted,
        )}
      >
        {submitting
          ? t('transfers.statusSubmitting', {}, { defaultValue: 'Submitting transfer…' })
          : submitted
            ? t(
                'transfers.statusSubmitted',
                {},
                { defaultValue: 'Transfer scheduled. We will email a receipt.' },
              )
            : t(
                'transfers.statusIdle',
                {},
                { defaultValue: 'Pick an account, amount, and recipient to move money.' },
              )}
      </p>
      {submitError ? (
        <p
          data-mol-id="transfers-error"
          role="alert"
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mb', 4),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'bg-error-container text-on-error-container rounded-md max-w-2xl',
          )}
        >
          {submitError}
        </p>
      ) : null}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <form
          onSubmit={submit}
          className={cm.cn(cm.card(), cm.sp('p', 6), cm.maxW('2xl'), 'space-y-5')}
        >
          <Field label={t('transfers.fromLabel', {}, { defaultValue: 'From' })}>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full border border-outline-variant rounded-md',
              )}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (•••• {a.last4}) — {fmt(a.available_cents)} available
                </option>
              ))}
            </select>
          </Field>

          <div>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.sp('mb', 2))}>
              {t('transfers.toTypeLabel', {}, { defaultValue: 'Send to' })}
            </p>
            <div className={cm.flex({ gap: 'sm' })}>
              {(['account', 'recipient'] as const).map((opt) => {
                const isActive = toType === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setToType(opt)
                      setTo('')
                      setToTypeTick((n) => n + 1)
                    }}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      cm.roundedFull,
                      isActive
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface',
                    )}
                  >
                    {t(
                      `transfers.toType.${opt}`,
                      {},
                      { defaultValue: opt === 'account' ? 'Another account' : 'A recipient' },
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <Field label={t('transfers.toLabel', {}, { defaultValue: 'To' })}>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full border border-outline-variant rounded-md',
              )}
            >
              <option value="">
                {t('transfers.toPlaceholder', {}, { defaultValue: 'Select…' })}
              </option>
              {toType === 'account'
                ? accounts
                    .filter((a) => a.id !== from)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (•••• {a.last4})
                      </option>
                    ))
                : recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — •••• {r.account_last4}
                    </option>
                  ))}
            </select>
          </Field>

          <Field label={t('form.amount', {}, { defaultValue: 'Amount' })}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center' }),
                'border border-outline-variant rounded-md overflow-hidden',
              )}
            >
              <span
                className={cm.cn(cm.sp('px', 3), cm.fontWeight('semibold'), 'bg-surface-container')}
              >
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'flex-1 outline-none tabular-nums',
                )}
              />
            </div>
            {fromAccount ? (
              <p className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 1))}>
                {t(
                  'transfers.availableHint',
                  { amount: fmt(fromAccount.available_cents) },
                  { defaultValue: '{{amount}} available' },
                )}
              </p>
            ) : null}
          </Field>

          <Field label={t('transfers.memoLabel', {}, { defaultValue: 'Memo (optional)' })}>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={t(
                'transfers.memoPlaceholder',
                {},
                { defaultValue: 'Rent, ACH-12345, etc.' },
              )}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full border border-outline-variant rounded-md',
              )}
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'w-full bg-primary text-on-primary rounded-md hover:bg-primary-hover disabled:opacity-50',
            )}
          >
            {submitting
              ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
              : submitted
                ? t('transfers.submitted', {}, { defaultValue: 'Transfer scheduled ✓' })
                : t(
                    'transfers.submit',
                    { amount: amount ? fmt(Math.round(Number(amount) * 100)) : '—' },
                    { defaultValue: 'Schedule transfer · {{amount}}' },
                  )}
          </button>
        </form>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      {children}
    </label>
  )
}
