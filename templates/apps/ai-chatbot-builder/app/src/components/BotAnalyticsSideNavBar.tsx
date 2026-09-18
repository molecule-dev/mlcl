import { Link, useParams } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
function BotAnalyticsSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth<{ name?: string; email?: string }>()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('py', 8),
        cm.sp('px', 4),
        "h-screen w-64 fixed left-0 top-0 bg-surface-container-low font-['Plus_Jakarta_Sans'] antialiased tracking-wide",
      )}
      data-mol-id="sidebar-01"
    >
      <div className={cm.cn(cm.sp('mb', 10), cm.sp('px', 4))}>
        <div
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center' }),
            'text-foreground gap-2',
          )}
        >
          <span
            className={cm.cn(cm.textPrimary, 'material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            smart_toy
          </span>
          {t('sidebar.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </div>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            cm.sp('mt', 1),
            'text-outline uppercase tracking-widest',
          )}
        >
          {t('sidebar.tagline', {}, { defaultValue: 'AI Chatbot Builder' })}
        </p>
      </div>
      <nav className={cm.cn(cm.flex1, 'space-y-1')}>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 text-foreground-secondary hover:bg-border/50',
          )}
          data-mol-id="nav-dash"
          to="/"
        >
          <span className={cm.cn('material-symbols-outlined')}>dashboard</span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 text-foreground-secondary hover:bg-border/50',
          )}
          data-mol-id="nav-bots"
          to="/bots"
        >
          <span className={cm.cn('material-symbols-outlined')}>robot_2</span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.bots', {}, { defaultValue: 'My Bots' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 text-foreground-secondary hover:bg-border/50',
          )}
          data-mol-id="nav-knowledge-base"
          to="/knowledge-base"
        >
          <span className={cm.cn('material-symbols-outlined')}>menu_book</span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.knowledgeBase', {}, { defaultValue: 'Knowledge Base' })}
          </span>
        </Link>
        {/* Active State: Analytics */}
        <Link
          className={cm.cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-primary font-bold relative before:content-[''] before:absolute before:left-0 before:w-0.5 before:h-6 before:bg-tertiary-fixed-dim before:rounded-full bg-surface/50",
          )}
          data-mol-id="nav-analytics"
          to={`/bots/${id}/analytics`}
        >
          <span className={cm.cn('material-symbols-outlined')}>analytics</span>
          <span className={cm.fontWeight('bold')}>
            {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 text-foreground-secondary hover:bg-border/50',
          )}
          data-mol-id="nav-integrations"
          to="/integrations"
        >
          <span className={cm.cn('material-symbols-outlined')}>extension</span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 text-foreground-secondary hover:bg-border/50',
          )}
          data-mol-id="nav-test-chat"
          to="/test-chat"
        >
          <span className={cm.cn('material-symbols-outlined')}>forum</span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.testChat', {}, { defaultValue: 'Test Chat' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 text-foreground-secondary hover:bg-border/50',
          )}
          data-mol-id="nav-settings"
          to="/settings"
        >
          <span className={cm.cn('material-symbols-outlined')}>settings</span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </Link>
      </nav>
      <div
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('pt', 6),
          cm.flex({ align: 'center' }),
          'mt-auto border-t border-outline-variant/20 gap-3',
        )}
      >
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'shrink-0 bg-surface-container-highest text-on-surface-variant ring-2 ring-primary/10',
          )}
          aria-hidden="true"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="person">
            person
          </span>
        </div>
        <div className={cm.cn('overflow-hidden')}>
          <p
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface truncate')}
          >
            {user?.name || user?.email || t('userMenu.guestName', {}, { defaultValue: 'Account' })}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-outline truncate')}>
            {user?.name && user?.email
              ? user.email
              : t('sidebar.userPlan', {}, { defaultValue: 'Pro Plan' })}
          </p>
        </div>
      </div>
    </aside>
  )
}

export default BotAnalyticsSideNavBar
export { BotAnalyticsSideNavBar }
