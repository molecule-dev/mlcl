import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'

import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function ChatLayout() {
  const { t } = useTranslation()
  const { mode, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const cm = getClassMap()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const navItems = [
    {
      to: '/channels/general',
      icon: 'tag',
      label: t('nav.channels', {}, { defaultValue: 'Channels' }),
      id: 'nav-channels',
    },
    {
      to: '/channels/general',
      icon: 'chat_bubble',
      label: t('nav.directMessages', {}, { defaultValue: 'Direct Messages' }),
      id: 'nav-direct-messages',
    },
    {
      to: '/channels/general',
      icon: 'alternate_email',
      label: t('nav.mentions', {}, { defaultValue: 'Mentions' }),
      id: 'nav-mentions',
    },
    {
      to: '/settings',
      icon: 'settings',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
      id: 'nav-settings',
    },
  ]

  return (
    <div
      data-mol-id="chat-layout"
      className={cm.cn('h-screen overflow-hidden font-sans text-foreground', 'bg-surface')}
    >
      <aside
        data-mol-id="channel-sidebar"
        className={cm.cn(
          'fixed left-0 top-0 z-[60] flex h-screen w-[260px] flex-col',
          'border-r border-border/80 bg-surface-secondary text-foreground',
          '',
          'transition-transform duration-200 ease-in-out',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
          'min-[901px]:translate-x-0',
        )}
      >
        <div className={cm.cn(cm.sp('p', 6), cm.flex({ align: 'center', gap: 'sm' }))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-10 w-10 rounded-lg bg-primary text-on-primary shadow-md shadow-primary/25',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-lg text-on-primary')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              pulse_alert
            </span>
          </div>
          <div>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-xl leading-tight tracking-tight text-foreground',
              )}
            >
              {t('app.name', { appName: APP_NAME }, { defaultValue: '{{appName}} Team' })}
            </h1>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'mt-1 text-[10px] uppercase leading-3 tracking-widest text-foreground-secondary',
              )}
            >
              {t('app.workspace', {}, { defaultValue: 'Molecule Studios' })}
            </p>
          </div>
        </div>

        <nav
          data-mol-id="sidebar-nav"
          className={cm.cn(
            cm.flex1,
            cm.sp('px', 3),
            cm.sp('pt', 2),
            'overflow-y-auto text-foreground-secondary',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-0.5')}>
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.to}
                data-mol-id={item.id}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2.5),
                    'rounded-md text-[15px] transition-colors',
                    isActive
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'font-medium text-foreground-secondary hover:bg-border/80',
                  )
                }
              >
                <span className={cm.cn('material-symbols-outlined text-[20px]')}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className={cm.cn(cm.sp('p', 4), 'border-t border-border')}>
          <button
            data-mol-id="button-new-message"
            type="button"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
              'w-full rounded-lg border-none bg-primary py-2.5 text-sm font-semibold text-on-primary',
              'shadow-sm shadow-primary/30 transition hover:bg-primary/90',
            )}
            onClick={() => {
              setMobileNavOpen(false)
              navigate('/channels/general')
            }}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[18px] text-on-primary')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              edit_square
            </span>
            {t('dashboard.newMessage', {}, { defaultValue: 'New Message' })}
          </button>
        </div>
      </aside>

      <header
        data-mol-id="header"
        className={cm.cn(
          'fixed left-0 top-0 z-50 box-border flex h-14 w-full items-center border-b',
          cm.sp('px', 6),
          'border-border bg-surface',
          'min-[901px]:left-[260px] min-[901px]:w-[calc(100%-260px)]',
        )}
      >
        <button
          type="button"
          className={cm.cn(cm.button({ variant: 'ghost' }), cm.sp('mr', 3), 'min-[901px]:hidden')}
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-label={t('nav.toggleSidebar', {}, { defaultValue: 'Toggle sidebar' })}
        >
          <span className={cm.cn('material-symbols-outlined')}>menu</span>
        </button>
        <nav
          data-mol-id="header-nav"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            'text-sm text-foreground-secondary',
          )}
        >
          <span>{t('nav.home', {}, { defaultValue: 'Home' })}</span>
        </nav>
        <div className={cm.cn('ml-auto')}>
          <button
            type="button"
            className={cm.cn(cm.button({ variant: 'ghost' }))}
            onClick={toggleTheme}
            aria-label={t('theme.toggle', {}, { defaultValue: 'Toggle theme' })}
          >
            <span className={cm.cn('material-symbols-outlined')}>
              {mode === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      <main
        data-mol-id="main-content"
        className={cm.cn(
          'fixed bottom-0 left-0 right-0 top-14 box-border flex min-w-0 flex-col overflow-auto',
          'bg-[rgb(250,248,255)]',
          'min-[901px]:left-[260px] min-[901px]:w-[calc(100%-260px)]',
        )}
      >
        <Outlet />
      </main>

      <button
        data-mol-id="fab"
        type="button"
        className={cm.cn(
          'fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full border-none',
          'bg-primary text-on-primary shadow-lg shadow-primary/40 transition hover:bg-primary/90',
        )}
        onClick={() => navigate('/channels/general')}
        aria-label={t('dashboard.newMessage', {}, { defaultValue: 'New Message' })}
      >
        <span
          className={cm.cn('material-symbols-outlined text-2xl text-on-primary')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          edit_square
        </span>
      </button>
      {mobileNavOpen && (
        <button
          type="button"
          aria-label={t('nav.closeSidebar', {}, { defaultValue: 'Close sidebar' })}
          onClick={() => setMobileNavOpen(false)}
          className={cm.cn('fixed inset-0 z-[55] border-none bg-foreground/40 min-[901px]:hidden')}
        />
      )}
      <style>{`
        @media (min-width: 901px) {
          [data-mol-id="channel-sidebar"] {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </div>
  )
}
