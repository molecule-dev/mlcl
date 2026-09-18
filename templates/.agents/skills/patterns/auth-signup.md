---
id: auth-signup
intent: auth-signup
title: Signup page wiring
hooks: [useAuth, useNavigate, useState]
---

# Signup page wiring

**When to use:** any page that creates a new account. Nearly identical to login but calls `signup` and may include a name/confirm-password field.

Molecule's auth client exposes `register` (not `signup`) — it's the same operation, different word. Use `register`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth, useTranslation } from '@molecule/app-react'

export function Signup() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register({ name, email, password })
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.failed', {}, { defaultValue: 'Signup failed' }),
      )
    } finally {
      setLoading(false)
    }
  }
  // ... preserve stitch JSX, controlled inputs, disabled submit, render error
}
```

**Anti-patterns:**

- Don't use `useAuth().signup` — that property doesn't exist. The method is `register`.
- Don't reuse Login's hook (`useAuth().login`) — this screen MUST call `register`.
- Don't forget the "Already have an account? Sign in" link — it should go to `/login`
