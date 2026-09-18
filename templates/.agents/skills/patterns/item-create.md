---
id: item-create
intent: item-create
title: Create an entity via POST
hooks: [useHttpClient, useNavigate, useState]
---

# Item create (POST)

**When to use:** "New Post" / "Create Bot" / "Add Item" forms. Usually a route like `/posts/new` or `/bots/new`.

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useHttpClient } from '@molecule/app-react'

export function PostEditor() {
  const http = useHttpClient()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePublish() {
    setSaving(true)
    setError(null)
    try {
      const created = await http.post<{ id: string }>('/api/posts', {
        title,
        body,
        status: 'published',
      })
      navigate(`/post/${created.data.id}`) // http.post returns HttpResponse — the body is on .data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDraft() {
    setSaving(true)
    setError(null)
    try {
      await http.post('/api/posts', { title, body, status: 'draft' })
      navigate('/posts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }
  // ... controlled inputs + two buttons (Publish + Save Draft) + error display
}
```

**Anti-patterns:**

- Don't reuse the same handler for Publish and Save Draft — they call different endpoints or send different `status` values.
- Don't reset the form after a failed save — preserve the user's input.
