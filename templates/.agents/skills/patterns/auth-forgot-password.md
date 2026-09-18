---
id: auth-forgot-password
intent: auth-forgot-password
title: Forgot password page wiring
hooks: [useHttpClient, useState]
---

# Forgot password page wiring

**When to use:** one-field form (email only) that triggers a reset-password email.

Molecule's AuthClient does NOT expose a `forgotPassword()` method — `forgotPasswordEndpoint` is a config field only. Call the endpoint directly via `useHttpClient()`:

```tsx
import { useState } from 'react'
import { useHttpClient, useTranslation } from '@molecule/app-react'

export function ForgotPassword() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email')
    } finally {
      setLoading(false)
    }
  }

  if (sent)
    return (
      <p data-mol-id="forgot-sent">
        {t('forgotPassword.sent', {}, { defaultValue: 'Check your email for a reset link.' })}
      </p>
    )
  // ... form with email input + submit
}
```

**Anti-patterns:**

- Don't use `useAuth().forgotPassword` — that method doesn't exist on the auth client. Use `useHttpClient()` + `http.post(endpoint, body)`.
- Don't navigate after success — render the "check your email" state in place.
- Don't require a password field; this form is email-only.
