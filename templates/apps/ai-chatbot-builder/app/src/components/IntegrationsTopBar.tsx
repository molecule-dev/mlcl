import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import UserMenu from './UserMenu.js'
function IntegrationsTopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.w('full'),
        cm.sp('px', 8),
        cm.h(16),
        'sticky top-0 z-30 ml-64 bg-surface/70 dark:bg-on-background/70 backdrop-blur-xl border-b border-border/20 dark:border-surface/5 shadow-sm shadow-on-background/5',
      )}
      data-mol-id="top-nav"
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        <h1
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'text-on-background font-headline',
          )}
        >
          {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
        </h1>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-6')}>
        <div
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'hidden md:flex items-center gap-6',
          )}
        >
          <Link
            className={cm.cn('text-foreground-secondary hover:text-primary transition-colors')}
            to="/help"
          >
            {t('integrationsTopBar.documentation', {}, { defaultValue: 'Documentation' })}
          </Link>
          <Link
            className={cm.cn('text-foreground-secondary hover:text-primary transition-colors')}
            to="/settings"
          >
            {t('integrationsTopBar.support', {}, { defaultValue: 'Support' })}
          </Link>
          <Link
            className={cm.cn('text-foreground-secondary hover:text-primary transition-colors')}
            to="/help#api"
          >
            {t('integrationsTopBar.api', {}, { defaultValue: 'API' })}
          </Link>
        </div>
        <div className={cm.cn(cm.h(6), 'w-px bg-outline-variant/30')}></div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
          <Link
            className={cm.cn(
              'ai-gradient-bg text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all',
            )}
            to="/bots"
          >
            {t('integrationsTopBar.deployBot', {}, { defaultValue: 'Deploy Bot' })}
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default IntegrationsTopBar
export { IntegrationsTopBar }
