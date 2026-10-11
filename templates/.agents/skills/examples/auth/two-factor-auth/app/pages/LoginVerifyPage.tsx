import { type FormEvent, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

/**
 * What the login form must hand this page. The framework mints NO session (and
 * no pending-login handle) when it answers a 2FA challenge — the retry is the
 * SAME `POST /users/log-in` with the credentials AND the code — so the second
 * half of the flow has to carry them, as PROPS on the route element:
 *
 *   const res = await fetch('/api/users/log-in', { method: 'POST', …,
 *     body: JSON.stringify({ email, password }) })
 *   if (res.status === 206) navigate('/login/verify', {
 *     state: { email, password }, // …then read it in the route element:
 *   })
 *   // <Route path="/login/verify" element={
 *   //   <LoginVerifyPage email={location.state.email} password={location.state.password} />
 *   // } />
 *
 * This component reads PROPS only — it never calls `useLocation()` itself, so
 * router state alone will not reach it: pass the values down from the route
 * element or the credentials are dropped and every verify fails 403.
 */
export interface LoginVerifyPageProps {
  /** The email submitted on the password step. */
  email: string
  /** The password submitted on the password step. */
  password: string
}

// Completes a login whose password step returned `206 { twoFactorRequired: true }`
// (2FA is enabled on the account): the code is sent back to the SAME endpoint that
// issued the challenge, together with the credentials, and only a 200 issues the
// session. There is no `/login/verify` endpoint to POST to — the framework's
// log-in route (@molecule/api-resource-user, mounted at `/api/users/log-in`) is
// the only one that accepts a `twoFactorToken`, and it needs the credentials
// alongside it because the challenge created no session to attach a bare code to.
export function LoginVerifyPage({ email, password }: LoginVerifyPageProps) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    // finally clears the busy state on EVERY path — a rejected fetch (offline,
    // server restart) must not leave the button disabled forever.
    try {
      const res = await fetch('/api/users/log-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, twoFactorToken: code.trim() }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        twoFactorRequired?: boolean
      }
      // The challenge can still stand on a 2xx: `res.ok` is true for ANY 2xx
      // (206 `{ twoFactorRequired: true }` is the documented no-session
      // answer), and a proxy/edge that rewrites that status to 200 keeps the
      // body flag as the only signal — the same pair email-password-login's
      // LoginPage honours. Treating it as a completed login redirected with no
      // session and never verified the second factor.
      if (res.status === 206 || body.twoFactorRequired === true) {
        setAttempts((n) => n + 1)
        setError(body.error ?? t('totp.wrongCode', undefined, { defaultValue: 'Wrong code' }))
        return
      }
      if (res.ok) {
        // Second factor accepted — the session is now fully authenticated.
        window.location.href = '/'
        return
      }
      if (res.status === 401 || res.status === 403) {
        // Wrong/expired/replayed code. Surface a retry counter so the user knows
        // attempts are limited (the log-in route's auth rate limit is 10 attempts
        // per 15 minutes per account — `rateLimitAuth`'s defaults; the 5-per-window
        // limit belongs to the two-factor enrolment route, not this one).
        setAttempts((n) => n + 1)
        setError(
          body.error ?? t('totp.wrongCode', undefined, { defaultValue: 'Wrong code — try again' }),
        )
        return
      }
      // Anything else (429 throttled, 5xx) is NOT a wrong code — say what it is
      // rather than telling the user to retype a code that was probably fine.
      setError(
        body.error ??
          t('totp.networkError', undefined, { defaultValue: 'Network error — try again' }),
      )
    } catch (_error) {
      setError(t('totp.networkError', undefined, { defaultValue: 'Network error — try again' }))
    } finally {
      setSubmitting(false)
    }
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
        <p className={cm.cn(cm.textError)}>
          {error}
          {attempts > 0
            ? ` ${t('totp.attempts', { count: attempts }, { defaultValue: '(failed attempts: {{count}})' })}`
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
