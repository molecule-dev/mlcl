import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
function BotDeploySideNavBar() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <>
      {/* Sidebar Navigation */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('py', 8),
          cm.sp('px', 6),
          cm.w(64),
          cm.h('screen'),
          'fixed left-0 top-0 bg-surface-container-low z-50 overflow-y-auto',
          'hidden md:flex', // mobile: drawer in top bar instead
        )}
      >
        <div className={cm.cn(cm.sp('mb', 10), cm.flex({ align: 'center' }), 'gap-3')}>
          <BrandWordmark as="span" />
        </div>
        <nav className={cm.cn(cm.flex1, 'space-y-1')}>
          <Link
            className={cm.cn(
              'flex items-center gap-3 py-3 px-4 text-on-background/60 font-medium hover:text-on-background transition-all duration-300 rounded-xl hover:bg-surface-container-highest/50',
            )}
            to="/"
          >
            <span className={cm.cn('material-symbols-outlined')}>dashboard</span>
            <span className={cm.cn(cm.textSize('sm'), 'tracking-wide')}>
              {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
            </span>
          </Link>
          <Link
            className={cm.cn(
              "flex items-center gap-3 py-3 px-4 text-tertiary font-bold relative before:content-[''] before:absolute before:left-0 before:w-[2px] before:h-6 before:bg-tertiary before:rounded-full rounded-xl bg-surface/40",
            )}
            to="/bots"
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              smart_toy
            </span>
            <span className={cm.cn(cm.textSize('sm'), 'tracking-wide')}>
              {t('botDeploySideNavBar.myBots', {}, { defaultValue: 'My Bots' })}
            </span>
          </Link>
          <Link
            className={cm.cn(
              'flex items-center gap-3 py-3 px-4 text-on-background/60 font-medium hover:text-on-background transition-all duration-300 rounded-xl hover:bg-surface-container-highest/50',
            )}
            to="/integrations"
          >
            <span className={cm.cn('material-symbols-outlined')}>hub</span>
            <span className={cm.cn(cm.textSize('sm'), 'tracking-wide')}>
              {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
            </span>
          </Link>
          <Link
            className={cm.cn(
              'flex items-center gap-3 py-3 px-4 text-on-background/60 font-medium hover:text-on-background transition-all duration-300 rounded-xl hover:bg-surface-container-highest/50',
            )}
            to="/knowledge-base"
          >
            <span className={cm.cn('material-symbols-outlined')}>menu_book</span>
            <span className={cm.cn(cm.textSize('sm'), 'tracking-wide')}>
              {t('botDeploySideNavBar.knowledgeBase', {}, { defaultValue: 'Knowledge Base' })}
            </span>
          </Link>
          <Link
            className={cm.cn(
              'flex items-center gap-3 py-3 px-4 text-on-background/60 font-medium hover:text-on-background transition-all duration-300 rounded-xl hover:bg-surface-container-highest/50',
            )}
            to="/test-chat"
          >
            <span className={cm.cn('material-symbols-outlined')}>forum</span>
            <span className={cm.cn(cm.textSize('sm'), 'tracking-wide')}>
              {t('botDeploySideNavBar.testChat', {}, { defaultValue: 'Test Chat' })}
            </span>
          </Link>
          <Link
            className={cm.cn(
              'flex items-center gap-3 py-3 px-4 text-on-background/60 font-medium hover:text-on-background transition-all duration-300 rounded-xl hover:bg-surface-container-highest/50',
            )}
            to="/settings"
          >
            <span className={cm.cn('material-symbols-outlined')}>settings</span>
            <span className={cm.cn(cm.textSize('sm'), 'tracking-wide')}>
              {t('nav.settings', {}, { defaultValue: 'Settings' })}
            </span>
          </Link>
        </nav>
        <div className={cm.cn(cm.sp('pt', 8), 'mt-auto')}>
          <Link
            className={cm.cn(
              'w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all duration-300 transform active:scale-95',
            )}
            to="/bots/new"
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>add</span>
            <span className={cm.textSize('sm')}>
              {t('botDeploySideNavBar.newBot', {}, { defaultValue: 'New Bot' })}
            </span>
          </Link>
        </div>
      </aside>
    </>
  )
}

export default BotDeploySideNavBar
export { BotDeploySideNavBar }
