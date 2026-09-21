import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const CONDITIONS = [
  { value: 'above', defaultLabel: 'Price above' },
  { value: 'below', defaultLabel: 'Price below' },
  { value: '24h_change_above', defaultLabel: '24h change ≥ %' },
  { value: 'volume_spike', defaultLabel: '24h volume above' },
] as const

export function AlertNew() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  // "Set alert" on a coin-detail page deep-links here with ?symbol=BTC.
  const [searchParams] = useSearchParams()
  const [symbol, setSymbol] = useState((searchParams.get('symbol') ?? '').toUpperCase())
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]['value']>('above')
  const [threshold, setThreshold] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const target = Number(threshold)
      if (Number.isNaN(target)) {
        setError(t('alertNew.thresholdInvalid', {}, { defaultValue: 'Enter a valid number.' }))
        setSubmitting(false)
        return
      }
      await http.post('/api/alerts', {
        symbol: symbol.trim().toLowerCase(),
        condition,
        target_price: target,
        channels: ['email'],
        repeat: 'one-time',
      })
      void track({
        name: 'alert.created',
        properties: { symbol: symbol.trim().toLowerCase(), condition, target_price: target },
      })
      navigate('/alerts')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message || t('alertNew.error', {}, { defaultValue: 'Could not create alert.' }))
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto)}>
      <Link to="/alerts" className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}>
        ← {t('nav.alerts', {}, { defaultValue: 'Alerts' })}
      </Link>
      <h1
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 4), cm.sp('mb', 6))}
      >
        {t('alertNew.heading', {}, { defaultValue: 'New alert' })}
      </h1>

      <form onSubmit={onSubmit} className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}>
        <label className="block">
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('alertNew.symbol', {}, { defaultValue: 'Coin (symbol)' })}
          </span>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="BTC"
            required
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md uppercase',
            )}
          />
        </label>

        <label className="block">
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('alertNew.condition', {}, { defaultValue: 'Condition' })}
          </span>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as (typeof CONDITIONS)[number]['value'])}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
            )}
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {t(`alertNew.condition.${c.value}`, {}, { defaultValue: c.defaultLabel })}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('alertNew.threshold', {}, { defaultValue: 'Threshold' })}
          </span>
          <input
            type="number"
            step="any"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            required
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md tabular-nums',
            )}
          />
        </label>

        {error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}>{error}</p>
        ) : null}

        <div className={cm.cn(cm.flex({ gap: 'sm', justify: 'end' }), cm.sp('pt', 2))}>
          <Link
            to="/alerts"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              'border border-outline rounded-md hover:bg-surface-container',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {submitting
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('alertNew.createCta', {}, { defaultValue: 'Create alert' })}
          </button>
        </div>
      </form>
    </div>
  )
}
