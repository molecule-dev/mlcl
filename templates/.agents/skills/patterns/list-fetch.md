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

Include every request dependency in the key: filters, page and the viewer
whenever the response can depend on it. The HTTP client sends the session, so
the server may filter or personalize a list per viewer (an inbox, or a
`favorited` flag on a feed that guests can also read), and the cache serves a
key's document to whoever observes it, across sign-in and sign-out. Only an
endpoint that answers every viewer the same takes a viewer-free key. Pass
`null` to `useQuery` while a required input is unresolved or the session is
still being restored (`status === 'loading'`; the HTTP client holds the request
until then anyway), so restoring a session never swaps a key that already
rendered rows. For URL-backed pagination, compose `useListRoute` as in
`pagination.md`; it supplies URL state, not data.

When the route changes the key (a page, filter or view), pass
`keepPreviousData` with the same viewer as `principal`: the rows already on
screen stay until the next key answers (`isPreviousData`), a changed
`principal` drops them at once, and a completed response (including an empty
list) or a failure replaces them:

```tsx
const { status, user } = useAuth<{ id: string }>()
const list = useListRoute({ pageSize: 20 })
const viewer = user ? String(user.id) : 'anonymous'
const query = useQuery(
  status === 'loading'
    ? null
    : {
        key: [http.baseURL, 'messages', viewer, list.page],
        principal: viewer,
        keepPreviousData: true,
        fetch: async (signal: AbortSignal) =>
          unwrapList<Message>(
            await http.get('/api/messages', {
              signal,
              params: { limit: list.pageSize, offset: list.offset },
            }),
          ),
      },
)
```

**Status is not an item.** Render loading, empty and error status outside the
list element, and never give a placeholder the item's class, element shape or
position: a suite (or a person) that reads the list by its item class or by
`:first-child` must find real items only. An empty array from a completed
response is an empty state, not a loading placeholder; while `isPreviousData`
is set the rows belong to the previous key, so show no empty state then.

After a mutation, `getQueryClient().set(key, savedResponse)` publishes the
server's answer and `invalidate(prefix)` marks related reads stale. To retry an
already mounted failed query, call `fetch(options)`; invalidation alone does
not start a request. Avoid a separate loading flag or copied data array.

**Verify:** delay the initial response and assert resource actions are absent
or disabled; release it, click once, and independently check the effect. Keep
cached actions available during refresh, and test failure/retry and an empty list.
Then change page or filter while the next response is delayed: the previous rows
stay until the new ones arrive, and no status placeholder is inside the list.
