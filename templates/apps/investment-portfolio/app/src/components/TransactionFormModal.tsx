import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TransactionFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  defaultSymbol?: string
  defaultKind?: 'buy' | 'sell'
}

export function TransactionFormModal({
  open,
  onClose,
  onSuccess,
  defaultSymbol = '',
  defaultKind = 'buy',
}: TransactionFormModalProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [kind, setKind] = useState<'buy' | 'sell'>(defaultKind)
  const [symbol, setSymbol] = useState(defaultSymbol)
  const [shares, setShares] = useState('')
  const [price, setPrice] = useState('')
  const [fees, setFees] = useState('')
  const [account, setAccount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setKind(defaultKind)
    setSymbol(defaultSymbol)
    setShares('')
    setPrice('')
    setFees('')
    setAccount('')
    setError(null)
  }, [open, defaultSymbol, defaultKind])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const sharesNum = Number(shares)
    const priceNum = Number(price)
    const feesNum = fees ? Number(fees) : 0
    if (!symbol.trim()) {
      setError(t('tx.errSymbol', {}, { defaultValue: 'Symbol is required.' }))
      return
    }
    if (!Number.isFinite(sharesNum) || sharesNum <= 0) {
      setError(t('tx.errShares', {}, { defaultValue: 'Shares must be a positive number.' }))
      return
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError(t('tx.errPrice', {}, { defaultValue: 'Price must be a positive number.' }))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await http.post('/api/transactions', {
        symbol: symbol.trim().toUpperCase(),
        kind,
        shares: sharesNum,
        price_per_share: priceNum,
        fees: feesNum,
        account: account.trim() || undefined,
      })
      void track({
        name: 'transaction.logged',
        properties: { symbol: symbol.trim().toUpperCase(), kind, shares: sharesNum },
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || t('tx.errGeneric', {}, { defaultValue: 'Could not save transaction.' }))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 4),
        'fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm',
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-modal-title"
        className={cm.cn(cm.w('full'), cm.maxW('md'))}
      >
        <form
          onSubmit={handleSubmit}
          className={cm.cn(
            cm.w('full'),
            'bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/40',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 6),
              cm.sp('py', 5),
              'border-b border-outline-variant',
            )}
          >
            <h3 id="tx-modal-title" className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {t(
                `tx.modal.${kind}Title`,
                {},
                {
                  defaultValue: kind === 'buy' ? 'Record buy' : 'Record sell',
                },
              )}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close', {}, { defaultValue: 'Close' })}
              className={cm.cn(cm.sp('p', 2), 'rounded-md hover:bg-surface-container')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </header>

          <div className={cm.cn(cm.sp('p', 6), 'space-y-4')}>
            <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
              {(['buy', 'sell'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-md border',
                    kind === k
                      ? k === 'buy'
                        ? 'bg-success/15 text-success border-success/40'
                        : 'bg-error/15 text-error border-error/40'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-container',
                  )}
                >
                  {t(`tx.modal.${k}`, {}, { defaultValue: k === 'buy' ? 'Buy' : 'Sell' })}
                </button>
              ))}
            </div>

            <Field
              label={t('tx.modal.symbol', {}, { defaultValue: 'Symbol' })}
              value={symbol}
              onChange={setSymbol}
              placeholder="AAPL"
              readOnly={Boolean(defaultSymbol)}
              uppercase
            />
            <div className={cm.grid({ cols: 2, gap: 'sm' })}>
              <Field
                label={t('tx.modal.shares', {}, { defaultValue: 'Shares' })}
                type="number"
                value={shares}
                onChange={setShares}
                placeholder="10"
              />
              <Field
                label={t('tx.modal.price', {}, { defaultValue: 'Price per share ($)' })}
                type="number"
                value={price}
                onChange={setPrice}
                placeholder="213.80"
              />
            </div>
            <div className={cm.grid({ cols: 2, gap: 'sm' })}>
              <Field
                label={t('tx.modal.fees', {}, { defaultValue: 'Fees ($)' })}
                type="number"
                value={fees}
                onChange={setFees}
                placeholder="0.00"
              />
              <Field
                label={t('settings.account', {}, { defaultValue: 'Account' })}
                value={account}
                onChange={setAccount}
                placeholder="Fidelity"
              />
            </div>

            {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}
          </div>

          <footer
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'end', gap: 'sm' }),
              cm.sp('px', 6),
              cm.sp('py', 4),
              'border-t border-outline-variant bg-surface-container/40',
            )}
          >
            <button
              type="button"
              onClick={onClose}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('tx.modal.save', {}, { defaultValue: 'Save transaction' })}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'number' | 'email'
  placeholder?: string
  readOnly?: boolean
  uppercase?: boolean
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  readOnly,
  uppercase,
}: FieldProps) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'block',
          cm.sp('mb', 1),
          'text-on-surface-variant uppercase tracking-wide',
        )}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md bg-surface-container-lowest',
          readOnly
            ? 'opacity-70 cursor-not-allowed'
            : 'focus:ring-2 focus:ring-primary/20 outline-none',
        )}
        step={type === 'number' ? 'any' : undefined}
        min={type === 'number' ? 0 : undefined}
      />
    </label>
  )
}
