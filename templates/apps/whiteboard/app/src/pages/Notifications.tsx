import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WhiteboardLayout } from '../components/WhiteboardLayout.js'

interface UserProfile {
  id: string
  email?: string
  name?: string
  username?: string
}

interface BoardRow {
  id: string
  title?: string
  updated_at?: string
}

interface CollaboratorRow {
  id: string
  board_id: string
  user_id?: string | null
  email?: string | null
  role?: string
  status?: string
  created_at?: string
}

interface VersionRow {
  id: string
  board_id: string
  change_summary?: string
  created_at?: string
}

interface ActivityItem {
  id: string
  bucket: 'today' | 'thisWeek' | 'earlier'
  kind: 'invite' | 'snapshot' | 'edit'
  icon: string
  iconColor: string
  title: string
  body: string
  href?: string
  timestamp: string
}

const READ_KEY = 'whiteboard:notifications:lastSeen'

function bucketFor(ts: string): ActivityItem['bucket'] {
  const ms = Date.now() - new Date(ts).getTime()
  if (ms < 86_400_000) return 'today'
  if (ms < 7 * 86_400_000) return 'thisWeek'
  return 'earlier'
}

function relativeTime(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime()
  if (ms < 60_000) return 'just now'
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`
  return `${Math.round(ms / 86_400_000)}d ago`
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [tab, setTab] = useState<'all' | 'invite' | 'snapshot' | 'edit'>('all')
  const [error, setError] = useState<string | null>(null)
  const [lastSeen, setLastSeen] = useState<string>(() =>
    typeof window === 'undefined' ? '' : (window.localStorage.getItem(READ_KEY) ?? ''),
  )

  const refresh = useCallback(async () => {
    try {
      const boardsRes = await http.get<BoardRow[]>('/api/boards')
      const boards = Array.isArray(boardsRes.data) ? boardsRes.data : []
      const titleById = new Map(boards.map((b) => [b.id, b.title || 'Untitled Board']))
      const built: ActivityItem[] = []
      await Promise.all(
        boards.map(async (b) => {
          try {
            const [collabs, versions] = await Promise.all([
              http.get<CollaboratorRow[]>(`/api/collaborators/${b.id}`),
              http.get<VersionRow[]>(`/api/versions/${b.id}`),
            ])
            for (const c of Array.isArray(collabs.data) ? collabs.data : []) {
              if (c.created_at) {
                built.push({
                  id: `c-${c.id}`,
                  bucket: bucketFor(c.created_at),
                  kind: 'invite',
                  icon: 'group_add',
                  iconColor: '#00c4a8',
                  title: t(
                    'notifications.inviteTitle',
                    { email: c.email ?? c.user_id ?? '?' },
                    { defaultValue: 'Invited {{email}}' },
                  )!,
                  body: t(
                    'notifications.inviteBody',
                    { board: titleById.get(b.id) ?? 'Untitled', role: c.role ?? 'viewer' },
                    { defaultValue: 'as {{role}} on "{{board}}"' },
                  )!,
                  href: `/board/${b.id}`,
                  timestamp: c.created_at,
                })
              }
            }
            for (const v of Array.isArray(versions.data) ? versions.data : []) {
              if (v.created_at) {
                built.push({
                  id: `v-${v.id}`,
                  bucket: bucketFor(v.created_at),
                  kind: 'snapshot',
                  icon: 'history',
                  iconColor: '#5b5bf7',
                  title: t(
                    'notifications.snapshotTitle',
                    { board: titleById.get(b.id) ?? 'Untitled' },
                    { defaultValue: 'New snapshot on "{{board}}"' },
                  )!,
                  body: v.change_summary || '—',
                  href: `/board/${b.id}/history`,
                  timestamp: v.created_at,
                })
              }
            }
            if (b.updated_at) {
              built.push({
                id: `b-${b.id}`,
                bucket: bucketFor(b.updated_at),
                kind: 'edit',
                icon: 'edit_note',
                iconColor: '#a855f7',
                title: t(
                  'notifications.editTitle',
                  { board: titleById.get(b.id) ?? 'Untitled' },
                  { defaultValue: 'Edits to "{{board}}"' },
                )!,
                body: t(
                  'notifications.editBody',
                  {},
                  { defaultValue: 'The board content was updated.' },
                )!,
                href: `/board/${b.id}`,
                timestamp: b.updated_at,
              })
            }
          } catch (_error) {
            // best-effort: a failed board load is skipped in the notification list
          }
        }),
      )
      built.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setItems(built)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [http, t])

  useEffect(() => {
    refresh()
  }, [refresh])

  const visible = useMemo(() => {
    if (tab === 'all') return items
    return items.filter((i) => i.kind === tab)
  }, [items, tab])

  const unread = useMemo(() => {
    if (!lastSeen) return items.length
    return items.filter((i) => new Date(i.timestamp).getTime() > new Date(lastSeen).getTime())
      .length
  }, [items, lastSeen])

  const markAllRead = () => {
    const now = new Date().toISOString()
    setLastSeen(now)
    if (typeof window !== 'undefined') window.localStorage.setItem(READ_KEY, now)
  }

  const buckets: Array<ActivityItem['bucket']> = ['today', 'thisWeek', 'earlier']

  return (
    <WhiteboardLayout
      eyebrow={t(
        'notifications.eyebrow',
        { name: user?.name || user?.email || 'You' },
        { defaultValue: '{{name}} · inbox' },
      )}
      title={t(
        'notifications.title',
        { count: unread },
        { defaultValue: '{{count}} new notifications' },
      )}
      actions={
        <button
          type="button"
          data-mol-id="notifications-mark-read"
          onClick={markAllRead}
          disabled={unread === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'bg-surface-container text-on-surface rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-colors disabled:opacity-50',
          )}
        >
          {t('common.markAllAsRead', {}, { defaultValue: 'Mark all as read' })}
        </button>
      }
    >
      <div className={cm.stack(6)}>
        {error && (
          <div
            role="alert"
            data-mol-id="notifications-error"
            className={cm.cn(
              cm.sp('p', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/40 text-on-error-container',
            )}
          >
            {error}
          </div>
        )}

        <div
          className={cm.cn(
            cm.sp('p', 1),
            cm.flex({ align: 'center', gap: 'xs' }),
            'bg-surface-container-low rounded-2xl border border-outline-variant/30 w-fit',
          )}
        >
          {(
            [
              { id: 'all', label: 'Everything', icon: 'inbox' },
              { id: 'invite', label: 'Invitations', icon: 'group_add' },
              { id: 'snapshot', label: 'Snapshots', icon: 'history' },
              { id: 'edit', label: 'Edits', icon: 'edit_note' },
            ] as const
          ).map((tabDef) => (
            <button
              key={tabDef.id}
              type="button"
              data-mol-id={`notifications-tab-${tabDef.id}`}
              onClick={() => setTab(tabDef.id)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest rounded-xl transition-colors',
                tab === tabDef.id
                  ? 'bg-surface text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>{tabDef.icon}</span>
              {t(`notifications.tab.${tabDef.id}`, {}, { defaultValue: tabDef.label })}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div
            data-mol-id="notifications-empty"
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              cm.stack(3),
              'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40 text-on-surface-variant',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[40px] text-primary')}>
              inbox
            </span>
            <p className={cm.cn(cm.fontWeight('semibold'))}>
              {t('notifications.empty.title', {}, { defaultValue: 'Nothing new in your inbox' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'))}>
              {t(
                'notifications.empty.body',
                {},
                {
                  defaultValue:
                    'Invitations, snapshot saves, and recent board edits will appear here as they happen.',
                },
              )}
            </p>
          </div>
        ) : (
          buckets.map((bucket) => {
            const list = visible.filter((i) => i.bucket === bucket)
            if (list.length === 0) return null
            return (
              <section key={bucket} className={cm.stack(3)}>
                <h2
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    `notifications.bucket.${bucket}`,
                    {},
                    {
                      defaultValue:
                        bucket === 'today'
                          ? 'Today'
                          : bucket === 'thisWeek'
                            ? 'This week'
                            : 'Earlier',
                    },
                  )}
                </h2>
                <div className={cm.stack(3)}>
                  {list.map((item) => (
                    <Link
                      key={item.id}
                      to={item.href ?? '#'}
                      data-mol-id={`notification-${item.id}`}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'md' }),
                        cm.sp('p', 4),
                        'rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:bg-surface-container-low transition-colors',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          cm.w(10),
                          cm.h(10),
                          cm.roundedFull,
                          'text-white shrink-0',
                        )}
                        style={{ backgroundColor: item.iconColor }}
                      >
                        <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                          {item.icon}
                        </span>
                      </span>
                      <div className={cm.cn(cm.flex1, cm.stack(0))}>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('bold'),
                            'text-on-surface',
                          )}
                        >
                          {item.title}
                        </span>
                        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {item.body}
                        </span>
                      </div>
                      <span
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          'text-[10px] uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {relativeTime(item.timestamp)}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )
          })
        )}
      </div>
    </WhiteboardLayout>
  )
}

export default Notifications
