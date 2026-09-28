import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SummaryResponse {
  totalPosts?: number
  publishedPosts?: number
  totalViews?: number
  totalClaps?: number
  totalComments?: number
}

function compactNumber(value: number): string {
  if (value < 1000) return String(value)
  if (value < 1_000_000) {
    const k = value / 1000
    return (k >= 10 ? Math.round(k) : Number(k.toFixed(1))) + 'K'
  }
  const m = value / 1_000_000
  return (m >= 10 ? Math.round(m) : Number(m.toFixed(1))) + 'M'
}

function KpiCardsSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get<SummaryResponse>('/api/analytics/summary')
      .then((res) => {
        if (cancelled) return
        const payload = res.data
        setSummary(payload ?? {})
      })
      .catch(() => {
        if (cancelled) return
        setSummary({})
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const totalPosts = summary?.totalPosts ?? 0
  const publishedPosts = summary?.publishedPosts ?? 0
  const totalViews = summary?.totalViews ?? 0
  const totalClaps = summary?.totalClaps ?? 0
  const totalComments = summary?.totalComments ?? 0

  return (
    <div
      className={cm.cn(cm.grid({ gap: 'lg' }), 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}
      data-mol-id="kpi-cards"
    >
      <KpiCard
        cm={cm}
        molId="kpi-total-posts"
        label={t('kpiCardsSection.totalPosts', {}, { defaultValue: 'Total Posts' })}
        icon="article"
        accent
        value={String(totalPosts)}
        meta={
          loaded
            ? t(
                'kpiCardsSection.publishedOfTotal',
                { published: publishedPosts },
                { defaultValue: '{{published}} published' },
              )
            : t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
        }
      />
      <KpiCard
        cm={cm}
        molId="kpi-total-views"
        label={t('kpiCardsSection.totalViews', {}, { defaultValue: 'Total Views' })}
        icon="visibility"
        value={compactNumber(totalViews)}
        meta={t(
          'kpiCardsSection.viewsAcrossPosts',
          { count: publishedPosts },
          { defaultValue: 'Across {{count}} published post(s)' },
        )}
      />
      <KpiCard
        cm={cm}
        molId="kpi-total-claps"
        label={t('kpiCardsSection.totalClaps', {}, { defaultValue: 'Claps Earned' })}
        icon="favorite"
        value={compactNumber(totalClaps)}
        meta={t(
          'kpiCardsSection.clapsRatio',
          { value: publishedPosts > 0 ? Math.round((totalClaps / publishedPosts) * 10) / 10 : 0 },
          { defaultValue: '{{value}} per post' },
        )}
      />
      <KpiCard
        cm={cm}
        molId="kpi-total-comments"
        label={t('kpiCardsSection.totalComments', {}, { defaultValue: 'Comments' })}
        icon="comment"
        value={compactNumber(totalComments)}
        meta={t(
          'kpiCardsSection.commentsRatio',
          {
            value: publishedPosts > 0 ? Math.round((totalComments / publishedPosts) * 10) / 10 : 0,
          },
          { defaultValue: '{{value}} per post' },
        )}
      />
    </div>
  )
}

interface KpiCardProps {
  cm: ReturnType<typeof getClassMap>
  molId: string
  label: string
  icon: string
  value: string
  meta: string
  accent?: boolean
}

function KpiCard({ cm, molId, label, icon, value, meta, accent }: KpiCardProps) {
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-lg editorial-shadow group hover:scale-[1.02] transition-transform',
        accent ? cm.accentCard({ tone: 'primary' }) : '',
      )}
      data-mol-id={molId}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <span
          className={
            accent
              ? cm.accentCardLabel({ tone: 'primary' })
              : cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'text-label-sm uppercase tracking-widest text-secondary',
                )
          }
        >
          {label}
        </span>
        <span className={cm.cn('material-symbols-outlined text-tertiary')} data-icon={icon}>
          {icon}
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'end', gap: 'sm' }))}>
        <span
          className={cm.cn(cm.textSize('4xl'), 'font-extrabold font-headline')}
          data-mol-id={`${molId}-value`}
        >
          {value}
        </span>
      </div>
      <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>{meta}</p>
    </div>
  )
}

export default KpiCardsSection
export { KpiCardsSection }
