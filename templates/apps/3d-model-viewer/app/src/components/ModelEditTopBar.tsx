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
        'docked full-width top-0 sticky z-40 bg-background/70 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(26,26,46,0.06)]',
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
        <UserMenu />
      </div>
    </header>
  )
}

export default ModelEditTopBar
export { ModelEditTopBar }
