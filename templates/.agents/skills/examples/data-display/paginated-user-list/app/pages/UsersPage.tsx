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
    setLoading(true)
    setLoadFailed(false)
    http
      .get<UsersResponse>(`/users?page=${page}&limit=${PAGE_SIZE}`)
      .then((res) => setData(res.data))
      .catch(() => {
        // Without this catch the rejection escapes the effect AND `data`
        // stays null, so the page renders as a bare header forever.
        setLoadFailed(true)
      })
      .finally(() => setLoading(false))
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
