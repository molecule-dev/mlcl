// Phase 1 baseline — verbatim JSX of design-blog-post-list.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { useListRoute } from '@molecule/app-routing-react-router'
import { getClassMap } from '@molecule/app-ui'

import AppShell from '../components/AppShell.js'
import PostListFilterBar from '../components/PostListFilterBar.js'
import PostListHeader from '../components/PostListHeader.js'
import PostListItem from '../components/PostListItem.js'
import PostListPagination from '../components/PostListPagination.js'

interface Post {
  id: string
  title?: string
  status?: string
  excerpt?: string
  description?: string
  body?: string
  content?: string
  views?: number | string
  comments?: number | string
  commentCount?: number | string
  publishedAt?: string
  date?: string
  createdAt?: string
}

function PostList() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { status } = useAuth()
  // The list's page, status filter and search live in the URL
  // (?page=, ?status=, ?q=) via useListRoute — no mirrored state, so a
  // page-2 link, Back/Forward and a reload all keep their view.
  const listRoute = useListRoute({
    pageSize: 20,
    filters: { q: {} },
    selections: {
      all: { path: '/posts', query: { status: undefined }, requiresAuth: true },
      published: { path: '/posts', query: { status: 'published' }, requiresAuth: true },
      draft: { path: '/posts', query: { status: 'draft' }, requiresAuth: true },
      scheduled: { path: '/posts', query: { status: 'scheduled' }, requiresAuth: true },
    },
    defaultSelection: 'all',
    auth: { status, redirectTo: '/login' },
  })
  // Honor deep links like /posts?status=draft (Dashboard quick actions).
  const activeFilter = listRoute.selection ?? 'all'
  const searchQuery = listRoute.filters.q ?? ''
  const page = listRoute.page
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  // Reload counter — incrementing this re-fires the loading effect even
  // when filter/search/page are unchanged, ensuring every user gesture
  // produces an observable network request.
  const [reloadKey, setReloadKey] = useState(0)
  const http = useHttpClient()
  useEffect(() => {
    if (!listRoute.canLoad) return
    let active = true
    setLoading(true)
    setError(null)
    // /posts/mine/all returns the authenticated user's posts including
    // drafts and scheduled — the dashboard view of "my posts". The
    // public /posts endpoint hardcodes status=published and would
    // never return drafts even with ?status=draft.
    const params = new URLSearchParams()
    if (activeFilter !== 'all') params.set('status', activeFilter)
    params.set('page', String(page))
    params.set('limit', String(listRoute.pageSize))
    params.set('include_total', 'true')
    http
      .get<Post[] | { data: Post[]; total?: number }>(`/api/posts/mine/all?${params}`)
      .then((res) => {
        if (!active) return
        const body = res.data
        const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []
        const filtered = searchQuery
          ? list.filter((p) =>
              [p.title, p.excerpt, p.content]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(searchQuery.toLowerCase()),
            )
          : list
        setPosts(filtered)
        setTotal(
          !Array.isArray(body) && typeof body?.total === 'number' ? body.total : filtered.length,
        )
      })
      .catch(
        (err: unknown) =>
          active &&
          setError(
            err instanceof Error
              ? err.message
              : t('postList.loadError', {}, { defaultValue: 'Failed to load posts' }),
          ),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [activeFilter, searchQuery, page, reloadKey, http, t, listRoute.pageSize, listRoute.canLoad])
  // PostListItem performs the DELETE request itself (and reports its own
  // failures); this callback only reconciles the list state. It used to
  // issue a SECOND delete — which 404'd and surfaced a bogus error banner
  // after every successful row delete.
  const handleDelete = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
    setTotal((prev) => Math.max(0, prev - 1))
  }
  return (
    <AppShell
      title={t('topNavBar.articles', {}, { defaultValue: 'Articles' })}
      contentClassName={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.stack(10),
        cm.surface,
        cm.sp('px', 4),
        'md:px-12 pt-6 md:pt-8 pb-8',
      )}
    >
      {/* Header Section */}
      <PostListHeader />
      {/* Filters & Search */}
      <PostListFilterBar
        activeFilter={activeFilter}
        onFilterChange={(f) => {
          // A selection resets the page atomically, including a repeated tab.
          if (f === 'all' || f === 'published' || f === 'draft' || f === 'scheduled')
            listRoute.select(f)
          setReloadKey((k) => k + 1)
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          listRoute.setFilters({ q: q || undefined }, { replace: true })
          setReloadKey((k) => k + 1)
        }}
        totalCount={total}
      />
      {/* Post List (Tonal Layering Layout) */}
      <section className={cm.flex1}>
        <div className={cm.flex({ direction: 'col' })}>
          {loading || !listRoute.canLoad ? (
            <div
              className={cm.cn(
                cm.sp('py', 12),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t('common.loading', {}, { defaultValue: 'Loading...' })}
            </div>
          ) : error ? (
            <div
              className={cm.cn(cm.sp('py', 12), cm.textCenter, cm.textSize('sm'))}
              role="alert"
              style={{ color: 'var(--color-error, var(--color-error))' }}
            >
              {error}
            </div>
          ) : posts.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('py', 12),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t('postList.noPostsFound', {}, { defaultValue: 'No posts found.' })}
            </div>
          ) : (
            posts.map((post) => (
              <PostListItem
                key={post.id}
                id={post.id}
                title={post.title}
                status={post.status}
                excerpt={post.excerpt ?? post.description ?? post.body}
                views={post.views}
                comments={post.comments ?? post.commentCount}
                date={post.publishedAt ?? post.date ?? post.createdAt}
                onDelete={() => handleDelete(post.id)}
              />
            ))
          )}
        </div>
      </section>
      {/* Pagination Footer */}
      <PostListPagination
        total={total}
        page={page}
        pageSize={listRoute.pageSize}
        onPageChange={(p) => {
          if (p !== page) listRoute.setPage(p)
          setReloadKey((k) => k + 1)
        }}
      />
    </AppShell>
  )
}

export default PostList
export { PostList, PostList as PostListPage }
