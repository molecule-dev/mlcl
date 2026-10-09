import { type FormEvent, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

export function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      const res = await fetch('/api/users/log-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? t('auth.failed', {}, { defaultValue: 'Login failed' }))
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
      <input
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'Email' })}
        className={cm.input({})}
      />
      <input
        type="password"
        autoComplete="current-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t('login.passwordPlaceholder', {}, { defaultValue: 'Password' })}
        className={cm.input({})}
      />
      {error ? <p className={cm.textError}>{error}</p> : null}
      <button type="submit" disabled={submitting} className={cm.button({ variant: 'solid' })}>
        {submitting
          ? t('login.submitting', {}, { defaultValue: 'Logging in…' })
          : t('login.submit', {}, { defaultValue: 'Log in' })}
      </button>
    </form>
  )
}
