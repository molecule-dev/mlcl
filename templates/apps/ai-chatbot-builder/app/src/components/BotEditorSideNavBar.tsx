import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

function BotEditorSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [botActive, setBotActive] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('py', 6),
        cm.sp('px', 4),
        cm.textSize('sm'),
        "h-screen w-60 fixed left-0 top-0 bg-foreground h-full z-50 font-['Inter'] antialiased tracking-tight",
        'hidden md:flex', // mobile: drawer in top bar instead
      )}
      style={{ backgroundColor: 'var(--color-editor-sidebar)' }}
    >
      <div
        className={cm.cn(cm.sp('mb', 10), cm.sp('px', 2), cm.flex({ direction: 'col' }), 'gap-1')}
      >
        <span
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'tracking-tighter text-indigo-400 dark:text-inverse-primary',
          )}
        >
          {APP_NAME}
        </span>
        <span
          className={cm.cn(
            'text-[10px] uppercase tracking-[0.2em] text-on-surface-variant opacity-60',
          )}
        >
          {t('botEditorSideNavBar.tagline', {}, { defaultValue: 'AI Logic Forge' })}
        </span>
      </div>
      <nav className={cm.cn(cm.flex1, 'space-y-1')}>
        <Link
          to="/"
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.cursorPointer,
            cm.fontWeight('medium'),
            'gap-3 rounded-xl text-foreground-tertiary dark:text-outline-variant hover:bg-foreground/50 hover:bg-surface-container-high/50 transition-colors group',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="dashboard">
            dashboard
          </span>
          <span>{t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}</span>
        </Link>
        {/* Active Item: My Bots */}
        <Link
          to="/bots"
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-high text-primary font-bold cursor-default',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="smart_toy">
            smart_toy
          </span>
          <span>{t('botEditorSideNavBar.myBots', {}, { defaultValue: 'My Bots' })}</span>
        </Link>
        <Link
          to="/knowledge-base"
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl text-foreground-tertiary dark:text-outline-variant font-medium hover:bg-foreground/50 hover:bg-surface-container-high/50 transition-colors cursor-pointer',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="database">
            database
          </span>
          <span>
            {t('botEditorSideNavBar.knowledgeBase', {}, { defaultValue: 'Knowledge Base' })}
          </span>
        </Link>
        <Link
          to="/test-chat"
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl text-foreground-tertiary dark:text-outline-variant font-medium hover:bg-foreground/50 hover:bg-surface-container-high/50 transition-colors cursor-pointer',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="forum">
            forum
          </span>
          <span>{t('botEditorSideNavBar.testChat', {}, { defaultValue: 'Test Chat' })}</span>
        </Link>
        <Link
          to={`/bots/${id}/analytics`}
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.cursorPointer,
            cm.fontWeight('medium'),
            'gap-3 rounded-xl text-foreground-tertiary dark:text-outline-variant hover:bg-foreground/50 hover:bg-surface-container-high/50 transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="analytics">
            analytics
          </span>
          <span>{t('nav.analytics', {}, { defaultValue: 'Analytics' })}</span>
        </Link>
        <Link
          to="/integrations"
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl text-foreground-tertiary dark:text-outline-variant font-medium hover:bg-foreground/50 hover:bg-surface-container-high/50 transition-colors cursor-pointer',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="extension">
            extension
          </span>
          <span>{t('nav.integrations', {}, { defaultValue: 'Integrations' })}</span>
        </Link>
        <Link
          to={`/bots/${id}/settings`}
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl text-foreground-tertiary dark:text-outline-variant font-medium hover:bg-foreground/50 hover:bg-surface-container-high/50 transition-colors cursor-pointer',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="settings">
            settings
          </span>
          <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
        </Link>
      </nav>
      <div className={cm.cn(cm.sp('pt', 6), 'mt-auto border-t border-surface/5')}>
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.flex({ direction: 'col' }),
            'bg-surface-container rounded-xl gap-3',
          )}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] text-on-surface-variant uppercase tracking-wider',
              )}
            >
              {t('botEditorSideNavBar.activeBotLabel', {}, { defaultValue: 'Active Bot' })}
            </span>
            <Switch
              checked={botActive}
              onChange={(e) => setBotActive((e.target as HTMLInputElement).checked)}
              size="sm"
              aria-label={t(
                'botEditorSideNavBar.activeBotLabel',
                {},
                { defaultValue: 'Active Bot' },
              )}
            />
          </div>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
            <span
              className={cm.cn(cm.textSize('base'), 'material-symbols-outlined text-primary')}
              data-icon="toggle_on"
            >
              toggle_on
            </span>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'text-on-surface truncate',
              )}
            >
              {t(
                'botEditorSideNavBar.currentBotName',
                {},
                { defaultValue: 'Customer Support Bot' },
              )}
            </span>
          </div>
        </div>
        <button
          className={cm.cn(
            cm.w('full'),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('px', 4),
            cm.fontWeight('semibold'),
            'mt-4 bg-indigo-200 text-indigo-950 py-2.5 rounded-xl gap-2 hover:bg-indigo-100 transition-colors active:scale-[0.98] dark:bg-indigo-300/90 dark:text-indigo-950 dark:hover:bg-indigo-200',
          )}
          onClick={() =>
            setNotice(
              t(
                'botEditorSideNavBar.newNodeUnavailable',
                {},
                { defaultValue: 'Node templates are coming soon. Use existing nodes for now.' },
              ),
            )
          }
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')} data-icon="add">
            add
          </span>
          {t('botEditorSideNavBar.newNode', {}, { defaultValue: 'New Node' })}
        </button>
        {notice && (
          <div
            className={cm.cn(
              cm.sp('mt', 3),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('xs'),
              'rounded-lg bg-surface-container text-on-surface-variant',
            )}
          >
            {notice}
          </div>
        )}
      </div>
    </aside>
  )
}

export default BotEditorSideNavBar
export { BotEditorSideNavBar }
