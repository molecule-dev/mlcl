import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

/**
 * Reports top bar — the shared `ResponsiveAppShell.TopBar` (the mobile menu
 * trigger is the shell's). Title + reporting-period chip are the brand slot;
 * the notifications button the actions slot.
 */
export default function TopAppBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <ResponsiveAppShell.TopBar
      className="w-full h-16 px-4 md:px-8 bg-surface/80 backdrop-blur-md"
      brand={
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 md:gap-5 min-w-0')}>
          <h1
            className={cm.cn(
              cm.textSize('xl'),
              'font-extrabold tracking-tight text-on-surface truncate',
            )}
          >
            {t('topAppBar.title', {}, { defaultValue: 'Support Reports' })}
          </h1>
          <div className={cm.cn(cm.h(4), 'w-px bg-outline-variant/30 hidden sm:block')}></div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 3 }),
              cm.sp('px', 3),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'py-1.5 rounded-md bg-surface-container-low text-on-surface-variant whitespace-nowrap',
            )}
            aria-label={t('topAppBar.reportingPeriod', {}, { defaultValue: 'Reporting period' })}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              calendar_today
            </span>
            <span>{t('topAppBar.last7Days', {}, { defaultValue: 'Last 30 Days' })}</span>
          </div>
        </div>
      }
      actions={
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
      }
    />
  )
}
export { TopAppBar }
