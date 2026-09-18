import { Link, useNavigate } from 'react-router'

import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function BotEditorTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { themeName, setTheme } = useTheme()
  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        cm.textSize('sm'),
        "fixed top-0 right-0 left-64 h-16 backdrop-blur-xl w-full border-b border-surface/5 z-40 font-['Inter'] tracking-wide",
      )}
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-editor-shell) 70%, transparent)' }}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        <h1 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
          {t('botEditorTopNavBar.botName', {}, { defaultValue: 'Customer Support Bot' })}
        </h1>
        <span
          className={cm.cn(
            cm.sp('px', 2),
            'py-0.5 bg-surface-container-highest text-on-surface-variant rounded text-[10px] font-mono tracking-tighter',
          )}
        >
          {t('botEditorTopNavBar.version', { version: '2.3' }, { defaultValue: 'v{{version}}' })}
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-6')}>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
          <Link
            className={cm.cn(
              'text-foreground-tertiary dark:text-outline-variant hover:text-indigo-300 dark:hover:text-[var(--mol-color-primary-light)] transition-all flex items-center gap-2',
            )}
            to="/test-chat"
          >
            <span
              className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
              data-icon="play_circle"
            >
              play_circle
            </span>
            {t('botEditorTopNavBar.test', {}, { defaultValue: 'Test' })}
          </Link>
          <Link
            className={cm.cn(
              'bg-primary px-5 py-2 rounded-full text-on-primary font-bold hover:opacity-90 active:scale-95 transition-all',
            )}
            to="/bots/:id/deploy"
          >
            {t('botEditorTopNavBar.deploy', {}, { defaultValue: 'Deploy' })}
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
            aria-label={t('botEditorTopNavBar.toggleTheme', {}, { defaultValue: 'Toggle theme' })}
            className={cm.cn(
              cm.cursorPointer,
              'material-symbols-outlined hover:text-indigo-300 transition-colors',
            )}
            data-icon="dark_mode"
            onClick={() => setTheme(themeName === 'dark' ? 'light' : 'dark')}
          >
            dark_mode
          </button>
          <button
            type="button"
            aria-label={t('botEditorTopNavBar.openSettings', {}, { defaultValue: 'Open settings' })}
            className={cm.cn(
              cm.cursorPointer,
              'material-symbols-outlined hover:text-indigo-300 transition-colors',
            )}
            data-icon="settings"
            onClick={() => navigate('/settings')}
          >
            settings
          </button>
        </div>
      </div>
    </header>
  )
}

export default BotEditorTopNavBar
export { BotEditorTopNavBar }
