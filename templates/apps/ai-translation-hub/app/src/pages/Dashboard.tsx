import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageHeading } from '../components/PageHeading.js'
import {
  type ActivityEvent,
  TranslationActivityTimeline,
} from '../components/TranslationActivityTimeline.js'
import { TranslationHeroCard } from '../components/TranslationHeroCard.js'
import {
  type TranslationProject,
  TranslationProjectCard,
} from '../components/TranslationProjectCard.js'
import { TranslationStatsQuad } from '../components/TranslationStatsQuad.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface DashboardStats {
  active_projects: number
  words_translated_30d: number
  words_change_30d: number
  avg_quality_score: number
  team_members: number
  ai_confidence: number
  volume_history?: ReadonlyArray<number>
}

const FALLBACK_STATS: DashboardStats = {
  active_projects: 0,
  words_translated_30d: 0,
  words_change_30d: 0,
  avg_quality_score: 0,
  team_members: 0,
  ai_confidence: 0,
  volume_history: [],
}

interface ApiProjectRow {
  id?: unknown
  name?: unknown
  source_lang?: unknown
  target_langs?: unknown
  status?: unknown
  updated_at?: unknown
  created_at?: unknown
}

interface ApiActivityRow {
  id?: unknown
  actor?: unknown
  actor_initials?: unknown
  kind?: unknown
  text?: unknown
  project?: unknown
  timestamp?: unknown
}

function adaptProject(row: ApiProjectRow, idx: number): TranslationProject {
  const targets = Array.isArray(row.target_langs) ? row.target_langs : []
  const target = targets.length > 0 ? String(targets[0]) : 'es'
  const status = String(row.status ?? 'in_progress')
  const normStatus: TranslationProject['status'] =
    status === 'in_progress' ||
    status === 'in_review' ||
    status === 'approved' ||
    status === 'pending' ||
    status === 'draft' ||
    status === 'archived'
      ? status
      : 'in_progress'
  return {
    id: String(row.id ?? `p_${idx}`),
    name: String(row.name ?? 'Untitled project'),
    source_lang: String(row.source_lang ?? 'EN').toLowerCase(),
    target_lang: target.toLowerCase(),
    status: normStatus,
    progress: 0,
    word_count: 0,
    last_activity:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at ?? row.created_at ?? ''),
    team: [],
  }
}

function adaptActivity(row: ApiActivityRow, idx: number): ActivityEvent {
  return {
    id: String(row.id ?? `a_${idx}`),
    actor: String(row.actor ?? 'Workspace'),
    actor_initials: String(row.actor_initials ?? ''),
    kind: ((): ActivityEvent['kind'] => {
      const k = String(row.kind ?? 'commented')
      const allowed: ActivityEvent['kind'][] = [
        'approved',
        'uploaded',
        'mt_pass',
        'commented',
        'glossary_updated',
        'review_requested',
      ]
      return (allowed as string[]).includes(k) ? (k as ActivityEvent['kind']) : 'commented'
    })(),
    text: String(row.text ?? ''),
    project:
      row.project && typeof row.project === 'object'
        ? (row.project as { id: string; name: string })
        : undefined,
    timestamp: String(row.timestamp ?? ''),
  }
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<DashboardStats>(FALLBACK_STATS)
  const [projects, setProjects] = useState<ReadonlyArray<TranslationProject>>([])
  const [activity, setActivity] = useState<ReadonlyArray<ActivityEvent>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/reports/dashboard_stats').catch(() => null),
      http.get('/projects').catch(() => null),
      http.get('/activity').catch(() => null),
    ])
      .then(([sRes, pRes, aRes]) => {
        if (cancelled) return
        const apiStats = unwrapSingle<DashboardStats>(sRes)
        if (apiStats) setStats(apiStats)
        const apiProjects = unwrapList<ApiProjectRow>(pRes)
        setProjects(apiProjects.map(adaptProject))
        const apiActivity = unwrapList<ApiActivityRow>(aRes)
        setActivity(apiActivity.map(adaptActivity))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('nav.failedToLoadDashboard', {}, { defaultValue: 'Failed to load dashboard.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.minH('screen'),
        'w-full',
      )}
    >
      <PageHeading
        eyebrow={t('dashboard.eyebrow', {}, { defaultValue: 'Overview' })}
        title={t('dashboard.title', {}, { defaultValue: 'Translation pipeline' })}
        subtitle={t(
          'dashboard.subtitle',
          {},
          {
            defaultValue:
              'Real-time view of every active locale, reviewer queue, and AI confidence band.',
          },
        )}
        actions={
          <Link
            to="/projects/new"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full inline-flex items-center gap-2 text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 shadow-sm shadow-primary/30',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              add
            </span>
            {t('nav.newProject', {}, { defaultValue: 'New project' })}
          </Link>
        }
      />

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error-container text-on-error-container text-sm',
          )}
        >
          {error}
        </div>
      )}

      {loading && (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      )}

      {/* Hero row: hero card (8 col) + activity feed (4 col) */}
      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
      >
        <TranslationHeroCard
          wordsTranslated={stats.words_translated_30d}
          change={stats.words_change_30d}
          confidence={stats.ai_confidence}
          history={stats.volume_history}
        />
        <aside
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-4 bg-surface-container-lowest rounded-[1.5rem] border border-surface-container/50 shadow-sm overflow-hidden flex flex-col',
          )}
        >
          <h3
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('mb', 5),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[18px] text-primary')}
              aria-hidden="true"
            >
              history
            </span>
            {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
          </h3>
          <div className={cm.cn('overflow-y-auto pr-2 max-h-[420px]')}>
            {activity.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'dashboard.activityEmpty',
                  {},
                  { defaultValue: 'No activity yet — start a project to populate this feed.' },
                )}
              </p>
            ) : (
              <TranslationActivityTimeline events={activity} />
            )}
          </div>
        </aside>
      </section>

      <TranslationStatsQuad
        activeProjects={stats.active_projects}
        wordsTranslated={stats.words_translated_30d}
        qualityScore={stats.avg_quality_score}
        teamMembers={stats.team_members}
      />

      {/* Projects grid */}
      <section className={cm.flex({ direction: 'col', gap: 'md' })}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('dashboard.projectsHeading', {}, { defaultValue: 'Active projects' })}
          </h2>
          <Link
            to="/projects"
            className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
          >
            {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
          </Link>
        </div>
        {projects.length === 0 ? (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.textCenter,
              cm.sp('py', 12),
              'text-on-surface-variant',
            )}
          >
            {t(
              'dashboard.projectsEmpty',
              {},
              { defaultValue: 'No projects yet — start one to see it here.' },
            )}
          </p>
        ) : (
          <div
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3')}
          >
            {projects.slice(0, 6).map((p) => (
              <TranslationProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Dashboard
export { Dashboard as DashboardPage }
