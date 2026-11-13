---
id: item-detail-fetch
intent: item-detail-fetch
title: Load the current route's entity before rendering its actions
hooks: [useParams, QueryContent, useQuery, useHttpClient, useTranslation]
---

# Single-item detail fetch

**When to use:** a detail page that receives `:id` from its route. The React
scaffold wires the query provider; keep the resource and its readiness in that
query rather than separate local data/loading state.

```tsx
import { Link, useParams } from 'react-router'
import { unwrapSingle } from '@molecule/app-http'
import { QueryContent, useQuery } from '@molecule/app-query-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'

interface Post {
  id: string
  title: string
  body: string
}

export function PostDetail() {
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const { t } = useTranslation()
  const options = {
    key: [http.baseURL, 'post', id],
    fetch: async (signal: AbortSignal) =>
      unwrapSingle<Post>(
        await http.get<Post>(`/posts/${encodeURIComponent(id ?? '')}`, { signal }),
      ),
  }
  const query = useQuery(id ? options : null)
  if (!id) return <p>{t('posts.notFound', undefined, { defaultValue: 'Post not found.' })}</p>
  return (
    <QueryContent
      query={query}
      pending={<p role="status">{t('common.loading', undefined, { defaultValue: 'Loading…' })}</p>}
      missing={<p>{t('posts.notFound', undefined, { defaultValue: 'Post not found.' })}</p>}
      error={() => (
        <div role="alert">
          <p>{t('posts.loadFailed', undefined, { defaultValue: 'Unable to load this post.' })}</p>
          <button type="button" onClick={() => void query.refetch()}>
            {t('common.retry', undefined, { defaultValue: 'Retry' })}
          </button>
        </div>
      )}
    >
      {(post) => (
        <article>
          {query.isFetching ? (
            <p role="status">
              {t('common.refreshing', undefined, { defaultValue: 'Refreshing…' })}
            </p>
          ) : null}
          <h1>{post.title}</h1>
          <p>{post.body}</p>
          <Link to={`/posts/${encodeURIComponent(post.id)}/edit`}>
            {t('posts.edit', undefined, { defaultValue: 'Edit post' })}
          </Link>
        </article>
      )}
    </QueryContent>
  )
}
```

The edit control and every resource-dependent control belong inside the
`QueryContent` child, which receives the loaded `post`. Do not
render an enabled action on the first paint with a handler that returns while
the resource is missing: the early click is lost. Cached data stays visible
and actionable during refresh. A key change observes the new key's state;
include all identity inputs in that key, including the viewer for personalized
responses. A boundary given old data cannot discover a missing key dependency.

`null` is a loaded missing record; `undefined` is not yet loaded. Check those
explicitly rather than treating valid `0` or `false` data as missing in other
resource shapes. Use the error/retry and empty states above instead of rendering
a placeholder action. Strings and fallbacks remain owned by the app's i18n.

Thread the loaded object through every child that renders it; do not leave
static placeholder text beside the real fetched record. To publish a mutation,
set its saved server response into this query key and invalidate related keys.

**Verify:** hold the GET response, attempt the resource action, and assert it is
unavailable. Release the response, perform one action and check its real effect.
Then change `:id` while the next GET is pending: no old record action should
remain. Also exercise cached/background refresh, failure/retry and missing data.

## Actions shared across viewer roles

Ownership adds editing controls. Keep actions available to every viewer in the
`DetailHeader` common-actions slot. Put only role-specific controls in `actions`.
The loaded record still comes from the `QueryContent` child above. The app owns
permissions, translated labels and the callbacks.

```tsx
import { DetailHeader } from '@molecule/app-detail-header-react'

export function RecordHeader({
  record,
  canEdit,
  labels,
  onSave,
  onEdit,
}: {
  record: { id: string; title: string }
  canEdit: boolean
  labels: { save: string; edit: string }
  onSave: (id: string) => void
  onEdit: (id: string) => void
}) {
  return (
    <DetailHeader
      title={record.title}
      commonActions={
        <button type="button" onClick={() => onSave(record.id)}>
          {labels.save}
        </button>
      }
      actions={
        canEdit ? (
          <button type="button" onClick={() => onEdit(record.id)}>
            {labels.edit}
          </button>
        ) : null
      }
    />
  )
}
```

Verify the shared action once as an owner and once as another viewer. Check the
server effect each time. A permission that actually forbids an action still
belongs in the app's policy and server authorization.
