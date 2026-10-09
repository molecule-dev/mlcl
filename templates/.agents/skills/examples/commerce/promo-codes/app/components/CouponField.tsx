import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Result =
  | { state: 'idle' }
  | { state: 'applied'; code: string; percentOff?: number; amountOff?: number }
  | { state: 'error'; reason: string }

export function CouponField({ onApply }: { onApply: (code: string | null) => void }) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [result, setResult] = useState<Result>({ state: 'idle' })
  const [busy, setBusy] = useState(false)

  async function apply(): Promise<void> {
    setBusy(true)
    // finally clears the busy state on EVERY path — a rejected fetch (offline,
    // server restart, a non-JSON error body) must not leave the button
    // disabled forever.
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        valid?: boolean
        reason?: string
        percent_off?: number
        amount_off?: number
      }
      if (!res.ok || !body.valid) {
        setResult({
          state: 'error',
          reason: body.reason ?? t('coupons.invalid', undefined, { defaultValue: 'Invalid code' }),
        })
        onApply(null)
        return
      }
      setResult({
        state: 'applied',
        code,
        percentOff: body.percent_off,
        amountOff: body.amount_off,
      })
      onApply(code)
    } catch (_error) {
      setResult({
        state: 'error',
        reason: t('coupons.invalid', undefined, { defaultValue: 'Invalid code' }),
      })
      onApply(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
      <div className={cm.flex({ direction: 'row', gap: 'sm' })}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t('coupons.placeholder', undefined, { defaultValue: 'Promo code' })}
          className={cm.cn(cm.input(), cm.flex1)}
        />
        <button
          onClick={apply}
          disabled={busy || code.length === 0}
          className={cm.button({ variant: 'outline' })}
        >
          {busy
            ? t('coupons.applying', undefined, { defaultValue: 'Applying…' })
            : t('coupons.apply', undefined, { defaultValue: 'Apply' })}
        </button>
      </div>
      {result.state === 'applied' ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-success')}>
          {result.percentOff
            ? t(
                'coupons.appliedPercent',
                { code: result.code, percent: result.percentOff },
                {
                  defaultValue: '{{code}} applied — {{percent}}% off',
                },
              )
            : t(
                'coupons.appliedAmount',
                { code: result.code, amount: ((result.amountOff ?? 0) / 100).toFixed(2) },
                {
                  defaultValue: '{{code}} applied — ${{amount}} off',
                },
              )}
        </p>
      ) : null}
      {result.state === 'error' ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{result.reason}</p>
      ) : null}
    </div>
  )
}
