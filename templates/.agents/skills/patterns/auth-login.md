---
id: auth-login
intent: auth-login
title: Login page wiring
hooks: [useAuth, useNavigate, useState]
---

# Login page wiring

**When to use:** any page that signs an existing user into the app via email/password.

**Molecule-correct example** — copy hook calls, state shape, and error handling verbatim. Preserve your existing JSX (inputs, buttons, layout); only ADD the controlled-input props + `onSubmit` + conditional error / loading rendering:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth, useTranslation } from '@molecule/app-react'

export function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('login.failed', {}, { defaultValue: 'Login failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* preserve the stitch inputs, but make them controlled: */}
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p data-mol-id="login-error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading
          ? t('login.submitting', {}, { defaultValue: 'Signing in…' })
          : t('login.submit', {}, { defaultValue: 'Sign in' })}
      </button>
    </form>
  )
}
```

**Anti-patterns:**

- Don't hardcode user-visible strings — use `t('key', {}, { defaultValue: 'English' })`
- Don't use native `alert()`; render the error inside the form
- Don't navigate before `await login(...)` resolves
