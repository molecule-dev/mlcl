/**
 * PostsAdmin — the status workflow table (admin).
 *
 * Every non-merged post in a list; selecting a row opens the workflow
 * panel: status buttons (open → planned → in_progress → shipped / declined),
 * official response textarea, roadmap quarter label, and the merge-duplicate
 * control (pick a target; votes + comments move; the source gets a moved
 * note).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatusBadge } from '../components/StatusBadge.js'
import { type ApiPost, authorName, displayStatus, timeAgo } from '../utils/posts.js'

type StatusAction = 'open' | 'planned' | 'in_progress' | 'shipped' | 'declined'

const STATUS_ACTIONS: StatusAction[] = ['open', 'planned', 'in_progress', 'shipped', 'declined']

const ACTION_LABELS: Record<StatusAction, string> = {
  open: 'Open',
  planned: 'Planned',
  in_progress: 'In progress',
  shipped: 'Shipped',
  declined: 'Declined',
}

export function PostsAdmin() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [posts, setPosts] = useState<ApiPost[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [response, setResponse] = useState('')
  const [roadmapLabel, setRoadmapLabel] = useState('')
  const [mergeTarget, setMergeTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)

  const selectPost = useCallback((id: string) => {
    setSelectedId(id)
    // On stacked (mobile/tablet) layouts the workflow panel renders below
    // the entire post list — without this the tap visibly does nothing
    // (the panel is a viewport away).
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      requestAnimationFrame(() =>
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    }
  }, [])

  const load = useCallback(async () => {
    const http = getHttpClient()
    try {
      const res = await http.get<{ data?: ApiPost[] }>('/api/posts?sort=top&limit=100')
      setPosts(Array.isArray(res?.data?.data) ? res.data.data : [])
      setDenied(false)
    } catch (e) {
      logError('postsAdmin.load', e)
      setDenied(true)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    void load()
  }, [isAuthenticated, load])

  const selected = useMemo(
    () => (posts ?? []).find((p) => p.id === selectedId) ?? null,
    [posts, selectedId],
  )

  useEffect(() => {
    setResponse(selected?.admin_response ?? '')
    setRoadmapLabel(selected?.roadmap_label ?? '')
    setMergeTarget('')
    setNotice(null)
  }, [selectedId, selected?.admin_response, selected?.roadmap_label])

  const applyStatus = useCallback(
    async (status: StatusAction) => {
      if (!selected || busy) return
      setBusy(true)
      setNotice(null)
      try {
        const http = getHttpClient()
        const res = await http.post<{ id?: string }>(`/api/admin/posts/${selected.id}/status`, {
          status,
          admin_response: response.trim() ? response.trim() : null,
          roadmap_label: roadmapLabel.trim() ? roadmapLabel.trim() : null,
        })
        if (res?.data?.id) {
          track({
            name: 'post.status_changed',
            properties: { post_id: selected.id, status },
          })
          setNotice(t('postsAdmin.statusApplied', {}, { defaultValue: 'Status updated.' }))
          await load()
        } else {
          setNotice(t('postsAdmin.statusFailed', {}, { defaultValue: 'Update failed.' }))
        }
      } catch (e) {
        logError('postsAdmin.status', e)
        setNotice(t('postsAdmin.statusFailed', {}, { defaultValue: 'Update failed.' }))
      } finally {
        setBusy(false)
      }
    },
    [selected, busy, response, roadmapLabel, load, t],
  )

  const applyMerge = useCallback(async () => {
    if (!selected || !mergeTarget || mergeTarget === selected.id || busy) return
    setBusy(true)
    setNotice(null)
    try {
      const http = getHttpClient()
      const res = await http.post<{ moved_votes?: number; moved_comments?: number }>(
        `/api/admin/posts/${selected.id}/merge`,
        { target_id: mergeTarget },
      )
      if (res?.data) {
        track({
          name: 'post.merged',
          properties: {
            post_id: selected.id,
            target_id: mergeTarget,
            moved_votes: res.data.moved_votes ?? 0,
            moved_comments: res.data.moved_comments ?? 0,
          },
        })
        setNotice(
          t(
            'postsAdmin.mergeApplied',
            {
              votes: res.data.moved_votes ?? 0,
              comments: res.data.moved_comments ?? 0,
            },
            { defaultValue: 'Merged — {{votes}} votes and {{comments}} comments moved.' },
          ),
        )
        await load()
      }
    } catch (e) {
      logError('postsAdmin.merge', e)
      setNotice(t('postsAdmin.mergeFailed', {}, { defaultValue: 'Merge failed.' }))
    } finally {
      setBusy(false)
    }
  }, [selected, mergeTarget, busy, load, t])

  if (!isAuthenticated) {
    return (
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'postsAdmin.signIn',
          {},
          { defaultValue: 'Sign in as a product-team admin to manage posts.' },
        )}
      </p>
    )
  }

  if (denied) {
    return (
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'items-start')}>
        <p
          className={cm.cn(cm.textSize('base'), cm.fontWeight('medium'), 'text-on-surface-variant')}
        >
          {t('admin.denied', {}, { defaultValue: 'Admins only.' })}
        </p>
        <Link
          to="/boards"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:underline',
          )}
        >
          {t('admin.backToBoards', {}, { defaultValue: 'Back to boards' })}
        </Link>
      </div>
    )
  }

  const others = (posts ?? []).filter((p) => p.id !== selectedId && !p.merged_into_id)

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-primary',
            )}
          >
            {t('postsAdmin.eyebrow', {}, { defaultValue: 'Product team' })}
          </span>
          <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
            {t('postsAdmin.title', {}, { defaultValue: 'Manage feedback posts' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'postsAdmin.subtitle',
              {},
              {
                defaultValue:
                  'Set the official status, respond publicly, label the roadmap quarter, and merge duplicates.',
              },
            )}
          </p>
        </div>
        <Link
          to="/admin"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'text-primary hover:underline',
          )}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            arrow_back
          </span>
          {t('postsAdmin.backToDashboard', {}, { defaultValue: 'Dashboard' })}
        </Link>
      </header>

      {notice && (
        <div
          role="status"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('p', 3),
            'rounded-lg',
            cm.accentCard({ tone: 'custom' }),
          )}
          style={{
            ['--mol-accent' as string]: 'var(--color-status-shipped)',
            backgroundColor: 'var(--color-status-shipped-light)',
          }}
        >
          {notice}
        </div>
      )}

      <div className={cm.cn('grid gap-4 grid-cols-1 lg:grid-cols-5')}>
        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'lg:col-span-3')}>
          {posts === null ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : (
            (posts ?? []).map((post) => {
              const active = post.id === selectedId
              return (
                <button
                  key={post.id}
                  type="button"
                  data-mol-id="admin-post-row"
                  aria-pressed={active}
                  onClick={() => selectPost(post.id)}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.sp('p', 3),
                    'rounded-lg border text-left transition-colors',
                    active
                      ? 'border-primary bg-primary-container/20'
                      : 'border-outline-variant/40 bg-surface hover:border-primary/40',
                  )}
                >
                  <span className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'min-w-0')}>
                    <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
                      <StatusBadge status={displayStatus(post)} label={post.roadmap_label} />
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                        'truncate',
                      )}
                    >
                      {post.title}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {authorName(post.author)} · {timeAgo(post.created_at)} ·{' '}
                      {t(
                        'postsAdmin.votes',
                        { count: post.vote_count ?? 0 },
                        { defaultValue: '{{count}} votes' },
                      )}
                    </span>
                  </span>
                  <span
                    className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}
                    style={{ color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {post.vote_count ?? 0}
                  </span>
                </button>
              )
            })
          )}
        </section>

        <aside
          ref={panelRef}
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 5),
            'lg:col-span-2 rounded-xl border border-outline-variant/40 bg-surface self-start',
          )}
        >
          {!selected ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('postsAdmin.selectHint', {}, { defaultValue: 'Select a post to work on it.' })}
            </p>
          ) : (
            <>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <Link
                  to={`/post/${selected.id}`}
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('base'),
                    'text-on-surface hover:text-primary transition-colors',
                  )}
                >
                  {selected.title}
                </Link>
                <StatusBadge status={displayStatus(selected)} label={selected.roadmap_label} />
              </div>

              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[11px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('postsAdmin.statusLabel', {}, { defaultValue: 'Status' })}
                </span>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
                  {STATUS_ACTIONS.map((action) => {
                    const active = selected.status === action
                    return (
                      <button
                        key={action}
                        type="button"
                        data-mol-id={`admin-status-${action}`}
                        aria-pressed={active}
                        disabled={busy}
                        onClick={() => {
                          void applyStatus(action)
                        }}
                        className={cm.cn(
                          cm.fontWeight('semibold'),
                          cm.textSize('xs'),
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          'rounded-full border transition-colors disabled:opacity-50',
                          active
                            ? 'border-primary bg-primary text-on-primary'
                            : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/50',
                        )}
                      >
                        {t(
                          `status.${action === 'in_progress' ? 'inProgress' : action}`,
                          {},
                          {
                            defaultValue: ACTION_LABELS[action],
                          },
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="admin-response"
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[11px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('postsAdmin.responseLabel', {}, { defaultValue: 'Official response' })}
                </label>
                <textarea
                  id="admin-response"
                  data-mol-id="admin-response"
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  maxLength={5000}
                  placeholder={t(
                    'postsAdmin.responsePlaceholder',
                    {},
                    { defaultValue: 'What the team decided and why — shown publicly on the post.' },
                  )}
                  className={cm.cn(
                    cm.sp('p', 3),
                    cm.textSize('sm'),
                    'w-full min-h-[90px] rounded-lg border border-outline-variant/50 bg-input-background text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary',
                  )}
                />
              </div>

              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="admin-roadmap-label"
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[11px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    'postsAdmin.roadmapLabel',
                    {},
                    { defaultValue: 'Roadmap label (e.g. Q1 2027)' },
                  )}
                </label>
                <input
                  id="admin-roadmap-label"
                  data-mol-id="admin-roadmap-label"
                  type="text"
                  value={roadmapLabel}
                  onChange={(e) => setRoadmapLabel(e.target.value)}
                  maxLength={40}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'w-full rounded-lg border border-outline-variant/50 bg-input-background text-on-surface focus:outline-none focus:border-primary',
                  )}
                />
              </div>

              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="admin-merge-target"
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[11px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('postsAdmin.mergeLabel', {}, { defaultValue: 'Merge duplicate into' })}
                </label>
                <select
                  id="admin-merge-target"
                  data-mol-id="admin-merge-target"
                  value={mergeTarget}
                  onChange={(e) => setMergeTarget(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'w-full rounded-lg border border-outline-variant/50 bg-input-background text-on-surface focus:outline-none focus:border-primary',
                  )}
                >
                  <option value="">
                    {t('postsAdmin.mergeChoose', {}, { defaultValue: 'Choose a target post…' })}
                  </option>
                  {others.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  data-mol-id="admin-merge-apply"
                  disabled={!mergeTarget || mergeTarget === selected.id || busy}
                  onClick={() => {
                    void applyMerge()
                  }}
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'rounded-full bg-secondary text-on-secondary disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity self-start',
                  )}
                >
                  {t('postsAdmin.mergeApply', {}, { defaultValue: 'Merge & move votes' })}
                </button>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'postsAdmin.mergeHint',
                    {},
                    {
                      defaultValue:
                        'Votes pool (one per user), comments move, and this post gets a "moved" note.',
                    },
                  )}
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

export default PostsAdmin
