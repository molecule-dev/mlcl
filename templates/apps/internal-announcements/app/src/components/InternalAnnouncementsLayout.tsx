/**
 * InternalAnnouncementsLayout — auth'd page shell with channels sidebar.
 *
 * Layout: 280px left rail (Herald wordmark + tagline → primary nav → channels
 * section with unread counts → user/sign-out footer), centered single-column
 * content (max 920px) per DESIGN.md feed rhythm.
 *
 * Per DESIGN.md the feed is strictly single-column (640px reading column
 * inside the 920px container) and the sidebar lists categories/channels with
 * badge unread counts.
 *
 * Translated from forum/ForumLayout (left-rail + nav + sign-out footer)
 * and the DESIGN.md sidebar specification.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import {
  type ApiAcknowledgment,
  type ApiAnnouncement,
  type ApiCategory,
  categoryColor,
  categorySlug,
} from '../lib/announcements.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  matchPrefix?: string
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/feed',
    icon: 'campaign',
    labelKey: 'layout.feed',
    defaultLabel: 'Feed',
    matchPrefix: '/announcement/',
  },
  {
    to: '/compose',
    icon: 'edit_square',
    labelKey: 'layout.compose',
    defaultLabel: 'New announcement',
  },
  {
    to: '/my-acknowledgments',
    icon: 'task_alt',
    labelKey: 'layout.myAcks',
    defaultLabel: 'My acknowledgments',
  },
  {
    to: '/notifications',
    icon: 'notifications',
    labelKey: 'layout.notifications',
    defaultLabel: 'Notifications',
  },
  { to: '/search', icon: 'search', labelKey: 'layout.search', defaultLabel: 'Search' },
  { to: '/people', icon: 'groups', labelKey: 'layout.people', defaultLabel: 'People' },
  { to: '/analytics', icon: 'monitoring', labelKey: 'layout.analytics', defaultLabel: 'Analytics' },
]

const PROFILE_ITEMS: NavItem[] = [
  { to: '/profile', icon: 'account_circle', labelKey: 'layout.profile', defaultLabel: 'Profile' },
  { to: '/settings', icon: 'settings', labelKey: 'layout.settings', defaultLabel: 'Settings' },
]

function isActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.to) return true
  if (item.matchPrefix && pathname.startsWith(item.matchPrefix)) return true
  return false
}

interface SidebarChannel {
  id: string
  slug: string
  name: string
  icon: string
  color: string
  unread: number
}

export function InternalAnnouncementsLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const { logout, user } = useAuth<{ id?: string; name?: string; email?: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()

  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }

  // Live sidebar channels: real categories from /api/categories with the
  // unread badge computed from announcements the current user has not yet
  // acknowledged. Fresh signup → all badges read 0, not the previous
  // hardcoded {3,1,2,…} placeholder counts which lied to the user.
  const [channels, setChannels] = useState<SidebarChannel[]>([])
  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<ApiCategory[]>('/categories'),
      http.get<ApiAnnouncement[]>('/announcements'),
      http.get<ApiAcknowledgment[]>('/announcements/me/acknowledgments'),
    ])
      .then(([catsR, annsR, acksR]) => {
        if (cancelled) return
        const cats = Array.isArray(catsR.data) ? catsR.data : []
        const anns = Array.isArray(annsR.data) ? annsR.data : []
        const acks = Array.isArray(acksR.data) ? acksR.data : []
        const ackedSet = new Set(acks.map((a) => a.announcement_id))
        const myId = user?.id ?? null
        setChannels(
          cats.map((c) => {
            const unread = anns.filter(
              (a) =>
                a.category_id === c.id &&
                a.status === 'published' &&
                a.requires_acknowledgment &&
                !ackedSet.has(a.id) &&
                a.author_id !== myId,
            ).length
            return {
              id: c.id,
              slug: categorySlug(c),
              name: c.name,
              icon: c.icon ?? 'tag',
              color: categoryColor(c),
              unread,
            }
          }),
        )
      })
      .catch(() => {
        if (!cancelled) setChannels([])
      })
    return () => {
      cancelled = true
    }
  }, [http, user?.id, pathname])

  const activeChannelSlug = useMemo(() => searchParams.get('channel'), [searchParams])

  const renderItem = (item: NavItem) => {
    const active = isActive(pathname, item)
    return (
      <Link
        key={item.to}
        to={item.to}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          'gap-3 py-2.5 rounded-lg transition-colors border-l-4',
          active
            ? 'border-primary bg-primary-container/20 text-primary font-semibold'
            : 'border-transparent text-on-surface-variant hover:bg-surface-container-low/50 hover:text-on-surface',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
          {item.icon}
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight(active ? 'semibold' : 'medium'),
            'tracking-wide',
          )}
        >
          {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
        </span>
      </Link>
    )
  }

  return (
    <div className={cm.cn(cm.flex({ align: 'stretch' }), cm.minH('screen'), 'bg-background')}>
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('p', 5),
          'sticky top-0 hidden md:flex w-[280px] h-screen shrink-0 border-r border-outline-variant/30 bg-surface',
        )}
      >
        <Link to="/feed" className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('mb', 6))}>
          <span
            className={cm.cn(cm.fontWeight('bold'), 'text-2xl tracking-tight')}
            style={{ color: 'var(--mol-color-primary, var(--color-priority-normal))' }}
          >
            {APP_NAME}
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {APP_TAGLINE}
          </span>
        </Link>

        <nav
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xs' }),
            cm.flex1,
            'min-h-0 overflow-y-auto',
          )}
        >
          {NAV_ITEMS.map(renderItem)}

          <div className={cm.cn(cm.sp('mt', 4), cm.sp('mb', 2))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('px', 3),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('layout.channelsTitle', {}, { defaultValue: 'Channels' })}
            </span>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col' }))}>
            {channels.map((c) => {
              const href = `/feed?channel=${c.slug}`
              const active = pathname === '/feed' && activeChannelSlug === c.slug
              return (
                <Link
                  key={c.slug}
                  to={href}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg transition-colors',
                    active
                      ? 'bg-primary-container/20 text-primary font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container-low/50 hover:text-on-surface',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-base shrink-0')}
                    style={{ color: c.color }}
                    aria-hidden="true"
                  >
                    {c.icon}
                  </span>
                  <span
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'flex-1 truncate')}
                  >
                    {c.name}
                  </span>
                  {c.unread > 0 && (
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.flex({ align: 'center', justify: 'center' }),
                        'rounded-full text-[10px] min-w-[18px] h-[18px] px-1',
                      )}
                      style={{
                        backgroundColor: 'var(--mol-color-primary, var(--color-priority-normal))',
                        color: 'var(--mol-color-surface)',
                      }}
                    >
                      {c.unread}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          <div
            className={cm.cn(
              cm.sp('mt', 4),
              cm.sp('pt', 4),
              cm.flex({ direction: 'col', gap: 'xs' }),
              'border-t border-outline-variant/30',
            )}
          >
            {PROFILE_ITEMS.map(renderItem)}
          </div>
        </nav>

        <div
          className={cm.cn(
            cm.sp('pt', 4),
            cm.flex({ direction: 'col', gap: 'sm' }),
            'border-t border-outline-variant/30',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 2))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.fontWeight('bold'),
                cm.textSize('sm'),
              )}
              style={{
                backgroundColor:
                  'var(--color-priority-normal-light, var(--color-priority-normal-light))',
                color: 'var(--color-priority-normal, var(--color-priority-normal))',
              }}
              aria-hidden="true"
            >
              {(user?.name ?? user?.email ?? 'C').slice(0, 1).toUpperCase()}
            </span>
            <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0 flex-1')}>
              <span
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'truncate text-on-surface',
                )}
              >
                {user?.name ?? t('layout.guestName', {}, { defaultValue: 'Team member' })}
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'truncate text-on-surface-variant')}>
                {user?.email ?? ''}
              </span>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.flex1,
                cm.fontWeight('semibold'),
                'rounded-lg text-left text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>logout</span>
              <span className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest')}>
                {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
              </span>
            </button>
            <UserMenu />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <main className={cm.cn(cm.flex1, 'min-w-0')}>
        <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), 'max-w-[920px] mx-auto')}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default InternalAnnouncementsLayout
