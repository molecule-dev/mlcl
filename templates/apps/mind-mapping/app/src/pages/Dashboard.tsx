import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DendriteHeroCard } from '../components/DendriteHeroCard.js'
import type { MapActivityItem } from '../components/MapActivityFeed.js'
import { MapActivityFeed } from '../components/MapActivityFeed.js'
import type { MindMapCardData } from '../components/MindMapCard.js'
import { MindMapCard } from '../components/MindMapCard.js'
import { NodeStatCard } from '../components/NodeStatCard.js'

interface MapApi extends MindMapCardData {
  title?: string
  node_count?: number
  is_shared?: boolean
  updated_at: string
}

const formatRelativeAgo = (iso: string): { count: number; unit: 'now' | 'm' | 'h' | 'd' } => {
  const ms = Date.now() - new Date(iso).getTime()
  if (!isFinite(ms) || ms < 0) return { count: 0, unit: 'now' }
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return { count: 0, unit: 'now' }
  if (minutes < 60) return { count: minutes, unit: 'm' }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { count: hours, unit: 'h' }
  return { count: Math.floor(hours / 24), unit: 'd' }
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const [maps, setMaps] = useState<MapApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<MapApi[]>('/maps')
      .then((res) => {
        if (cancelled) return
        const items = (res?.data || []).map((m) => ({
          ...m,
          name: m.name ?? m.title ?? '',
          node_count: typeof m.node_count === 'number' ? m.node_count : 0,
        }))
        setMaps(items)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('dashboard.loadError', {}, { defaultValue: 'Could not reach your maps.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const recent = maps.slice(0, 6)
  const totalMaps = maps.length
  const totalNodes = maps.reduce((acc, m) => acc + (m.node_count ?? 0), 0)
  const sharedMaps = maps.filter((m) => m.is_shared).length

  const activity: MapActivityItem[] = maps.slice(0, 5).map((m) => {
    const rel = formatRelativeAgo(m.updated_at)
    const ago =
      rel.unit === 'now'
        ? t('common.justNow', {}, { defaultValue: 'just now' })
        : rel.unit === 'm'
          ? t('dashboard.minutesAgo', { count: rel.count }, { defaultValue: '{{count}}m ago' })
          : rel.unit === 'h'
            ? t('dashboard.hoursAgo', { count: rel.count }, { defaultValue: '{{count}}h ago' })
            : t('dashboard.daysAgo', { count: rel.count }, { defaultValue: '{{count}}d ago' })
    return {
      id: `map-${m.id}`,
      actor: t('nav.you', {}, { defaultValue: 'You' }),
      action: t('dashboard.activityAction', {}, { defaultValue: 'updated' }),
      target: m.name,
      ago,
      type: m.is_shared ? 'share' : 'edit',
    }
  })

  return (
    <div className={cm.stack(10)}>
      <DendriteHeroCard
        totalMaps={totalMaps}
        weeklyDelta={0}
        greetingName={user?.name?.split(' ')[0] || user?.email?.split('@')[0]}
      />

      <section
        className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'md:grid-cols-3')}
        data-mol-id="dashboard-stats"
      >
        <NodeStatCard
          icon="account_tree"
          label={t('dashboard.stat.totalMaps', {}, { defaultValue: 'Total maps' })}
          value={totalMaps}
          type="default"
        />
        <NodeStatCard
          icon="hub"
          label={t('dashboard.stat.totalNodes', {}, { defaultValue: 'Nodes branched' })}
          value={totalNodes}
          type="idea"
        />
        <NodeStatCard
          icon="group"
          label={t('dashboard.stat.sharedMaps', {}, { defaultValue: 'Maps shared with you' })}
          value={sharedMaps}
          type="task"
        />
      </section>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-error-container/30 text-on-error-container border border-error/30',
          )}
        >
          {error}
        </div>
      )}

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-3 items-start')}>
        <div className={cm.cn(cm.stack(6), 'lg:col-span-2')}>
          <div className={cm.flex({ justify: 'between', align: 'center' })}>
            <div className={cm.stack(1)}>
              <h2
                className={cm.cn(
                  cm.textSize('2xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('dashboard.recentTitle', {}, { defaultValue: 'Recent maps' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('dashboard.recentSubtitle', {}, { defaultValue: 'Pick up where you left off.' })}
              </p>
            </div>
            <Link
              to="/maps"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-primary hover:underline',
              )}
            >
              {t('dashboard.viewAll', {}, { defaultValue: 'View all maps' })}
            </Link>
          </div>
          {loading ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('py', 8), cm.textCenter)}>
              {t('dashboard.loading', {}, { defaultValue: 'Loading your maps…' })}
            </p>
          ) : recent.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 10),
                cm.stack(3),
                cm.textCenter,
                'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('3xl'),
                  'material-symbols-outlined text-on-surface-variant/60',
                )}
              >
                hub
              </span>
              <p
                className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t('dashboard.empty.title', {}, { defaultValue: 'No maps yet' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'max-w-sm mx-auto')}>
                {t(
                  'dashboard.empty.body',
                  {},
                  {
                    defaultValue:
                      'Create a map to start branching ideas. Templates make it easy to start.',
                  },
                )}
              </p>
              <div className={cm.flex({ justify: 'center', gap: 'sm' })}>
                <Link
                  to="/templates"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    'rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors',
                  )}
                >
                  {t('common.browseTemplates', {}, { defaultValue: 'Browse templates' })}
                </Link>
                <Link
                  to="/maps?new=1"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md',
                  )}
                >
                  {t('dashboard.empty.createMap', {}, { defaultValue: 'New map' })}
                </Link>
              </div>
            </div>
          ) : (
            <div
              className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2')}
              data-mol-id="dashboard-recent-grid"
            >
              {recent.map((m, idx) => (
                <MindMapCard key={m.id} map={m} paletteIndex={idx} />
              ))}
            </div>
          )}
        </div>
        <MapActivityFeed
          title={t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
          items={activity}
          emptyHint={t(
            'dashboard.activityEmpty',
            {},
            { defaultValue: 'No activity yet — edit a map to start your timeline.' },
          )}
        />
      </section>
    </div>
  )
}

export default Dashboard
