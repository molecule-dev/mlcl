import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function DashboardPageHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [activeRange, setActiveRange] = useState<'realtime' | 'last24h'>('realtime')

  return (
    <section className={cm.cn(cm.flex({ justify: 'between', align: 'end' }))}>
      <div className={cm.stack(2)}>
        <h1
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('dashboardPageHeader.title', {}, { defaultValue: 'Architect Overview' })}
        </h1>
        <p className={cm.cn('text-on-surface-variant')}>
          {t(
            'dashboardPageHeader.subtitle',
            {},
            { defaultValue: 'Monitoring your neural agents across all active platforms.' },
          )}
        </p>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('p', 1),
          'bg-surface-container-low rounded-lg',
        )}
      >
        <button
          className={
            activeRange === 'realtime'
              ? 'px-3 py-1 text-xs font-semibold bg-surface shadow-sm rounded-md'
              : 'px-3 py-1 text-xs font-semibold text-on-surface-variant'
          }
          aria-pressed={activeRange === 'realtime'}
          onClick={() => setActiveRange('realtime')}
        >
          {t('dashboardPageHeader.rangeRealtime', {}, { defaultValue: 'Real-time' })}
        </button>
        <button
          className={
            activeRange === 'last24h'
              ? 'px-3 py-1 text-xs font-semibold bg-surface shadow-sm rounded-md'
              : 'px-3 py-1 text-xs font-semibold text-on-surface-variant'
          }
          aria-pressed={activeRange === 'last24h'}
          onClick={() => setActiveRange('last24h')}
        >
          {t('dashboardPageHeader.rangeLast24h', {}, { defaultValue: 'Last 24h' })}
        </button>
      </div>
    </section>
  )
}

export default DashboardPageHeader
export { DashboardPageHeader }
