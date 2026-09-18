import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface WatchlistAddModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function WatchlistAddModal({ open, onClose, onSuccess }: WatchlistAddModalProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [symbol, setSymbol] = useState('')
  const [direction, setDirection] = useState<'above' | 'below' | ''>('')
  const [thresholdDollars, setThresholdDollars] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSymbol('')
    setDirection('')
    setThresholdDollars('')
    setError(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!symbol.trim()) {
      setError(t('watchlist.modal.errSymbol', {}, { defaultValue: 'Symbol is required.' }))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = { symbol: symbol.trim().toUpperCase() }
      if (direction && thresholdDollars) {
        payload.alert_direction = direction
        payload.alert_threshold_cents = Math.round(Number(thresholdDollars) * 100)
      }
      await http.post('/api/watchlist', payload)
      onSuccess?.()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(
        msg || t('watchlist.modal.errGeneric', {}, { defaultValue: 'Could not add to watchlist.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

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
        aria-labelledby="watchlist-modal-title"
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
            <h3
              id="watchlist-modal-title"
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
            >
              {t('watchlist.modal.title', {}, { defaultValue: 'Track ticker' })}
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
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'block',
                  cm.sp('mb', 1),
                  'uppercase tracking-wide text-on-surface-variant',
                )}
              >
                {t('watchlist.modal.symbol', {}, { defaultValue: 'Symbol' })}
              </span>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="NVDA"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none',
                )}
              />
            </label>

            <fieldset className="space-y-2">
              <legend
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wide text-on-surface-variant',
                )}
              >
                {t('watchlist.modal.alert', {}, { defaultValue: 'Alert when price (optional)' })}
              </legend>
              <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
                {(
                  [
                    {
                      value: '',
                      label: t('watchlist.modal.alertNone', {}, { defaultValue: 'No alert' }),
                    },
                    {
                      value: 'above',
                      label: t('watchlist.modal.alertAbove', {}, { defaultValue: '≥ above' }),
                    },
                    {
                      value: 'below',
                      label: t('watchlist.modal.alertBelow', {}, { defaultValue: '≤ below' }),
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDirection(opt.value as 'above' | 'below' | '')}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'rounded-md border',
                      direction === opt.value
                        ? 'bg-primary-container text-primary-dark border-primary/40'
                        : 'border-outline-variant text-on-surface-variant hover:bg-surface-container',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {direction ? (
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={thresholdDollars}
                  onChange={(e) => setThresholdDollars(e.target.value)}
                  placeholder={t(
                    'watchlist.modal.thresholdPlaceholder',
                    {},
                    { defaultValue: 'Threshold in $ (e.g. 150.00)' },
                  )}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none',
                  )}
                />
              ) : null}
            </fieldset>

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
                : t('watchlist.modal.save', {}, { defaultValue: 'Track' })}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
