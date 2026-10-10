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

const PAGE_SIZE = 20

export default function UsersPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

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
        if (!cancelled) setData(res.data)
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
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, page])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 6))}>
      <h1 className={cm.cn(cm.fontWeight('bold'), cm.textSize('2xl'))}>
        {t('users.title', {}, { defaultValue: 'Users' })}
      </h1>

      {loading && <p>{t('users.loading', {}, { defaultValue: 'Loading…' })}</p>}

      {loadFailed && !loading ? (
        <p className={cm.textError}>
          {t('users.loadFailed', {}, { defaultValue: 'Could not load users — try again.' })}
        </p>
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

      {data && data.total > data.limit && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          pageSize={data.limit}
          total={data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
