/**
 * The signed-in shell, on the shared `ResponsiveAppShell`
 * (`@molecule/app-ui-react`) — composed the fleet-canonical way: the brand
 * leads the desktop Sidebar, the mobile-only TopBar carries the menu trigger
 * (rendered by the shell when a Drawer is composed) plus the app title, and
 * the SAME nav element is passed to `.Sidebar` and `.Drawer` so only the
 * mounted breakpoint's copy ever instantiates (no duplicate landmarks, no
 * double-fetched channels).
 *
 * This replaces the former template-local shell trio — `SideNavBar` (fixed
 * aside + translate-x off-canvas drawer + backdrop button), `MobileTopBar`
 * (hamburger + its own Escape handler) and `lib/mobile-nav.ts` (the
 * module-level open-state store) — with the shared component's APG dialog
 * drawer, breakpoint-owned mounting, and auto-close on navigation.
 *
 * The desktop utility bar (`TopNavBar`: search, mentions, profile) is
 * md+-only non-duplicating chrome that hides itself below the breakpoint —
 * pages render it as the FIRST child (it is `sticky`, i.e. in-flow, so it
 * must ride inside the content column, not beside the sidebar). The chat
 * two-pane (channel list + thread) is page content, not shell chrome.
 */
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

/** Props shared by every `ChatShell` consumer. */
interface ChatShellProps {
  /** The routed page content — rendered inside the shell's `<main>`. */
  children: ReactNode
  /** Classes for the content `<main>` — page padding/scroll live here. */
  contentClassName?: string
  /** Inline styles for the content `<main>`. */
  contentStyle?: CSSProperties
  /** `data-mol-id` for the content `<main>` (fleet locator convention). */
  contentMolId?: string
  /** Extra classes on the shell root (the old page wrapper's canvas). */
  className?: string
}

/**
 * The brand block (logo + app title + workspace label) — leads the desktop
 * Sidebar and rides in the Drawer header. Breakpoint-exclusive mounts, so
 * `side-nav-org` is never duplicated.
 */
function BrandBlock() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ name?: string }>()

  const orgLabel = user?.name
    ? t('nav.userOrg', { name: user.name }, { defaultValue: "{{name}}'s workspace" })
    : t('nav.workspace', {}, { defaultValue: 'Workspace' })

  return (
    <div
      className={cm.cn(cm.sp('p', 6), cm.flex({ align: 'center' }), 'shrink-0 gap-3')}
      data-mol-id="side-nav-brand"
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-container shadow-lg shadow-primary/20',
        )}
      >
        <span
          className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined text-on-primary')}
          data-icon="pulse"
        >
          pulse_alert
        </span>
      </div>
      <div className="min-w-0">
        <h1
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'text-foreground tracking-tight leading-none truncate',
          )}
        >
          {t('nav.appTitle', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </h1>
        <p
          data-mol-id="side-nav-org"
          className={cm.cn(
            cm.fontWeight('medium'),
            cm.sp('mt', 1),
            'text-[10px] text-foreground-secondary uppercase tracking-widest truncate',
          )}
        >
          {orgLabel}
        </p>
      </div>
    </div>
  )
}

/** The sidebar's full-width New Message action (as before, verbatim classes). */
function NewMessageLink() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('px', 4), cm.sp('mb', 4), 'shrink-0')}>
      <Link
        data-mol-id="side-nav-new-message"
        to="/compose"
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('px', 4),
          'w-full py-2.5 bg-surface border border-border rounded-lg text-foreground gap-2 hover:bg-surface-secondary transition-colors shadow-sm active:scale-95 transition-transform',
        )}
      >
        <span
          className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
          data-icon="edit_square"
        >
          edit_square
        </span>
        {t('nav.newMessage', {}, { defaultValue: 'New Message' })}
      </Link>
    </div>
  )
}

interface ApiChannel {
  id: string
  name: string
  description?: string | null
}

/**
 * The channel list shared by the desktop Sidebar and the mobile Drawer — both
 * `ResponsiveAppShell` surfaces. Only the mounted breakpoint's copy ever
 * instantiates, so the `data-mol-id`s are never duplicated in the DOM. The
 * shell wraps children in its own `<nav>` landmark, so this stays a plain
 * container (the old inner `<nav data-mol-id="side-nav-channels">` became a
 * div to avoid nesting landmarks; the id is kept for the dashboard's
 * scroll-into-view quick action). Marking the CURRENT channel is the
 * consumer's job: `aria-current="page"` plus the active classes.
 */
