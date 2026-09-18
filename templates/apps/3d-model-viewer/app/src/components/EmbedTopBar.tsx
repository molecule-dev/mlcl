import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'
interface EmbedTopBarProps {
  modelName: string
  modelId: string
}
function EmbedTopBar({ modelName, modelId }: EmbedTopBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header
      className={cm.cn(
        cm.w('full'),
        cm.h(16),
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 6),
        'bg-surface-container-highest/60 backdrop-blur-xl z-10 sticky top-0 border-b border-surface-container-low',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.textSize('sm'),
          "font-['Inter'] tracking-tight",
        )}
      >
        <Link
          className={cm.cn('text-on-surface-variant hover:text-on-surface transition-colors')}
          to="/models"
        >
          {t('nav.models', {}, { defaultValue: 'Models' })}
        </Link>
        <span
          className={cm.cn(
            cm.sp('mx', 2),
            'material-symbols-outlined text-on-surface-variant text-[16px]',
          )}
          data-icon="chevron_right"
        >
          chevron_right
        </span>
        <Link
          className={cm.cn('text-on-surface-variant hover:text-on-surface transition-colors')}
          to={`/models/${modelId}`}
        >
          {modelName || t('form.model', {}, { defaultValue: 'Model' })}
        </Link>
        <span
          className={cm.cn(
            cm.sp('mx', 2),
            'material-symbols-outlined text-on-surface-variant text-[16px]',
          )}
          data-icon="chevron_right"
        >
          chevron_right
        </span>
        <span className={cm.cn(cm.fontWeight('medium'), 'text-primary')}>
          {t('embedTopBar.embed', {}, { defaultValue: 'Embed' })}
        </span>
      </div>
      <div className={cm.flex({ align: 'center', gap: 4 })}>
        <Link
          className={cm.cn(
            'text-on-surface-variant hover:text-on-surface hover:bg-surface/5 p-2 rounded-full transition-colors active:scale-95',
          )}
          to="/notifications"
        >
          <span className="material-symbols-outlined" data-icon="notifications">
            notifications
          </span>
        </Link>
        <Link
          className={cm.cn(
            'text-on-surface-variant hover:text-on-surface hover:bg-surface/5 p-2 rounded-full transition-colors active:scale-95',
          )}
          to="/settings"
        >
          <span className="material-symbols-outlined" data-icon="settings">
            settings
          </span>
        </Link>
        <UserMenu />
      </div>
    </header>
  )
}

export default EmbedTopBar
export { EmbedTopBar }
