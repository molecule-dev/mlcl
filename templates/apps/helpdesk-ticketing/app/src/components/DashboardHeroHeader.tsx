import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function DashboardHeroHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'end', justify: 'between', wrap: 'wrap' }),
        'gap-x-6 gap-y-4',
      )}
    >
      <div>
        <h2 className={cm.cn(cm.textSize('4xl'), 'font-extrabold text-on-surface tracking-tight')}>
          {t('dashboardHeroHeader.title', {}, { defaultValue: 'Support Dashboard' })}
        </h2>
        <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {t(
            'dashboardHeroHeader.subtitle',
            {},
            { defaultValue: 'Overview of your active workspace performance' },
          )}
        </p>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', wrap: 'wrap' }),
          'gap-2',
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'text-on-surface-variant',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            'bg-surface-container-high',
          )}
        >
          {t(
            'dashboardHeroHeader.timeRange',
            { hours: 24 },
            { defaultValue: 'Last {{hours}} hours' },
          )}
        </span>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            'bg-surface-container border border-outline-variant/20',
          )}
        >
          {t(
            'dashboardHeroHeader.autoRefresh',
            { status: t('common.on', {}, { defaultValue: 'On' }) },
            { defaultValue: 'Auto-refresh: {{status}}' },
          )}
        </span>
      </div>
    </div>
  )
}
export { DashboardHeroHeader }
