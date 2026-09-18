import { useMemo } from 'react'

import { type ChartConfig } from '@molecule/app-charts'
import { useTranslation } from '@molecule/app-react'

import { ChartPanel } from './ChartPanel.js'

/** One month's revenue — the shape you'd map from a `GET /metrics` response. */
export type MonthlyPoint = { month: string; revenue: number }

/**
 * Concrete usage: builds a line-chart `ChartConfig` from monthly revenue data
 * and renders it via `ChartPanel`.
 *
 * A `ChartConfig` is provider-agnostic — `labels` are the x-axis categories and
 * each `Dataset` is one series (`label` + `data`). Swap `type: 'line'` for
 * `'bar'` / `'area'` / `'pie'` to change the visualization with the SAME data.
 * Dataset colours (`borderColor`) are canvas draw values, not CSS classes, so a
 * literal colour is correct here.
 */
export function RevenueChart({ data }: { data: MonthlyPoint[] }) {
  const { t } = useTranslation()

  const config = useMemo<ChartConfig>(
    () => ({
      type: 'line',
      labels: data.map((d) => d.month),
      datasets: [
        {
          label: t('revenue.series', undefined, { defaultValue: 'Revenue' }),
          data: data.map((d) => d.revenue),
          borderColor: '#2563eb',
          fill: false,
          tension: 0.3,
        },
      ],
    }),
    [data, t],
  )

  return (
    <ChartPanel
      title={t('revenue.title', undefined, { defaultValue: 'Revenue' })}
      description={t('revenue.description', undefined, {
        defaultValue: 'Monthly revenue over time',
      })}
      config={config}
    />
  )
}

export default RevenueChart
