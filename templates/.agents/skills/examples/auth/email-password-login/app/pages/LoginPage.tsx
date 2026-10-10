import { type FormEvent, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

export function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  // An account with 2FA enabled does NOT get a session from the first POST: the
  // user resource's logIn handler answers `206 { twoFactorRequired: true }` with
  // no credential cookie, and the caller must POST the SAME credentials back
  // with a `twoFactorToken` to finish logging in. Two things follow, and the
  // first is a security bug if missed — `res.ok` is TRUE for 206 (any 2xx), so a
  // plain `if (!res.ok) … else redirect` treated the challenge as a success and
  // navigated to `/` without a session: the second factor was silently never
  // asked for, and the request that DID log the user in never happened.
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    // @molecule/api-resource-user mounts login at /api/users/log-in (via
    // mountDefaultUserAuthRoutes) — NOT /api/login. `credentials: 'include'` so the
    // httpOnly session cookie the server sets is stored for subsequent requests.
    // finally clears the busy state on EVERY path — a rejected fetch (offline,
    // server restart) must not leave the button disabled forever.
    try {
      // The credentials stay in state across the challenge, so the second POST
      // carries them again — the framework mints no session (and no pending-login
      // handle) between the two halves of the flow.
      const credentials: { email: string; password: string; twoFactorToken?: string } = {
        email,
        password,
      }
      const token = twoFactorCode.trim()
      if (token) credentials.twoFactorToken = token

      const res = await fetch('/api/users/log-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        twoFactorRequired?: boolean
      }

      // The 2FA challenge. Both signals are honoured: the documented 206 status
      // and the body flag (so a proxy that rewrites the status keeps the flow).
      // NO session exists yet — stay on the form and collect the code.
      if (res.status === 206 || body.twoFactorRequired === true) {
        setTwoFactorRequired(true)
        return
      }

      if (!res.ok) {
        setError(
          body.error ??
            (twoFactorRequired
              ? t('login.twoFactorInvalid', {}, { defaultValue: 'Wrong code — try again' })
              : t('auth.failed', {}, { defaultValue: 'Login failed' })),
        )
        return
      }
      window.location.href = '/'
    } catch (_error) {
      setError(t('auth.networkError', {}, { defaultValue: 'Network error — try again' }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.maxW('sm'))}
      style={cm.sp({ p: 6 })}
    >
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t('login.title', {}, { defaultValue: 'Log in' })}
      </h1>
      {twoFactorRequired ? (
        <>
          <p className={cm.textMuted}>
            {t(
              'login.twoFactorIntro',
              {},
              {
                defaultValue: 'Enter the 6-digit code from your authenticator app.',
              },
            )}
          </p>
          <input
            id="login-two-factor-code"
            data-mol-id="login-two-factor-code"
            autoFocus
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
            placeholder={t('login.twoFactorPlaceholder', {}, { defaultValue: '123456' })}
            className={cm.input({})}
          />
        </>
      ) : (
        <>
          <input
            id="login-email"
            data-mol-id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'Email' })}
            className={cm.input({})}
          />
          <input
            id="login-password"
            data-mol-id="login-password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('login.passwordPlaceholder', {}, { defaultValue: 'Password' })}
            className={cm.input({})}
          />
        </>
      )}
      {error ? <p className={cm.textError}>{error}</p> : null}
      <button
        type="submit"
        data-mol-id="login-submit"
        disabled={submitting || (twoFactorRequired && twoFactorCode.length !== 6)}
        className={cm.button({ variant: 'solid' })}
      >
        {submitting
          ? t('login.submitting', {}, { defaultValue: 'Logging in…' })
          : twoFactorRequired
            ? t('login.twoFactorSubmit', {}, { defaultValue: 'Verify and log in' })
            : t('login.submit', {}, { defaultValue: 'Log in' })}
      </button>
    </form>
  )
}
