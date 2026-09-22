import { Link, useNavigate, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import MobileNavMenu, { useMainNavItems } from './MobileNavMenu.js'
import UserMenu from './UserMenu.js'

interface BotEditorTopBarProps {
  botName?: string
}
export default function BotEditorTopBar({ botName }: BotEditorTopBarProps) {
  const cm = getClassMap()
  const navItems = useMainNavItems()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        cm.textSize('sm'),
        "fixed top-0 right-0 left-0 md:left-60 h-16 backdrop-blur-xl border-b border-surface/5 z-40 font-['Inter'] tracking-wide",
      )}
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-editor-shell) 70%, transparent)' }}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        {/* Mobile hamburger + drawer (fleet pattern) */}
        <MobileNavMenu items={navItems} />
        <h1 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
          {botName ?? t('botEditorTopBar.untitledBot', {}, { defaultValue: 'Untitled bot' })}
        </h1>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-6')}>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
          <Link
            className={cm.cn(
              'text-foreground-tertiary dark:text-outline-variant hover:text-indigo-300 dark:hover:text-[var(--mol-color-primary-light)] transition-all flex items-center gap-2',
            )}
            to={`/test-chat?botId=${id}`}
          >
            <span
              className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
              data-icon="play_circle"
            >
              play_circle
            </span>
            {t('botEditorTopBar.test', {}, { defaultValue: 'Test' })}
          </Link>
          <Link
            className={cm.cn(
              'bg-primary px-5 py-1.5 rounded-lg text-on-primary font-semibold hover:opacity-90 active:opacity-80 transition-all',
            )}
            to={`/bots/${id}/deploy`}
          >
            {t('botEditorTopBar.deploy', {}, { defaultValue: 'Deploy' })}
          </Link>
        </div>
        <div className={cm.cn(cm.h(4), 'w-px', cm.sp('mx', 2), 'bg-surface/10')}></div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            'gap-4 text-foreground-tertiary dark:text-outline-variant',
          )}
        >
          <button
            type="button"
            aria-label={t('botEditorTopBar.botSettings', {}, { defaultValue: 'Bot settings' })}
            className={cm.cn(
              cm.cursorPointer,
              'material-symbols-outlined hover:text-indigo-300 transition-colors',
            )}
            data-icon="settings"
            onClick={() => navigate(`/bots/${id}/settings`)}
          >
            settings
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
export { BotEditorTopBar }
