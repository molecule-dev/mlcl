import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function BotsListFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <footer
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('p', 6),
        'mt-auto bg-surface-container-low/50 border-t border-outline-variant/10',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-6')}>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
          <span className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-tertiary')}></span>
          <span
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-on-surface-variant')}
          >
            {t(
              'botsListFooter.systemStatus',
              {},
              { defaultValue: 'System Status: All systems operational' },
            )}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'material-symbols-outlined text-on-surface-variant',
            )}
          >
            cloud_done
          </span>
          <span
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-on-surface-variant')}
          >
            {t('botsListFooter.cloudSync', {}, { defaultValue: 'Cloud Sync Active' })}
          </span>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex(),
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'gap-4 text-outline-variant uppercase tracking-widest',
        )}
      >
        <Link className={cm.cn('hover:text-primary transition-colors')} to="/help">
          {t('botsListFooter.documentation', {}, { defaultValue: 'Documentation' })}
        </Link>
        <Link className={cm.cn('hover:text-primary transition-colors')} to="/settings/api-keys">
          {t('botsListFooter.apiKeys', {}, { defaultValue: 'API Keys' })}
        </Link>
        <Link className={cm.cn('hover:text-primary transition-colors')} to="/help">
          {t('botsListFooter.support', {}, { defaultValue: 'Support' })}
        </Link>
      </div>
    </footer>
  )
}
export { BotsListFooter }
