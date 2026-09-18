import { useState, type FormEvent } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-react'

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
    const res = await fetch('/api/users/log-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? t('auth.failed', {}, { defaultValue: 'Login failed' }))
      return
    }
    window.location.href = '/'
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
