/**
 * UsersPage — paginated user list with PaginationBar.
 *
 * Pattern for any paginated list: fetch with useHttpClient, render rows,
 * mount <PaginationBar /> at the bottom. URL query state lives in
 * useState here for simplicity; in production you may want to sync to
 * URL params via @molecule/app-routing so deep-links work.
 */
import { useEffect, useState } from 'react'

import { PaginationBar } from '@molecule/app-pagination-bar-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface User {
  id: string
  name: string
  email: string
  created_at: string
}

interface UsersResponse {
  data: User[]
  total: number
  page: number
  limit: number
}

/**
 * Whether a row is a user the list can render without lying: `id` is the row
 * key and `name`/`email` render verbatim — a shrunken rewrite's row objects
 * otherwise render `undefined`s in a list that still looks authoritative. The
 * same per-row gate the markdown-blog index applies to its posts.
 */
const isUser = (row: unknown): row is User =>
  typeof row === 'object' &&
  row !== null &&
  typeof (row as User).id === 'string' &&
  typeof (row as User).name === 'string' &&
  typeof (row as User).email === 'string'

const PAGE_SIZE = 20

export default function UsersPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  /**
   * The last page envelope that LOADED (its `total` and `limit`) — what the
   * paginator needs to stay usable after a page request fails.
   *
   * The failed page's rows are dropped (see the catch below: they belong to the
   * page the user LEFT), and the paginator used to be gated on `data`, so it was
   * unmounted with them: the error text said "try again" over a page that had no
   * control left to retry with and no way back to the page that had just loaded,
   * while `page` stayed at the page that failed. Only a browser reload recovered.
   * The envelope survives the failure — it describes the LIST, not the page that
   * failed to arrive — so the paginator keeps rendering and `page` stays
   * navigable, and the retry control below re-requests the failed page.
   */
  const [pageInfo, setPageInfo] = useState<{ total: number; limit: number } | null>(null)
  // Bumped by the retry control: the load effect keys on it, which is what makes
  // a failed page request retryable at all (every other dep is unchanged when the
  // user retries the same page).
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    // A page change starts a NEW request while the previous one may still be in
    // flight (two quick "Next" clicks). Without this guard the LATE response
    // wins: the older page's rows land after the newer page's, so the table
    // shows page 2 while the paginator reads page 3 — and the stale response's
    // `.finally` clears `loading` for the request the user is still waiting on.
    let cancelled = false
    setLoading(true)
    setLoadFailed(false)
    // `/api/users` — the app router is mounted at `/api` (templates/api/server.ts.tpl:
    // `app.use('/api', router)`) and the handler registers at `router.use('/users', …)`,
    // so the browser path needs the prefix. The client's default baseURL is `''`
    // (nothing bonds '/api'), and the dev server proxies only `/api` and `/health`:
    // a bare `/users` is answered with the SPA's index.html, the client's JSON parse
    // falls back to that HTML, and `data.data.map` throws on render. The README's
    // `GET /users?page=1&limit=20` is the router-relative path, not the browser one.
    http
      .get<UsersResponse>(`/api/users?page=${page}&limit=${PAGE_SIZE}`)
      .then((res) => {
        if (cancelled) return
        // A 2xx proves the route ANSWERED, not that the body is a page: an
        // endpoint with no fixture answers 200 with an empty object, and a proxy
        // can rewrite a failure into a 200. Installed unvalidated, `data.data`
        // was undefined and `data.data.map` threw during render — a blank page
        // instead of the retryable failure this state exists for. `total`/`limit`
        // are coerced the same way: the paginator divides by `limit` and compares
        // against `total`, and `undefined` there is a NaN page count.
        const body = (res?.data ?? {}) as Partial<UsersResponse>
        if (!Array.isArray(body.data)) {
          setLoadFailed(true)
          setData(null)
          return
        }
        // …and every ROW must be a user — `[{ … }]` passes the array check and
        // the list below renders `undefined` names and emails as if they were
        // real rows.
        if (!body.data.every(isUser)) {
          setLoadFailed(true)
          setData(null)
          return
        }
        const limit = typeof body.limit === 'number' && body.limit > 0 ? body.limit : PAGE_SIZE
        const total = typeof body.total === 'number' ? body.total : body.data.length
        setData({
          data: body.data,
          total,
          limit,
          page: typeof body.page === 'number' ? body.page : page,
        })
        setPageInfo({ total, limit })
      })
      .catch(() => {
        // Without this catch the rejection escapes the effect AND `data`
        // stays null, so the page renders as a bare header forever.
        if (cancelled) return
        setLoadFailed(true)
        // The rows on screen belong to the page the user LEFT: `data` is only
        // ever written by a resolved request, and this one did not resolve, so
        // keeping it rendered the previous page's rows under the new page
        // number (`PaginationBar page={page}`) — a list contradicting the
        // paginator, with the error text above it. A failed page has no rows to
        // show, so none are shown.
        setData(null)
        // `pageInfo` is deliberately NOT cleared — see its comment: the
        // paginator and the page number must survive the failure, or the reader
        // is stranded on a page with no control left to move off it.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, page, reloadKey])

  const totalPages = pageInfo ? Math.max(1, Math.ceil(pageInfo.total / pageInfo.limit)) : 1

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 6))}>
      <h1 className={cm.cn(cm.fontWeight('bold'), cm.textSize('2xl'))}>
        {t('users.title', {}, { defaultValue: 'Users' })}
      </h1>

      {loading && <p>{t('users.loading', {}, { defaultValue: 'Loading…' })}</p>}

      {loadFailed && !loading ? (
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <p className={cm.textError}>
            {t('users.loadFailed', {}, { defaultValue: 'Could not load users — try again.' })}
          </p>
          {/* The control the message promises: without it a failed page left the
              reader with nothing to click (see `pageInfo`). */}
          <button
            type="button"
            data-mol-id="users-retry"
            onClick={() => {
              setLoading(true)
              setLoadFailed(false)
              setReloadKey((k) => k + 1)
            }}
            className={cm.button({ variant: 'outline', size: 'sm' })}
          >
            {t('users.retry', {}, { defaultValue: 'Try again' })}
          </button>
        </div>
      ) : null}

      {data && (
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {data.data.map((user) => (
            <li
              key={user.id}
              className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('py', 2))}
            >
              <span className={cm.fontWeight('medium')}>{user.name}</span>
              <span className={cm.textSize('sm')}>{user.email}</span>
            </li>
          ))}
        </ul>
      )}

      {pageInfo && pageInfo.total > pageInfo.limit && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          pageSize={pageInfo.limit}
          total={pageInfo.total}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
