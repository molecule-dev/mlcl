---
id: list-fetch
intent: list-fetch
title: Fetch a list from the API and render cards/items
hooks: [useHttpClient, useEffect, useState]
---

# List fetch + render

**When to use:** any page that shows a repeated card / row / tile of the same entity (posts, bots, tickets, users, etc.).

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { unwrapList } from '@molecule/app-http'
import { useHttpClient } from '@molecule/app-react'

interface Post {
  id: string
  title: string
  excerpt?: string
  publishedAt?: string
  status?: string
}

export function PostList() {
  const http = useHttpClient()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    http
      .get<Post[]>('/api/posts')
      // unwrapList normalizes both a bare array and a `{ data: [...] }` envelope.
      .then((res) => active && setPosts(unwrapList<Post>(res)))
      .catch((err) => active && setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [http])

  if (loading) return <p>Loading…</p>
  if (error) return <p role="alert">{error}</p>
  if (!posts.length) return <p>No posts yet.</p>

  return (
    <ul>
      {posts.map((post) => (
        <Link key={post.id} to={`/post/${post.id}`} className="contents">
          <PostCard post={post} />
        </Link>
      ))}
    </ul>
  )
}
```

**Anti-patterns:**

- Don't skip the `active` flag — unmounted components setting state leaks warnings.
- Don't render the card unwrapped — wrap in `<Link to="/detail/:id">` so the whole card is clickable.
- Don't hardcode the first page of items; always `.map` the fetched state.
- Use `className="contents"` on the Link so it doesn't change the card's visual layout.
