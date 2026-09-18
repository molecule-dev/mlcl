import { useState } from 'react'
import { Link } from 'react-router'
import { useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export default function AgentDashboardTopAppBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ name?: string; email?: string }>()
  const firstName =
    user?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    t('common.agent', {}, { defaultValue: 'Agent' })
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  return (
    <>
      {/* TopAppBar */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 4),
          'w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-md shadow-sm',
        )}
        data-mol-id="top_app_bar"
      >
        <div data-mol-id="top_bar_left">
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'text-success tracking-tight',
            )}
            data-mol-id="welcome_header"
          >
            {t(
              'agentDashboard.greeting',
              { firstName },
              { defaultValue: 'Good morning, {{firstName}}' },
            )}
          </h2>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-foreground-secondary',
            )}
            data-mol-id="welcome_subtitle"
          >
            {t(
              'agentDashboard.welcomeBack',
              { appName: APP_NAME },
              { defaultValue: 'Welcome back to {{appName}}' },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'lg' })} data-mol-id="top_bar_right">
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'text-foreground-secondary')}
            data-mol-id="icon_actions"
          >
            <button
              className={cm.cn(
                cm.sp('p', 2),
                cm.roundedFull,
                'material-symbols-outlined hover:bg-surface-secondary transition-colors',
              )}
              data-mol-id="notif_btn"
              onClick={() => setNotifOpen((o) => !o)}
              aria-expanded={notifOpen}
              aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            >
              notifications
            </button>
            <Link
              className={cm.cn(
                'material-symbols-outlined hover:bg-surface-secondary p-2 rounded-full transition-colors',
              )}
              data-mol-id="help_btn"
              to="/help"
            >
              help
            </Link>
          </div>
          <button
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 6),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'bg-primary-container text-on-primary-container py-2.5 rounded-xl hover:opacity-90 active:scale-95 duration-150 shadow-lg shadow-primary/10',
            )}
            data-mol-id="cta_add_listing"
            onClick={() => navigate('/admin/listings/new')}
          >
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>add</span>

            {t('agentDashboard.addListing', {}, { defaultValue: 'Add Listing' })}
          </button>
          <button
            type="button"
            className={cm.cn(
              cm.h(10),
              cm.w(10),
              cm.roundedFull,
              cm.cursorPointer,
              'overflow-hidden bg-border ring-2 ring-emerald-50',
            )}
            data-mol-id="profile_avatar"
            onClick={() => navigate('/admin/settings')}
          >
            <img
              alt={t(
                'agentDashboard.profileAvatarAlt',
                {},
                { defaultValue: 'Agent Profile Avatar' },
              )}
              className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
              data-alt="professional headshot of a middle-aged male real estate agent with a friendly smile wearing a dark navy suit"
              src="https://picsum.photos/seed/AgentDashboardTopAppBar-1/1200/800"
            />
          </button>
        </div>
      </header>
    </>
  )
}
export { AgentDashboardTopAppBar }
