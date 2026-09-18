---
id: item-detail-fetch
intent: item-detail-fetch
title: Fetch a single entity by ID from the URL
hooks: [useParams, useHttpClient, useEffect, useState]
---

# Single-item detail fetch

**When to use:** detail pages (`PostDetail`, `BotEditor`, `TicketDetail`) that receive `:id` via the route.

```tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { unwrapSingle } from '@molecule/app-http'
import { useHttpClient } from '@molecule/app-react'

interface Post {
  id: string
  title: string
  body: string
}

export function PostDetail() {
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let active = true
    http
      .get<Post>(`/api/posts/${id}`)
      // unwrapSingle pulls the entity off the HttpResponse (handles `.data` + envelopes), returns Post | null.
      .then((res) => active && setPost(unwrapSingle<Post>(res)))
      .catch(() => active && navigate('/'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id, http, navigate])

  if (loading) return <p>Loading…</p>
  if (!post) return null
  // ... render post.title, post.body — every hardcoded string in the
  // stitch baseline should be replaced by post.field or sensible fallbacks.
}
```

**IMPORTANT:** After wiring the fetch, walk every child component this detail
page renders (`PostDetailHero`, `PostDetailContent`, etc.) and either

- pass `post` down as a prop and replace their hardcoded text/image/date
  values with `post.*` references, OR
- move the fetch into the specific section that needs it.

Do NOT leave the parent fetching `post` but children still rendering
stitch's static text — that's the most common "looks wired but isn't" bug.

**Anti-patterns:**

- Don't forget to 404 / redirect on fetch failure.
- Don't put the fetch in a parent and then forget to thread `post` down to children.
- Don't leave fallback stitch text unwrapped in defaults; pass `item.title ?? 'Untitled'` so the real data shows when present.
