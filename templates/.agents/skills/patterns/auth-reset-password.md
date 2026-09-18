---
id: auth-reset-password
intent: auth-reset-password
title: Reset password page wiring
hooks: [useHttpClient, useNavigate, useSearchParams, useState]
---

# Reset password page wiring

**When to use:** lands from the email link with `?token=...` in the URL; user sets a new password.

Like forgot-password, molecule's AuthClient exposes the endpoint only as config — call it directly:

```tsx
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useHttpClient, useTranslation } from '@molecule/app-react'

export function ResetPassword() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('resetPassword.mismatch', {}, { defaultValue: 'Passwords do not match' }))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/reset-password', { token, password })
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }
  // ... two password inputs + submit
}
```

**Anti-patterns:**

- Don't use `useAuth().resetPassword` — that method doesn't exist on the auth client. Use `useHttpClient()` + `http.post(endpoint, body)`.
- Don't hardcode the token — always read it from URL params.
- Don't skip the password-confirmation check.
