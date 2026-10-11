import { type ReactElement, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Result =
  | { state: 'idle' }
  | { state: 'applied'; code: string; percentOff?: number; amountOff?: number }
  | { state: 'error'; reason: string }

export function CouponField({ onApply }: { onApply: (code: string | null) => void }): ReactElement {
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
      // The endpoint's VERDICT on a code is a 4xx carrying `{ valid: false,
      // reason }` (coupons.ts answers 400 / 404 / 409 / 410 that way) — the only
      // answer that is a judgement about the code.
      if (!res.ok && body.valid === false) {
        setResult({
          state: 'error',
          reason: body.reason ?? t('coupons.invalid', undefined, { defaultValue: 'Invalid code' }),
        })
        onApply(null)
        return
      }
      if (!res.ok || body.valid !== true) {
        // Anything else — a 5xx, a 2xx whose body is not the endpoint's answer
        // (an unmocked route answers 200 `{}`), a rewritten response — means the
        // code was NOT judged. Reported as "Invalid code" it blamed the reader
        // for a failure that was not theirs, and `onApply(null)` threw away a
        // coupon they already had applied.
        setResult({
          state: 'error',
          reason: t('coupons.checkFailed', undefined, {
            defaultValue: 'Could not check that code — try again.',
          }),
        })
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
      // A rejected fetch (offline, server restart) never reached a verdict
      // either — so the coupon is NOT cleared and the code is not blamed.
      setResult({
        state: 'error',
        reason: t('coupons.checkFailed', undefined, {
          defaultValue: 'Could not check that code — try again.',
        }),
      })
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
