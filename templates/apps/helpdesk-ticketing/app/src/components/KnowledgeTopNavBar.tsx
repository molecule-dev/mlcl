import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MobileNavHamburger } from './MobileNavDrawer.js'
import { UserMenu } from './UserMenu.js'

function KnowledgeTopNavBar() {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        cm.h(16),
        'fixed top-0 right-0 left-0 md:left-[240px] z-40 bg-surface/80 backdrop-blur-xl shadow-sm dark:shadow-none',
      )}
      data-mol-id="top-nav-1"
    >
      <div
        className={cm.cn(cm.flex({ align: 'center' }), 'gap-3 md:gap-8 min-w-0')}
        data-mol-id="top-nav-left"
      >
        <MobileNavHamburger />
        <span
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('semibold'),
            'text-foreground truncate',
          )}
          data-mol-id="top-nav-title"
        >
          {t('knowledgeTopNavBar.title', {}, { defaultValue: 'Knowledge Base' })}
        </span>
        {/*
         * The original design had `/knowledge-base/categories` and
         * `/knowledge-base/drafts` tabs — both of which routed nowhere in
         * the actual SPA, so clicking them would fall through to the
         * catch-all redirect. Until those views actually exist, ship a
         * single Articles tab so every clickable affordance navigates to
         * something real.
         */}
        <nav
          className={cm.cn(
            cm.flex({ align: 'center', gap: 6 }),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'hidden md:flex',
          )}
          data-mol-id="top-nav-links"
        >
          <Link
            className={cm.cn(
              cm.sp('pb', 5),
              'text-sky-600 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400',
            )}
            data-mol-id="top-link-articles"
            to="/knowledge-base"
          >
            {t('knowledgeTopNavBar.articles', {}, { defaultValue: 'Articles' })}
          </Link>
        </nav>
      </div>
      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 4 }), 'relative')}
        data-mol-id="top-nav-right"
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          <button
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'text-foreground-secondary hover:bg-surface-secondary transition-colors',
            )}
            data-mol-id="icon-notif"
            onClick={() => navigate('/notifications')}
            aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="notifications">
              notifications
            </span>
          </button>
          <UserMenu />
        </div>
        <button
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95',
          )}
          data-mol-id="cta-create-top"
          onClick={() => navigate('/knowledge-base/new')}
        >
          {t('knowledgeTopNavBar.createArticle', {}, { defaultValue: 'Create Article' })}
        </button>
      </div>
    </header>
  )
}

export default KnowledgeTopNavBar
export { KnowledgeTopNavBar }
