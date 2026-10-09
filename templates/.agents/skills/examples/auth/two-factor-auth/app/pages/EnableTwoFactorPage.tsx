import { type FormEvent, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

// QRImageUrl is returned directly by the API (generated server-side by @molecule/api-two-factor).
type EnrollResponse = {
  secret: string
  keyUrl: string
  QRImageUrl: string
  recoveryCodes: string[]
}

export function EnableTwoFactorPage() {
  const { t } = useTranslation()
  const [enrollment, setEnrollment] = useState<EnrollResponse | null>(null)
  const [code, setCode] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startEnroll(): Promise<void> {
    setEnrolling(true)
    setError(null)
    // Every failure path clears the busy flag — a rejected enroll fetch
    // (offline, server restart) must not leave the click handler rejecting
    // into the void with a button that just looks dead.
    try {
      const res = await fetch('/api/2fa/enroll', { method: 'POST' })
      if (!res.ok) {
        setError(t('totp.enrollFailed', undefined, { defaultValue: 'Could not enroll' }))
        return
      }
      const body = (await res.json()) as EnrollResponse
      setEnrollment(body)
    } catch (_error) {
      setError(t('totp.enrollFailed', undefined, { defaultValue: 'Could not enroll' }))
    } finally {
      setEnrolling(false)
    }
  }

  async function verify(e: FormEvent): Promise<void> {
    e.preventDefault()
    setVerifying(true)
    setError(null)
    // finally clears the busy state on EVERY path — a rejected fetch (offline,
    // server restart) must not leave the button disabled forever.
    try {
      const res = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!res.ok) {
        setError(t('totp.wrongCode', undefined, { defaultValue: 'Wrong code — try again' }))
        return
      }
      setEnabled(true)
    } catch (_error) {
      setError(t('totp.networkError', undefined, { defaultValue: 'Network error — try again' }))
    } finally {
      setVerifying(false)
    }
  }

  if (enabled) {
    return (
      <div className={cm.flex({ direction: 'col', gap: 'md' })}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('totp.enabledTitle', undefined, { defaultValue: 'Two-factor authentication enabled' })}
        </h2>
        <p>
          {t('totp.savedCodes', undefined, {
            defaultValue:
              'Make sure you saved your recovery codes — you will need them if you lose your phone.',
          })}
        </p>
      </div>
    )
  }

  if (!enrollment) {
    return (
      <div className={cm.flex({ direction: 'col', gap: 'md' })}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('totp.title', undefined, { defaultValue: 'Enable two-factor authentication' })}
        </h2>
        <p>
          {t('totp.intro', undefined, {
            defaultValue: 'Add a second factor to protect your account.',
          })}
        </p>
        <button
          onClick={startEnroll}
          disabled={enrolling}
          className={cm.button({ variant: 'solid' })}
        >
          {enrolling
            ? t('totp.starting', undefined, { defaultValue: 'Starting…' })
            : t('totp.start', undefined, { defaultValue: 'Get started' })}
        </button>
        {error ? <p className={cm.cn('text-error')}>{error}</p> : null}
      </div>
    )
  }

  return (
    <form onSubmit={verify} className={cm.flex({ direction: 'col', gap: 'md' })}>
      <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
        {t('totp.scanTitle', undefined, { defaultValue: 'Scan with your authenticator app' })}
      </h2>
      {enrollment.QRImageUrl ? (
        <img src={enrollment.QRImageUrl} alt="" width={200} height={200} />
      ) : null}
      <p className={cm.textSize('sm')}>
        {t('totp.manualEntry', undefined, {
          defaultValue: "Can't scan? Enter this code manually:",
        })}
        <code className={cm.cn(cm.textSize('sm'), 'font-mono')}>{enrollment.secret}</code>
      </p>
      <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('totp.recoveryTitle', undefined, { defaultValue: 'Save your recovery codes' })}
      </h3>
      <ul>
        {enrollment.recoveryCodes.map((c) => (
          <li key={c}>
            <code>{c}</code>
          </li>
        ))}
      </ul>
      <p className={cm.cn(cm.textSize('sm'), 'text-warning')}>
        {t('totp.recoveryWarning', undefined, {
          defaultValue: 'These will not be shown again. Each code works once.',
        })}
      </p>
      <input
        autoFocus
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder={t('totp.codePlaceholder', undefined, { defaultValue: '6-digit code' })}
        className={cm.input({})}
      />
      {error ? <p className={cm.cn('text-error')}>{error}</p> : null}
      <button
        type="submit"
        disabled={verifying || code.length !== 6}
        className={cm.button({ variant: 'solid' })}
      >
        {verifying
          ? t('totp.verifying', undefined, { defaultValue: 'Verifying…' })
          : t('totp.verify', undefined, { defaultValue: 'Verify and enable' })}
      </button>
    </form>
  )
}
