import { useEffect, useState } from 'react'

import { KpiCard } from '@molecule/app-kpi-card-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SideNavBar from '../components/SideNavBar.js'
import TopNavBar from '../components/TopNavBar.js'
import TopPostsTable from '../components/TopPostsTable.js'
import TrafficSourcesSidebar from '../components/TrafficSourcesSidebar.js'
import ViewsOverTimeChart from '../components/ViewsOverTimeChart.js'

interface AnalyticsSummary {
  totalPosts: number
  publishedPosts: number
  totalViews: number
  totalClaps: number
  totalComments: number
  topPosts: { id: string; title: string; views: number }[]
}

interface ViewsResponse {
  points: { date: string; views: number }[]
  totalViews: number
}

function Analytics() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [views, setViews] = useState<ViewsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<AnalyticsSummary>('/api/analytics/summary'),
      http.get<ViewsResponse>('/api/analytics/views?days=14'),
    ])
      .then(([sumRes, viewsRes]) => {
        if (cancelled) return
        const sumPayload = sumRes.data
        const viewsPayload = viewsRes.data
        if (sumPayload && typeof sumPayload.totalPosts === 'number') {
          setSummary(sumPayload)
        }
        if (viewsPayload && Array.isArray(viewsPayload.points)) {
          setViews(viewsPayload)
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [http])

  const totalViews = summary?.totalViews ?? 0
  const publishedPosts = summary?.publishedPosts ?? 0
  const claps = summary?.totalClaps ?? 0
  const comments = summary?.totalComments ?? 0
  const topPosts = summary?.topPosts ?? []
  const formattedTotalViews = totalViews.toLocaleString()

  return (
    <>
      <SideNavBar />
      <TopNavBar />
      <main className={cm.cn(cm.stack(10), cm.sp('px', 10), 'ml-[240px] pt-24 pb-20')}>
        <section
          className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-4')}
          data-mol-id="analytics-kpis"
        >
          <div data-mol-id="kpi-total-views">
            <KpiCard
              title={t('analytics.totalViews', {}, { defaultValue: 'Total Views' })}
              value={formattedTotalViews}
              accentSide="left"
              upperLabel
              emphasizeValue
            />
          </div>
          <div data-mol-id="kpi-published-posts">
            <KpiCard
              title={t('analytics.publishedPosts', {}, { defaultValue: 'Published Posts' })}
              value={publishedPosts.toLocaleString()}
              accentSide="left"
              upperLabel
              emphasizeValue
            />
          </div>
          <div data-mol-id="kpi-total-claps">
            <KpiCard
              title={t('analytics.totalClaps', {}, { defaultValue: 'Claps' })}
              value={claps.toLocaleString()}
              accentSide="left"
              upperLabel
              emphasizeValue
            />
          </div>
          <div data-mol-id="kpi-total-comments">
            <KpiCard
              title={t('analytics.totalComments', {}, { defaultValue: 'Comments' })}
              value={comments.toLocaleString()}
              accentSide="left"
              upperLabel
              emphasizeValue
            />
          </div>
        </section>
        {loading ? (
          <p
            data-mol-id="analytics-loading"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('analytics.loading', {}, { defaultValue: 'Loading analytics…' })}
          </p>
        ) : null}
        <div className={cm.cn(cm.grid({ cols: 12, gap: 10 }), 'items-start')}>
          <ViewsOverTimeChart points={views?.points ?? []} totalViews={totalViews} />
          <TrafficSourcesSidebar />
          <TopPostsTable posts={topPosts} loading={loading} />
        </div>
      </main>
    </>
  )
}

export default Analytics
export { Analytics, Analytics as AnalyticsPage }
