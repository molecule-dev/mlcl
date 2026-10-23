---
id: item-create
intent: item-create
title: Create an entity via POST
hooks: [useAuth, useAuthClient, useHttpClient, useNavigate, useTranslation, useState]
---

# Item create (POST)

**When to use:** "New Post" / "Create Bot" / "Add Item" forms. Usually a route like `/posts/new` or `/bots/new`.

This executable example is for a signed-in creation route. It uses the scaffold's bonded auth client and existing `AuthGuard`; the form mounts after the initial session decision. The HTTP auth gate (`whenRestored()`) protects requests, while the route guard protects handlers that would otherwise mistake pending restoration for an anonymous visitor.

```tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth, useAuthClient, useHttpClient, useTranslation } from '@molecule/app-react'
import { AuthGuard } from '@molecule/app-ui-react'

export function PostEditor() {
  const auth = useAuthClient()
  const { status, isAuthenticated, state } = useAuth()
  const { t } = useTranslation()
  if (status === 'unavailable' && !isAuthenticated) {
    return (
      <div role="alert">
        {t('auth.restoreUnavailable', undefined, {
          defaultValue: 'Your session could not be checked.',
        })}
        <button
          type="button"
          disabled={state.loading || !auth.validateSession}
          onClick={() => void auth.validateSession?.()}
        >
          {t('common.retry', undefined, { defaultValue: 'Retry' })}
        </button>
      </div>
    )
  }
  return (
    <AuthGuard>
      <PostEditorForm />
    </AuthGuard>
  )
}

function PostEditorForm() {
  const auth = useAuthClient()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  async function save(status: 'published' | 'draft') {
    const revision = auth.getSessionRevision?.()
    const ownsCompletion = () =>
      mounted.current &&
      auth.getState().authenticated &&
      (revision === undefined || auth.getSessionRevision?.() === revision)
    setSaving(true)
    setError(null)
    try {
      const created = await http.post<{ id: string }>('/api/posts', { title, body, status })
      if (!ownsCompletion()) return
      navigate(status === 'published' ? `/post/${created.data.id}` : '/posts')
    } catch (err) {
      if (ownsCompletion())
        setError(
          err instanceof Error
            ? err.message
            : t('post.saveFailed', undefined, { defaultValue: 'Save failed' }),
        )
    } finally {
      if (mounted.current) setSaving(false)
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void save('published')
      }}
    >
      <label>
        {t('post.title', undefined, { defaultValue: 'Title' })}
        <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        {t('post.body', undefined, { defaultValue: 'Body' })}
        <textarea name="body" value={body} onChange={(event) => setBody(event.target.value)} />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>
        {t('post.publish', undefined, { defaultValue: 'Publish' })}
      </button>
      <button type="button" disabled={saving} onClick={() => void save('draft')}>
        {t('post.saveDraft', undefined, { defaultValue: 'Save draft' })}
      </button>
    </form>
  )
}
```

`http.post` returns `HttpResponse`; its body is on `.data`. Publish and Save Draft send distinct status values. A failed save keeps the typed input. Completion ownership follows the built-in auth client's session revision, so a logout, login or account replacement cannot navigate from an earlier session's pending save. The mounted check also rejects completions after leaving the form. Custom providers without `getSessionRevision` retain the mounted/authenticated checks; supply that existing capability for replacement ownership that survives a batched logout/login.

**Verify:** hold session restoration, try to publish, then release it and submit once. The pending state must send no mutation and must not redirect to login. An anonymous visitor redirects; an unavailable restore stays retryable. Log out or replace the session while a save is pending, then resolve it and verify that it cannot navigate the new session.
