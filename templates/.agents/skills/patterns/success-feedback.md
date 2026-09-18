---
id: success-feedback
intent: form-submit
title: Surface success state after a submit
hooks: [useState, useEffect]
---

# Success feedback

**When to use:** any form or action that completes without navigating away (Save button on Settings, Favorite toggle, Subscribe). The user must see confirmation.

**Three patterns** — pick the one that fits the screen:

**1. Inline "Saved" badge (preferred for settings-style forms):**

```tsx
const [savedAt, setSavedAt] = useState<number | null>(null)

async function handleSave() {
  await http.put('/api/settings', body)
  setSavedAt(Date.now())
}

useEffect(() => {
  if (savedAt === null) return
  const t = setTimeout(() => setSavedAt(null), 2500)
  return () => clearTimeout(t)
}, [savedAt])

// Badge next to the Save button:
{
  savedAt && <span className="text-success text-xs">Saved</span>
}
```

**2. Navigate on success (preferred for create/publish actions):**

```tsx
const created = await http.post<{ id: string }>('/api/posts', data)
navigate(`/post/${created.data.id}`) // http.post returns HttpResponse — the body is on .data
```

**3. Full-screen confirmation (preferred for one-off actions like forgot-password):**

```tsx
if (sent) return <p>Check your email for a reset link.</p>
// else render form
```

**Anti-patterns:**

- Don't rely on the user clicking "Save" and just trusting that it worked.
- Don't show success state before the `await` resolves.
- Don't leave the success UI on screen forever — auto-hide after 2-3 seconds.
