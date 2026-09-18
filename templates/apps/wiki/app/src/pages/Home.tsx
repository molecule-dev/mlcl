import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { KnowledgeHeroCard } from '../components/KnowledgeHeroCard.js'
import { PageRow, type PageRowEntry } from '../components/PageRow.js'

interface ApiPage {
  id: string
  title: string
  content: string
  updated_at: string | null
  created_at: string | null
  space_id: string
  trashed_at: string | null
}

interface ApiSpace {
  id: string
  name: string
  page_count: number
}

interface ApiNotification {
  id: string
  kind: string
  title: string
  body: string | null
  page_id: string | null
  created_at: string
  read_at: string | null
}

interface ApiMe {
  id: string
  name: string | null
  email: string | null
  defaultSpace?: { id: string; name: string }
  stats?: { pageCount: number; spaceCount: number }
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const diffMs = Date.now() - d.getTime()
  const min = Math.round(diffMs / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

function snippet(content: string): string {
  if (!content) return ''
  const text = content
    .replace(/^#+\s+/gm, '')
    .replace(/[*_`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 180 ? text.slice(0, 180) + '…' : text
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || name[0]!.toUpperCase()
}

export function Home() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()

  const [me, setMe] = useState<ApiMe | null>(null)
  const [spaces, setSpaces] = useState<ApiSpace[]>([])
  const [recent, setRecent] = useState<ApiPage[]>([])
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [meRes, spacesRes, pagesRes, notifRes] = await Promise.all([
          http.get<ApiMe>('/me').catch(() => null),
          http.get<ApiSpace[]>('/spaces').catch(() => null),
          http
            .get<ApiPage[]>('/pages', { params: { sort: 'updated_at', order: 'desc', limit: 6 } })
            .catch(() => null),
          http.get<ApiNotification[]>('/notifications').catch(() => null),
        ])
        if (cancelled) return
        if (meRes?.data) setMe(meRes.data)
        if (Array.isArray(spacesRes?.data)) setSpaces(spacesRes!.data)
        if (Array.isArray(pagesRes?.data)) setRecent(pagesRes!.data)
        if (Array.isArray(notifRes?.data)) setNotifications(notifRes!.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load home')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const displayName =
    me?.name ||
    user?.name ||
    user?.email?.split('@')[0] ||
    t('home.defaultName', {}, { defaultValue: 'Friend' })
  const userInitials = initials(displayName)
  const totalPages = me?.stats?.pageCount ?? recent.length
  const spaceCount = me?.stats?.spaceCount ?? spaces.length
  const totalContributors = Math.max(1, spaceCount)
  const unreadCount = notifications.filter((n) => !n.read_at).length

  const recentEntries: PageRowEntry[] = recent.map((p) => ({
    id: p.id,
    title: p.title,
    breadcrumb: spaces
      .filter((s) => s.id === p.space_id)
      .map((s) => s.name)
      .slice(0, 1),
    snippet: snippet(p.content),
    authorInitials: userInitials,
    lastEdited: formatRelative(p.updated_at ?? p.created_at),
    status: 'published',
    icon: 'description',
  }))

  // Synthesise weekly edits trend from spread of recent updated_at to keep
  // the hero card honest while we don't yet ship a real analytics endpoint.
  const weekly = (() => {
    const buckets = [0, 0, 0, 0, 0, 0, 0]
    const now = Date.now()
    for (const p of recent) {
      if (!p.updated_at) continue
      const days = Math.floor((now - new Date(p.updated_at).getTime()) / (24 * 3600 * 1000))
      if (days >= 0 && days < 7) buckets[6 - days]! += 1
    }
    return buckets
  })()

  return (
    <div className={cm.stack(10)} data-testid="home-page">
      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-md border-l-4 border-error bg-error/10 text-on-surface',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className={cm.stack(2)}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('home.eyebrow', { appName: APP_NAME }, { defaultValue: 'Today at {{appName}}' })}
        </span>
        <h1
          className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}
          data-testid="home-greeting"
        >
          {t('home.greeting', { name: displayName }, { defaultValue: 'Welcome back, {{name}}.' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
          {unreadCount > 0
            ? t(
                'home.unreadSubtitle',
                { count: unreadCount },
                { defaultValue: '{{count}} unread notifications since you were last here.' },
              )
            : t(
                'home.subtitle',
                {},
                { defaultValue: 'No unread mentions — open a space to start writing.' },
              )}
        </p>
      </div>

      <KnowledgeHeroCard
        workspaceName={me?.defaultSpace?.name ?? spaces[0]?.name ?? APP_NAME}
        pageCount={totalPages}
        contributorCount={totalContributors}
        weeklyEdits={weekly}
        lastEditedLabel={
          recent[0]?.updated_at
            ? t(
                'home.heroLastEdited',
                { when: formatRelative(recent[0].updated_at), name: displayName },
                { defaultValue: 'Updated {{when}} by {{name}}' },
              )
            : t(
                'home.heroNoEdits',
                {},
                { defaultValue: 'Nothing edited yet — start by writing a page.' },
              )
        }
      />

      <div className={cm.cn('grid gap-4 md:grid-cols-3')}>
        {[
          {
            label: 'home.kpi.activePages',
            defaultLabel: 'Active pages',
            value: String(totalPages),
            href: '/spaces',
          },
          {
            label: 'home.kpi.spaces',
            defaultLabel: 'Spaces',
            value: String(spaceCount),
            href: '/spaces',
          },
          {
            label: 'home.kpi.notifications',
            defaultLabel: 'Unread notifications',
            value: String(unreadCount),
            href: '/notifications',
          },
        ].map((k) => (
          <Link
            key={k.label}
            to={k.href}
            data-testid={`home-kpi-${k.label}`}
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-xl bg-surface-container-lowest border-l-4 border-primary shadow-sm hover:-translate-y-0.5 transition-transform',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(k.label, {}, { defaultValue: k.defaultLabel })}
            </p>
            <div className={cm.cn(cm.flex({ align: 'end', gap: 'sm' }), cm.sp('mt', 2))}>
              <span className={cm.cn('text-4xl font-extrabold text-on-surface tracking-tight')}>
                {k.value}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div
        className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'lg:flex-row lg:items-start')}
      >
        <section className={cm.cn(cm.stack(4), 'flex-1 min-w-0')} data-testid="home-recent">
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2
              className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('home.recent.title', {}, { defaultValue: 'Recent pages' })}
            </h2>
            <Link
              to="/page/new"
              className={cm.cn(
                cm.sp('px', 4),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'h-9 inline-flex items-center rounded-md bg-primary text-on-primary hover:bg-primary-hover',
              )}
              data-testid="home-new-page"
            >
              <span
                className={cm.cn('material-symbols-outlined text-[16px] mr-1')}
                aria-hidden="true"
              >
                add
              </span>
              {t('home.newPage', {}, { defaultValue: 'New page' })}
            </Link>
          </div>
          {recentEntries.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'home.recent.empty',
                {},
                { defaultValue: 'No pages yet — start by creating one.' },
              )}
            </p>
          ) : (
            <ul className={cm.stack(3)}>
              {recentEntries.map((p) => (
                <li key={p.id}>
                  <PageRow entry={p} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className={cm.cn(cm.stack(6), 'w-full lg:w-80 shrink-0')}>
          <section className={cm.stack(3)} data-testid="home-spaces">
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('home.spaces.title', {}, { defaultValue: 'Your spaces' })}
            </h2>
            {spaces.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('home.spaces.empty', {}, { defaultValue: 'No spaces yet.' })}
              </p>
            ) : (
              <ul className={cm.stack(2)}>
                {spaces.slice(0, 6).map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/spaces`}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('p', 3),
                        'rounded-lg bg-surface-container-lowest border border-outline-variant/40 hover:bg-surface-container-low transition-colors',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-on-surface',
                        )}
                      >
                        {s.name}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'home.spaces.pageCount',
                          { count: s.page_count ?? 0 },
                          { defaultValue: '{{count}} pages' },
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 5),
              cm.stack(4),
              'rounded-xl bg-surface-container-lowest border border-outline-variant/40',
            )}
            data-testid="home-activity"
          >
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nav.activityFeed', {}, { defaultValue: 'Activity feed' })}
            </h2>
            {notifications.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('home.activity.empty', {}, { defaultValue: 'No notifications yet.' })}
              </p>
            ) : (
              <ul className={cm.stack(3)}>
                {notifications.slice(0, 5).map((n) => (
                  <li key={n.id} className={cm.flex({ align: 'start', gap: 'sm' })}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'h-7 w-7 shrink-0 rounded-full bg-secondary/15 text-secondary',
                      )}
                      aria-hidden="true"
                    >
                      {n.kind[0]?.toUpperCase() ?? '?'}
                    </span>
                    <div className={cm.cn(cm.stack(0), 'min-w-0 flex-1')}>
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-snug')}>
                        <span className={cm.cn('font-semibold')}>{n.title}</span>
                      </p>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {formatRelative(n.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
