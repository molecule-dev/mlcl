import { Link } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
function KnowledgeBaseSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ name?: string; email?: string }>()
  return (
    <aside
      className={cm.cn(
        'w-[240px]',
        cm.flex({ direction: 'col' }),
        cm.textSize('sm'),
        cm.fontWeight('medium'),
        'h-screen sticky left-0 top-0 h-full border-r border-border/20 bg-surface-secondary font-inter antialiased',
      )}
    >
      <div className={cm.sp('p', 6)}>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <div
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-lg bg-primary text-on-primary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
              data-icon="smart_toy"
            >
              smart_toy
            </span>
          </div>
          <div>
            <div
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'tracking-tight text-foreground',
              )}
            >
              {t(
                'knowledgeBaseSideNavBar.appName',
                { appName: APP_NAME },
                { defaultValue: '{{appName}}' },
              )}
            </div>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-[0.1em] text-outline',
              )}
            >
              {t('knowledgeBaseSideNavBar.appSubtitle', {}, { defaultValue: 'AI Architect' })}
            </p>
          </div>
        </div>
      </div>
      <nav className={cm.cn(cm.flex1, cm.sp('px', 4), cm.stack(1), cm.sp('mt', 4))}>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 3),
            'gap-3 py-3 rounded-xl text-foreground-secondary hover:bg-border/50 transition-colors duration-150 group',
          )}
          to="/"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="dashboard">
            dashboard
          </span>
          <span>{t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}</span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 3),
            'gap-3 py-3 rounded-xl text-foreground-secondary hover:bg-border/50 transition-colors duration-150 group',
          )}
          to="/bots"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="smart_toy">
            smart_toy
          </span>
          <span>{t('knowledgeBaseSideNavBar.navMyBots', {}, { defaultValue: 'My Bots' })}</span>
        </Link>
        {/* Active State: Knowledge Base */}
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 3),
            'gap-3 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-semibold transition-colors duration-150 group',
          )}
          to="/knowledge-base"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="database">
            database
          </span>
          <span>
            {t('knowledgeBaseSideNavBar.navKnowledgeBase', {}, { defaultValue: 'Knowledge Base' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 3),
            'gap-3 py-3 rounded-xl text-foreground-secondary hover:bg-border/50 transition-colors duration-150 group',
          )}
          to="/test-chat"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="forum">
            forum
          </span>
          <span>{t('knowledgeBaseSideNavBar.navTestChat', {}, { defaultValue: 'Test Chat' })}</span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 3),
            'gap-3 py-3 rounded-xl text-foreground-secondary hover:bg-border/50 transition-colors duration-150 group',
          )}
          to="/integrations"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="extension">
            extension
          </span>
          <span>{t('nav.integrations', {}, { defaultValue: 'Integrations' })}</span>
        </Link>
        <div className={cm.cn(cm.sp('pt', 4), cm.sp('mt', 4), 'border-t border-border/50')}>
          <Link
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 3),
              'gap-3 py-3 rounded-xl text-foreground-secondary hover:bg-border/50 transition-colors duration-150 group',
            )}
            to="/settings"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="settings">
              settings
            </span>
            <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
          </Link>
        </div>
      </nav>
      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.sp('m', 4),
          'bg-surface-secondary/50 mt-auto rounded-xl',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <div
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'shrink-0 bg-surface-container-highest text-on-surface-variant',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-base')} data-icon="person">
              person
            </span>
          </div>
          <div className={cm.cn('overflow-hidden')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-foreground truncate',
              )}
            >
              {user?.name ||
                user?.email ||
                t('userMenu.guestName', {}, { defaultValue: 'Account' })}
            </p>
            <p className={cm.cn('text-[10px] text-foreground-secondary truncate')}>
              {user?.name && user?.email
                ? user.email
                : t('knowledgeBaseSideNavBar.userPlan', {}, { defaultValue: 'Pro Plan' })}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default KnowledgeBaseSideNavBar
export { KnowledgeBaseSideNavBar }
