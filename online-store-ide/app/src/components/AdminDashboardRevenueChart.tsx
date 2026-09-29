import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AdminDashboardRevenueChart() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [period, setPeriod] = useState('weekly')
  return (
    <div className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 8))}>
        <h5 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
          {t('revenueChart.title', {}, { defaultValue: 'Revenue Overview' })}
        </h5>
        <select
          className={cm.cn(cm.textSize('sm'), cm.input())}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="weekly">{t('common.weekly', {}, { defaultValue: 'Weekly' })}</option>
          <option value="monthly">{t('status.monthly', {}, { defaultValue: 'Monthly' })}</option>
        </select>
      </div>
      <div className={cm.cn(cm.h(64), cm.w('full'), 'relative')}>
        {/* SVG Area Chart Placeholder */}
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          preserveAspectRatio="none"
          viewBox="0 0 800 200"
        >
          <defs>
            <linearGradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="var(--mol-color-primary)" stopOpacity="0.2"></stop>
              <stop offset="100%" stopColor="var(--mol-color-primary)" stopOpacity="0"></stop>
            </linearGradient>
          </defs>
          <path
            d="M0,180 Q100,120 200,140 T400,60 T600,100 T800,40 L800,200 L0,200 Z"
            fill="url(#gradient)"
          ></path>
          <path
            d="M0,180 Q100,120 200,140 T400,60 T600,100 T800,40"
            fill="none"
            stroke="var(--mol-color-primary)"
            strokeLinecap="round"
            strokeWidth="3"
          ></path>
          {/* Points */}
          <circle
            cx="200"
            cy="140"
            fill="var(--mol-color-background)"
            r="4"
            stroke="var(--mol-color-primary)"
            strokeWidth="2"
          ></circle>
          <circle
            cx="400"
            cy="60"
            fill="var(--mol-color-background)"
            r="4"
            stroke="var(--mol-color-primary)"
            strokeWidth="2"
          ></circle>
          <circle
            cx="600"
            cy="100"
            fill="var(--mol-color-background)"
            r="4"
            stroke="var(--mol-color-primary)"
            strokeWidth="2"
          ></circle>
        </svg>
        <div
          className={cm.cn(
            cm.flex({ justify: 'between' }),
            cm.sp('mt', 4),
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'text-foreground-tertiary uppercase tracking-wider',
          )}
        >
          <span>{t('common.mon', {}, { defaultValue: 'Mon' })}</span>
          <span>{t('common.tue', {}, { defaultValue: 'Tue' })}</span>
          <span>{t('common.wed', {}, { defaultValue: 'Wed' })}</span>
          <span>{t('common.thu', {}, { defaultValue: 'Thu' })}</span>
          <span>{t('common.fri', {}, { defaultValue: 'Fri' })}</span>
          <span>{t('common.sat', {}, { defaultValue: 'Sat' })}</span>
          <span>{t('common.sun', {}, { defaultValue: 'Sun' })}</span>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardRevenueChart
export { AdminDashboardRevenueChart }
