import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { closeMobileNav, useMobileNavOpen } from '../lib/mobile-nav.js'

interface ApiChannel {
  id: string
  name: string
  description?: string | null
}

export default function SideNavBar() {
  const location = useLocation()
  const http = useHttpClient()
  const { user } = useAuth<{ id?: string; name?: string; email?: string }>()
  const { t } = useTranslation()
  const cm = getClassMap()
  const [channels, setChannels] = useState<ApiChannel[] | null>(null)
  // Off-canvas drawer below 768px (toggled by MobileTopBar's hamburger);
  // statically visible at ≥768px where the pages reserve the 260px column.
  const mobileOpen = useMobileNavOpen()

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

  const orgLabel = user?.name
    ? t('nav.userOrg', { name: user.name }, { defaultValue: "{{name}}'s workspace" })
    : t('nav.workspace', {}, { defaultValue: 'Workspace' })

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          data-mol-id="button-close-nav"
          aria-label={t('nav.closeSidebar', {}, { defaultValue: 'Close navigation' })}
          onClick={closeMobileNav}
          className={cm.cn(
            'fixed inset-0 z-40 border-none bg-foreground/40 backdrop-blur-[1px] md:hidden',
          )}
        />
      )}
      <aside
        data-mol-id="side-nav-bar"
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'fixed left-0 top-0 z-50 h-screen w-[260px] max-w-[85vw] bg-surface-secondary',
          'transition-transform duration-200 ease-in-out',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
          'md:translate-x-0 md:shadow-none',
        )}
      >
        <div className={cm.cn(cm.sp('p', 6), cm.flex({ align: 'center' }), 'gap-3')}>
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
          <div>
            <h1
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'text-foreground tracking-tight leading-none',
              )}
            >
              {t('nav.appTitle', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h1>
            <p
              data-mol-id="side-nav-org"
              className={cm.cn(
                cm.fontWeight('medium'),
                cm.sp('mt', 1),
                'text-[10px] text-foreground-secondary uppercase tracking-widest',
              )}
            >
              {orgLabel}
            </p>
          </div>
        </div>
        <div className={cm.cn(cm.sp('px', 4), cm.sp('mb', 4))}>
          <Link
            data-mol-id="side-nav-new-message"
            to="/compose"
            onClick={closeMobileNav}
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
        <nav
          data-mol-id="side-nav-channels"
          className={cm.cn(
            cm.flex1,
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
                  onClick={closeMobileNav}
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
        </nav>
        <div className={cm.cn(cm.sp('p', 4), 'border-t border-border mt-auto')}>
          <div className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(1))}>
            <Link
              data-mol-id="side-nav-notifications"
              onClick={closeMobileNav}
              className={cm.cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-foreground-secondary hover:bg-surface-secondary transition-colors duration-200',
              )}
              to="/notifications"
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
              onClick={closeMobileNav}
              className={cm.cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-foreground-secondary hover:bg-surface-secondary transition-colors duration-200',
              )}
              to="/settings"
            >
              <span
                className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
                data-icon="settings"
              >
                settings
              </span>
              <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  )
}
export { SideNavBar }
