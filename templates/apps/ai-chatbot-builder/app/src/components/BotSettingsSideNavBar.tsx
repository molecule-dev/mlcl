import { Link, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
export default function BotSettingsSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('py', 8),
        'h-screen w-64 fixed left-0 top-0 bg-surface-container-low z-20',
      )}
    >
      <div className={cm.cn(cm.sp('px', 8), cm.sp('mb', 10))}>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              'rounded-lg bg-gradient-to-br from-primary to-tertiary-fixed-dim text-white',
            )}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
          </div>
          <div>
            <h1
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'font-headline text-on-surface leading-tight',
              )}
            >
              {t(
                'botSettingsSideNavBar.brandName',
                { appName: APP_NAME },
                { defaultValue: '{{appName}}' },
              )}
            </h1>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              {t('botSettingsSideNavBar.tagline', {}, { defaultValue: 'AI Chatbot Builder' })}
            </p>
          </div>
        </div>
      </div>
      <nav className={cm.cn(cm.flex1, cm.sp('px', 4), cm.stack(1))}>
        <Link
          className={cm.cn(
            'flex items-center gap-3 text-on-surface-variant py-3 px-4 rounded-xl hover:text-primary transition-all group',
          )}
          to="/"
        >
          <span className={'material-symbols-outlined'}>dashboard</span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 text-on-surface-variant py-3 px-4 rounded-xl hover:text-primary transition-all group',
          )}
          to="/bots"
        >
          <span className={'material-symbols-outlined'}>robot_2</span>
          <span className={cm.fontWeight('medium')}>
            {t('botSettingsSideNavBar.myBots', {}, { defaultValue: 'My Bots' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 text-on-surface-variant py-3 px-4 rounded-xl hover:text-primary transition-all group',
          )}
          to="/integrations"
        >
          <span className={'material-symbols-outlined'}>extension</span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 text-on-surface-variant py-3 px-4 rounded-xl hover:text-primary transition-all group',
          )}
          to="/knowledge-base"
        >
          <span className={'material-symbols-outlined'}>database</span>
          <span className={cm.fontWeight('medium')}>
            {t('botSettingsSideNavBar.knowledgeBase', {}, { defaultValue: 'Knowledge Base' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 text-on-surface-variant py-3 px-4 rounded-xl hover:text-primary transition-all group',
          )}
          to="/test-chat"
        >
          <span className={'material-symbols-outlined'}>chat_bubble</span>
          <span className={cm.fontWeight('medium')}>
            {t('botSettingsSideNavBar.testChat', {}, { defaultValue: 'Test Chat' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            "relative flex items-center gap-3 text-primary font-bold py-3 px-4 rounded-xl before:content-[''] before:absolute before:left-0 before:w-0.5 before:h-6 before:bg-tertiary before:rounded-full before:translate-x-[-8px] bg-surface-container-lowest",
          )}
          to={`/bots/${id}/settings`}
        >
          <span className={'material-symbols-outlined'}>settings</span>
          <span className={cm.fontWeight('medium')}>
            {t('botSettingsSideNavBar.botSettings', {}, { defaultValue: 'Bot Settings' })}
          </span>
        </Link>
      </nav>
      <div className={cm.cn(cm.sp('px', 6), 'mt-auto')}>
        <Link
          className={cm.cn(
            'w-full py-3 rounded-3xl bg-gradient-to-r from-primary to-tertiary-fixed-dim text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform',
          )}
          to="/bots/new"
        >
          <span className={cm.cn('material-symbols-outlined')}>add</span>
          <span>{t('botSettingsSideNavBar.newBot', {}, { defaultValue: 'New Bot' })}</span>
        </Link>
      </div>
    </aside>
  )
}
export { BotSettingsSideNavBar }
