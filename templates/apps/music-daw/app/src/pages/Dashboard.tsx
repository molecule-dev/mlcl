import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { unwrapList } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProjectGrid } from '../components/ProjectTile.js'
import { SampleTable } from '../components/SampleTable.js'
import { StudioHeroCard } from '../components/StudioHeroCard.js'

interface DashboardProject {
  id: string
  name: string
  bpm: number
  time_signature: string
  cover_index: number
  duration_seconds: number
  track_count: number
  last_edited?: string
  is_pinned?: boolean
  created_at?: string
  updatedAt?: string | null
}

interface DashboardSample {
  id: string
  name: string
  pack: string
  bpm: number
  key: string
  duration_seconds: number
  category: string
  cover_index: number
  is_loop?: boolean
}

type Translate = ReturnType<typeof useTranslation>['t']

function formatRelative(ts: string | null | undefined, t: Translate): string {
  if (!ts) return ''
  const then = new Date(ts).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Math.max(0, Date.now() - then)
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return t('common.justNow', {}, { defaultValue: 'Just now' })
  if (minutes < 60)
    return t('common.minutesAgo', { count: minutes }, { defaultValue: '{{count}}m ago' })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('common.hoursAgo', { count: hours }, { defaultValue: '{{count}}h ago' })
  const days = Math.floor(hours / 24)
  if (days === 1) return t('common.yesterday', {}, { defaultValue: 'Yesterday' })
  if (days < 7) return t('common.daysAgo', { count: days }, { defaultValue: '{{count}}d ago' })
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return t('common.weeksAgo', { count: weeks }, { defaultValue: '{{count}}w ago' })
  return new Date(ts).toLocaleDateString()
}

function decorateProject(p: DashboardProject, t: Translate): DashboardProject {
  return {
    ...p,
    last_edited: formatRelative(p.updatedAt ?? p.created_at, t),
  }
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [projects, setProjects] = useState<DashboardProject[]>([])
  const [samples, setSamples] = useState<DashboardSample[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      http.get<unknown>('/api/projects'),
      http.get<unknown>('/api/samples'),
    ]).then((results) => {
      if (cancelled) return
      const [projRes, sampleRes] = results
      if (projRes.status === 'fulfilled') {
        setProjects(
          unwrapList<DashboardProject>(projRes.value.data).map((p) => decorateProject(p, t)),
        )
      } else {
        setError(t('nav.failedToLoadDashboard', {}, { defaultValue: 'Failed to load dashboard.' }))
      }
      if (sampleRes.status === 'fulfilled') {
        setSamples(unwrapList<DashboardSample>(sampleRes.value.data))
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const heroProject = projects.find((p) => p.is_pinned) ?? projects[0] ?? null

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 8), 'space-y-10')}>
      <header className={cm.cn('flex items-end justify-between gap-4 flex-wrap')}>
        <div>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('dashboard.eyebrow', {}, { defaultValue: 'Studio overview' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight mt-1')}>
            {t('dashboard.title', {}, { defaultValue: 'Welcome back to the booth' })}
          </h1>
        </div>
        <Link
          to="/projects"
          className={cm.cn(
            'inline-flex items-center gap-2 px-5 py-2.5 font-semibold text-sm text-white rounded-full transition-colors',
          )}
          style={{
            background: 'linear-gradient(135deg, var(--daw-primary), var(--daw-secondary))',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add
          </span>
          {t('nav.newProject', {}, { defaultValue: 'New project' })}
        </Link>
      </header>

      {error && (
        <p
          role="alert"
          className={cm.cn(
            'text-sm text-on-error-container bg-error-container px-3 py-2 rounded-lg',
          )}
        >
          {error}
        </p>
      )}

      {heroProject ? (
        <StudioHeroCard
          project={heroProject}
          eyebrow={t('dashboard.heroEyebrow', {}, { defaultValue: 'Last session' })}
          statusLabel={
            heroProject.last_edited
              ? t(
                  'dashboard.heroStatus',
                  { when: heroProject.last_edited },
                  { defaultValue: 'Updated {{when}}' },
                )
              : t(
                  'dashboard.heroStatusFresh',
                  {},
                  { defaultValue: 'Auto-saved · ready when you are' },
                )
          }
        />
      ) : !loading ? (
        <section
          className={cm.cn(
            'rounded-2xl border border-dashed border-outline-variant px-8 py-12 text-center space-y-3',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant')}
            aria-hidden="true"
          >
            music_note
          </span>
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
            {t('dashboard.emptyTitle', {}, { defaultValue: 'No projects yet' })}
          </h2>
          <p className={cm.cn('text-sm text-on-surface-variant max-w-md mx-auto')}>
            {t(
              'dashboard.emptyBody',
              {},
              {
                defaultValue:
                  'Spin up your first session to start arranging tracks, sketching beats and layering samples.',
              },
            )}
          </p>
          <Link
            to="/projects"
            className={cm.cn(
              'inline-flex items-center gap-2 px-5 py-2.5 font-semibold text-sm text-white rounded-full mt-2',
            )}
            style={{
              background: 'linear-gradient(135deg, var(--daw-primary), var(--daw-secondary))',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              add
            </span>
            {t('dashboard.emptyCta', {}, { defaultValue: 'Create your first project' })}
          </Link>
        </section>
      ) : null}

      <section>
        <div className={cm.cn('flex items-end justify-between mb-5')}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('dashboard.projectsHeading', {}, { defaultValue: 'Recent projects' })}
          </h2>
          <Link
            to="/projects"
            className={cm.cn('text-sm font-semibold text-primary hover:underline')}
          >
            {t('common.viewAll', {}, { defaultValue: 'View all' })}
          </Link>
        </div>
        {loading ? (
          <p className={cm.cn('text-sm', cm.textMuted)}>
            {t('dashboard.loadingProjects', {}, { defaultValue: 'Loading recent projects…' })}
          </p>
        ) : projects.length === 0 ? (
          <p className={cm.cn('text-sm', cm.textMuted)}>
            {t(
              'dashboard.noProjects',
              {},
              { defaultValue: 'No projects yet — create one to see it here.' },
            )}
          </p>
        ) : (
          <ProjectGrid projects={projects.filter((p) => p.id !== heroProject?.id)} limit={5} />
        )}
      </section>

      <section>
        <div className={cm.cn('flex items-end justify-between mb-5')}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('dashboard.samplesHeading', {}, { defaultValue: 'Sample library highlights' })}
          </h2>
          <Link
            to="/samples"
            className={cm.cn('text-sm font-semibold text-primary hover:underline')}
          >
            {t('dashboard.browseSamples', {}, { defaultValue: 'Browse the library' })}
          </Link>
        </div>
        {loading ? (
          <p className={cm.cn('text-sm', cm.textMuted)}>
            {t('dashboard.loadingSamples', {}, { defaultValue: 'Loading samples…' })}
          </p>
        ) : samples.length === 0 ? (
          <p className={cm.cn('text-sm', cm.textMuted)}>
            {t('dashboard.noSamples', {}, { defaultValue: 'Sample library is empty.' })}
          </p>
        ) : (
          <SampleTable samples={samples.slice(0, 6)} />
        )}
      </section>
    </div>
  )
}
