import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function TopAppBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.w('full'),
        cm.h(16),
        'fixed top-0 right-0 left-[240px] z-40 bg-surface/80 backdrop-blur-md',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 5 })}>
        <h1 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('topAppBar.title', {}, { defaultValue: 'Support Reports' })}
        </h1>
        <div className={cm.cn(cm.h(4), 'w-px bg-outline-variant/30')}></div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 3),
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'py-1.5 rounded-md bg-surface-container-low text-on-surface-variant',
          )}
          aria-label={t('topAppBar.reportingPeriod', {}, { defaultValue: 'Reporting period' })}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
            calendar_today
          </span>
          <span>{t('topAppBar.last7Days', {}, { defaultValue: 'Last 30 Days' })}</span>
        </div>
      </div>
      <div className={cm.flex({ align: 'center', gap: 5 })}>
        <button
          type="button"
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          className={cm.cn(
            cm.sp('p', 2),
            cm.cursorPointer,
            'material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors',
          )}
          onClick={() => navigate('/notifications')}
        >
          notifications
        </button>
      </div>
    </header>
  )
}
export { TopAppBar }
