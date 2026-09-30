import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'
function ModelEditTopBar({ modelName }: { modelName?: string } = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.sp('py', 4),
        cm.w('full'),
        // md+ page chrome inside the shell's Content — sticky within the
        // scroll; the shell's mobile TopBar replaces it below the breakpoint.
        'hidden md:flex sticky top-0 z-20 bg-background/70 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(26,26,46,0.06)]',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          "font-['Inter'] tracking-wide",
        )}
      >
        <Link
          className={cm.cn(
            'text-on-surface-variant hover:text-primary-container hover:opacity-80 transition-opacity',
          )}
          to="/models"
        >
          {t('nav.models', {}, { defaultValue: 'Models' })}
        </Link>
        <span className="text-outline-variant">/</span>
        <span className={cm.cn('text-on-surface-variant')}>
          {modelName || t('modelEditTopBar.untitledModel', {}, { defaultValue: 'Untitled model' })}
        </span>
        <span className="text-outline-variant">/</span>
        <span className={cm.cn(cm.fontWeight('bold'), 'text-primary border-b-2 border-primary')}>
          {t('common.edit', {}, { defaultValue: 'Edit' })}
        </span>
      </div>
      <div className={cm.flex({ align: 'center', gap: 4 })}>
        <Link
          className={cm.cn(
            'text-on-surface-variant hover:text-primary-container transition-colors p-2 rounded-full hover:bg-surface-container',
          )}
          to="/notifications"
        >
          <span className="material-symbols-outlined" data-icon="notifications">
            notifications
          </span>
        </Link>
        {/* Styled host for the shared control — bare, it reads as an
            unstyled browser widget bolted onto the styled bar. */}
        <div className="text-on-surface-variant hover:text-on-surface hover:bg-surface/5 rounded-lg transition-colors">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default ModelEditTopBar
export { ModelEditTopBar }
