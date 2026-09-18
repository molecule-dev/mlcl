---
id: form-validation
intent: form-submit
title: Validate form inputs before submit
hooks: [useState]
---

# Client-side form validation

**When to use:** every form that sends user-supplied data. Validation runs before the HTTP call, shows per-field errors, and disables the submit button while invalid.

```tsx
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
const [submitting, setSubmitting] = useState(false)

function validate() {
  const next: typeof errors = {}
  if (!email) next.email = t('validation.emailRequired', {}, { defaultValue: 'Email required' })
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = 'Enter a valid email'
  if (!password) next.password = 'Password required'
  else if (password.length < 8) next.password = 'At least 8 characters'
  return next
}

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  const v = validate()
  setErrors(v)
  if (Object.keys(v).length > 0) return
  setSubmitting(true)
  try {
    await submit({ email, password })
    // ... navigate / show success
  } catch (err) {
    setErrors({ form: err instanceof Error ? err.message : 'Submission failed' })
  } finally {
    setSubmitting(false)
  }
}

// UI:
;<input
  value={email}
  onChange={(e) => {
    setEmail(e.target.value)
    setErrors((er) => ({ ...er, email: undefined }))
  }}
  aria-invalid={!!errors.email}
/>
{
  errors.email && (
    <p role="alert" className="text-error text-xs">
      {errors.email}
    </p>
  )
}
```

**Anti-patterns:**

- Don't only validate on submit — clear the per-field error on change so the user sees success before re-submit.
- Don't hardcode English validation messages; use `t(key, {}, { defaultValue })`.
- Don't allow submit while `submitting` — set `disabled={submitting || Object.keys(errors).length > 0}`.
