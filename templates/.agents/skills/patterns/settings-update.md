---
id: settings-update
intent: form-submit
title: Settings / profile update form
hooks: [useHttpClient, useAuth, useState, useEffect]
---

# Settings update (PATCH /api/users/:id)

**When to use:** the `Settings` screen and any profile / preferences page that reads current user data and persists changes.

```tsx
import { useEffect, useState } from 'react'
import { useAuth, useHttpClient } from '@molecule/app-react'

export function Settings() {
  const { user } = useAuth()
  const http = useHttpClient()
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setBio((user as any).bio || '')
    }
  }, [user])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      // The molecule user resource updates via PATCH /api/users/:id — NOT PUT /api/user.
      await http.patch(`/api/users/${(user as { id: string }).id}`, { name, bio })
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    if (user) {
      setName(user.name || '')
      setBio((user as any).bio || '')
    }
  }
  // ... controlled inputs + Save / Cancel buttons. Show "Saved" badge when savedAt is recent.
}
```

**Anti-patterns:**

- Don't forget to hydrate from `user` on mount.
- Don't leave Cancel unwired — it resets to current `user` values.
