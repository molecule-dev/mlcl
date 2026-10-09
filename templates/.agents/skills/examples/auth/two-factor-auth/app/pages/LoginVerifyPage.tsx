import { type FormEvent, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

// Shown after the password step returns `{ twoFactorRequired: true }` (2FA is enabled
// on the account). Completes login by verifying the 6-digit TOTP code, then lands the
// user in. The password alone did NOT create a session — the second factor does.
export function LoginVerifyPage() {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/login/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    setSubmitting(false)
    if (!res.ok) {
      // 401 = wrong code. Surface a retry counter so the user knows attempts are limited
      // (the verify endpoint is rate-limited to ≤5/min to prevent brute force).
      setAttempts((n) => n + 1)
      setError(t('totp.wrongCode', undefined, { defaultValue: 'Wrong code — try again' }))
      return
    }
    // Second factor accepted — the session is now fully authenticated.
    window.location.href = '/'
  }

  return (
    <form onSubmit={submit} className={cm.flex({ direction: 'col', gap: 'md' })}>
      <h1 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
        {t('totp.loginTitle', undefined, { defaultValue: 'Enter your authentication code' })}
      </h1>
      <p className={cm.textSize('sm')}>
        {t('totp.loginIntro', undefined, {
          defaultValue: 'Open your authenticator app and enter the 6-digit code for this account.',
        })}
      </p>
      <input
        data-mol-id="totp-login-code"
        autoFocus
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder={t('totp.codePlaceholder', undefined, { defaultValue: '6-digit code' })}
        className={cm.input({})}
      />
      {error ? (
        <p className={cm.cn('text-error')}>
          {error}
          {attempts > 0
            ? ` ${t('totp.attempts', { count: attempts }, { defaultValue: '({{count}} failed attempts)' })}`
            : ''}
        </p>
      ) : null}
      <button
        type="submit"
        data-mol-id="totp-login-submit"
        disabled={submitting || code.length !== 6}
        className={cm.button({ variant: 'solid' })}
      >
        {submitting
          ? t('totp.verifying', undefined, { defaultValue: 'Verifying…' })
          : t('totp.continue', undefined, { defaultValue: 'Continue' })}
      </button>
    </form>
  )
}
