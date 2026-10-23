---
id: list-fetch
intent: list-fetch
title: Fetch a list from the shared query cache and render ready items
hooks: [useQuery, useHttpClient, useTranslation]
---

# List fetch + render

**When to use:** a page showing repeated cards, rows or tiles from an API.
The React scaffold wires the query provider. `useQuery` keeps one request per
key, returns cached data immediately, and observes retries and saved responses.

```tsx
import { Link } from 'react-router'
import { unwrapList } from '@molecule/app-http'
import { getQueryClient } from '@molecule/app-query'
import { useQuery } from '@molecule/app-query-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'

interface Post {
  id: string
  title: string
  excerpt?: string
}

export function PostList() {
  const http = useHttpClient()
  const { t } = useTranslation()
  const options = {
    key: [http.baseURL, 'posts'],
    fetch: async (signal: AbortSignal) =>
      unwrapList<Post>(await http.get<Post[]>('/posts', { signal })),
  }
  const query = useQuery(options)
  const posts = query.data

  if (posts === undefined) {
    if (query.status === 'error') {
      return (
        <div role="alert">
          <p>{t('posts.loadFailed', undefined, { defaultValue: 'Unable to load posts.' })}</p>
          <button
            type="button"
            onClick={() => {
              void getQueryClient()
                .fetch(options)
                .catch((_error) => {
                  // useQuery exposes the retry failure through status/error.
                })
            }}
          >
            {t('common.retry', undefined, { defaultValue: 'Retry' })}
          </button>
        </div>
      )
    }
    return <p role="status">{t('common.loading', undefined, { defaultValue: 'Loading…' })}</p>
  }
  if (posts.length === 0) {
    return <p>{t('posts.empty', undefined, { defaultValue: 'No posts yet.' })}</p>
  }

  return (
    <section>
      {query.isFetching ? (
        <p role="status">{t('common.refreshing', undefined, { defaultValue: 'Refreshing…' })}</p>
      ) : null}
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <Link to={`/posts/${encodeURIComponent(post.id)}`}>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

Render item actions inside the branch with actual data. A visible enabled
button whose handler returns on missing data loses the first click. Loading
and failed initial requests have no resource action; an empty array is a loaded
empty state. Cached items stay actionable during a background refresh.

Include every request dependency in the key: filters, page and the signed-in
principal when the response depends on the viewer. Pass `null` to `useQuery`
while a required input or session is unresolved. For URL-backed pagination,
compose `useListRoute` as in `pagination.md`; it supplies URL state, not data.

After a mutation, `getQueryClient().set(key, savedResponse)` publishes the
server's answer and `invalidate(prefix)` marks related reads stale. To retry an
already mounted failed query, call `fetch(options)`; invalidation alone does
not start a request. Avoid a separate loading flag or copied data array.

**Verify:** delay the initial response and assert resource actions are absent
or disabled; release it, click once, and independently check the effect. Keep
cached actions available during refresh, and test failure/retry and an empty list.