function SideNavContent() {
  const location = useLocation()
  const http = useHttpClient()
  const { t } = useTranslation()
  const cm = getClassMap()
  const [channels, setChannels] = useState<ApiChannel[] | null>(null)

  useEffect(() => {
    let active = true
    http
      .get<ApiChannel[]>('/api/channels')
      .then((res) => {
        if (!active) return
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? (res as unknown as ApiChannel[])
            : []
        setChannels(list)
      })
      .catch(() => {
        if (active) setChannels([])
      })
    return () => {
      active = false
    }
  }, [http])

  const activeChannelId =
    location.pathname.startsWith('/channels/') && location.pathname.split('/')[2]
      ? decodeURIComponent(location.pathname.split('/')[2] || '')
      : ''

  return (
    <>
      <NewMessageLink />
      <div
        data-mol-id="side-nav-channels"
        className={cm.cn(
          cm.fontWeight('medium'),
          cm.textSize('sm'),
          cm.sp('px', 3),
          cm.stack(1),
          "overflow-y-auto no-scrollbar font-['Inter'] tracking-tight",
        )}
      >
        <div className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] text-foreground-secondary uppercase tracking-widest',
            )}
          >
            {t('nav.channels', {}, { defaultValue: 'Channels' })}
          </span>
        </div>
        {channels === null ? (
          <div
            className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'text-foreground-secondary text-xs')}
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </div>
        ) : channels.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'text-foreground-secondary text-xs leading-snug',
            )}
          >
            {t(
              'channelsList.empty',
              {},
              { defaultValue: 'No channels yet — create one to get started.' },
            )}
          </div>
        ) : (
          channels.map((channel) => {
            const isActive = activeChannelId === channel.id
            return (
              <Link
                key={channel.id}
                data-mol-id={`side-nav-channel-${channel.id}`}
                to={`/channels/${channel.id}`}
                aria-current={isActive ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-lg transition-colors duration-200',
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container font-semibold'
                    : 'text-foreground-secondary hover:bg-surface-secondary',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
                  <span
                    className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
                    data-icon="tag"
                  >
                    tag
                  </span>
                  <span>
                    {t('nav.channelName', { name: channel.name }, { defaultValue: '#{{name}}' })}
                  </span>
                </div>
              </Link>
            )
          })
        )}
        <div className={cm.cn(cm.sp('px', 3), cm.sp('py', 4))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] text-foreground-secondary uppercase tracking-widest',
            )}
          >
            {t('nav.directMessages', {}, { defaultValue: 'Direct Messages' })}
          </span>
        </div>
        <div
          data-mol-id="side-nav-dms-empty"
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'text-foreground-secondary text-xs leading-snug',
          )}
        >
          {t('directMessagesSection.empty', {}, { defaultValue: 'No direct messages yet.' })}
        </div>
      </div>
    </>
  )
}

/**
 * The footer links (Notifications, Settings) — the shell's bordered footer
 * row on both the Sidebar and the Drawer. The drawer no longer needs
 * click-to-close on each link: the shell auto-closes on SPA navigation.
 */
function SideNavFooterLinks() {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const cm = getClassMap()
  const linkClass = cm.cn(
    'flex items-center gap-3 px-3 py-2 rounded-lg text-foreground-secondary hover:bg-surface-secondary transition-colors duration-200',
  )
  return (
    <>
      <Link
        data-mol-id="side-nav-notifications"
        className={linkClass}
        to="/notifications"
        aria-current={pathname === '/notifications' ? 'page' : undefined}
      >
        <span
          className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
          data-icon="notifications"
        >
          notifications
        </span>
        <span>{t('settings.notifications', {}, { defaultValue: 'Notifications' })}</span>
      </Link>
      <Link
        data-mol-id="side-nav-settings"
        className={linkClass}
        to="/settings"
        aria-current={pathname === '/settings' ? 'page' : undefined}
      >
        <span
          className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
          data-icon="settings"
        >
          settings
        </span>
        <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
      </Link>
    </>
  )
}

/**
 * The signed-in shell: desktop sidebar = brand + New Message + channels +
 * footer links; mobile drawer = the same nav under the brand header; the
 * mobile-only TopBar carries the shell's menu trigger plus the app title.
 */
export function ChatShell({
  children,
  contentClassName,
  contentStyle,
  contentMolId,
  className,
}: ChatShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ResponsiveAppShell sidebarWidth="md" className={className}>
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'truncate text-[15px] tracking-tight text-foreground',
            )}
          >
            {t('nav.appTitle', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </span>
        }
      />
      <ResponsiveAppShell.Sidebar footer={<SideNavFooterLinks />}>
        <BrandBlock />
        <SideNavContent />
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer header={<BrandBlock />} footer={<SideNavFooterLinks />}>
        <SideNavContent />
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content
        className={contentClassName}
        style={contentStyle}
        dataMolId={contentMolId}
      >
        {children}
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
