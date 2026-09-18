import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AnimationToolLayout } from '../components/AnimationToolLayout.js'
import { KeyframeTimelineMini } from '../components/KeyframeTimelineMini.js'
import { MotionStatTile } from '../components/MotionStatTile.js'
import { ProjectCard, type ProjectSummary } from '../components/ProjectCard.js'
import { type RenderJob, RenderQueueCard } from '../components/RenderQueueCard.js'
import type { ProjectStatus } from '../components/StatusPill.js'

interface ApiProject {
  id: string
  name: string
  width?: number
  height?: number
  fps?: number
  duration?: number | string
  updated_at?: string
  created_at?: string
}

interface ApiExport {
  id: string
  project_id: string
  format: string
  status: string
  output_url?: string | null
  created_at: string
}

interface ApiActivityItem {
  id: string
  type: string
  text: string
  detail?: string
  ago: string
  occurredAt: string
  projectId?: string
}

// Decorative project thumbnail swatches — user-visible design palettes, intentionally static.
const SWATCHES = [
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #22c55e 100%)',
]

const ICONS = ['auto_awesome', 'graphic_eq', 'rocket_launch', 'animation', 'bolt', 'view_carousel']

function formatTimecode(durationSeconds: number): string {
  const total = Math.max(0, Math.floor(durationSeconds))
  const hh = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function formatTimeAgo(iso: string | undefined): string {
  if (!iso) return ''
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''
  const seconds = Math.floor((Date.now() - then) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function exportFilename(e: ApiExport): string {
  const ext = e.format === 'lottie' ? 'json' : e.format
  return `export-${e.id.slice(0, 8)}.${ext}`
}

function projectStatus(p: ApiProject): ProjectStatus {
  const updated = Date.parse(String(p.updated_at ?? p.created_at ?? ''))
  if (Number.isNaN(updated)) return 'draft'
  const ageSec = (Date.now() - updated) / 1000
  if (ageSec < 60 * 60 * 24) return 'ready'
  return 'draft'
}

function toSummary(p: ApiProject, idx: number): ProjectSummary {
  const durSec = Number(p.duration ?? 0)
  return {
    id: p.id,
    name: p.name,
    duration: formatTimecode(durSec),
    lastEdited: formatTimeAgo(p.updated_at ?? p.created_at),
    status: projectStatus(p),
    swatch: SWATCHES[idx % SWATCHES.length],
    icon: ICONS[idx % ICONS.length],
  }
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [projects, setProjects] = useState<ApiProject[] | null>(null)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [exports, setExports] = useState<ApiExport[] | null>(null)
  const [exportsError, setExportsError] = useState<string | null>(null)
  const [activity, setActivity] = useState<ApiActivityItem[] | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ApiProject[]>('/api/projects')
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data) ? res.data : []
        setProjects(arr)
      })
      .catch(() => {
        if (cancelled) return
        setProjectsError(
          t('dashboard.projectsError', {}, { defaultValue: 'Could not load projects.' }),
        )
        setProjects([])
      })

    http
      .get<ApiActivityItem[] | { data: ApiActivityItem[] }>('/api/activity?limit=8')
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data)
          ? (res.data as ApiActivityItem[])
          : ((res.data as { data?: ApiActivityItem[] }).data ?? [])
        setActivity(arr)
      })
      .catch(() => {
        if (cancelled) return
        setActivityError(
          t('dashboard.activityError', {}, { defaultValue: 'Could not load activity.' }),
        )
        setActivity([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  useEffect(() => {
    if (!projects || projects.length === 0) {
      setExports([])
      return
    }
    let cancelled = false
    const firstId = projects[0]!.id
    http
      .get<ApiExport[] | { data: ApiExport[] }>(
        `/api/exports?projectId=${encodeURIComponent(firstId)}`,
      )
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data)
          ? (res.data as ApiExport[])
          : ((res.data as { data?: ApiExport[] }).data ?? [])
        setExports(arr)
      })
      .catch(() => {
        if (cancelled) return
        setExportsError(
          t('dashboard.exportsError', {}, { defaultValue: 'Could not load render queue.' }),
        )
        setExports([])
      })
    return () => {
      cancelled = true
    }
  }, [projects, http, t])

  const recent = useMemo<ProjectSummary[]>(() => {
    if (!projects) return []
    return projects.slice(0, 6).map(toSummary)
  }, [projects])

  const queue = useMemo<RenderJob[]>(() => {
    if (!exports) return []
    return exports
      .filter((e) => e.status !== 'completed' && e.status !== 'failed')
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        filename: exportFilename(e),
        progress: e.status === 'rendering' ? 50 : null,
      }))
  }, [exports])

  const totalProjects = projects?.length ?? 0
  const renderQueueCount = queue.length

  return (
    <AnimationToolLayout
      title={t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
      breadcrumb="// home"
    >
      <div className={cm.stack(6)}>
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }))}>
          <div>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'font-headline tracking-tight',
              )}
              style={{ color: 'var(--anim-text)' }}
            >
              {t('dashboard.welcome', {}, { defaultValue: 'Welcome back, animator' })}
            </h2>
            <p
              className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
              style={{ color: 'var(--anim-text-secondary)' }}
            >
              {t(
                'dashboard.subtitle',
                { renders: renderQueueCount, projects: totalProjects },
                {
                  defaultValue:
                    '{{renders}} renders in the queue. {{projects}} projects in your studio.',
                },
              )}
            </p>
          </div>
          <Link
            to="/projects"
            data-mol-id="dashboard-new-project"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-lg hover:opacity-90 transition-opacity',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--anim-primary) 0%, var(--anim-secondary) 100%)',
              color: 'var(--color-on-primary)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>add</span>
            <span>{t('nav.newProject', {}, { defaultValue: 'New project' })}</span>
          </Link>
        </header>

        <div className={cm.cn('grid grid-cols-2 lg:grid-cols-4 gap-4')}>
          <MotionStatTile
            label={t('dashboard.statTotalProjects', {}, { defaultValue: 'Total projects' })}
            value={String(totalProjects)}
            accent="primary"
            icon="folder"
          />
          <MotionStatTile
            label={t('dashboard.statRenderQueue', {}, { defaultValue: 'Render queue' })}
            value={String(renderQueueCount)}
            delta={
              renderQueueCount > 0
                ? t('dashboard.statActive', {}, { defaultValue: 'active' })
                : undefined
            }
            deltaTone="down"
            accent="secondary"
            icon="movie_creation"
          />
          <MotionStatTile
            label={t('dashboard.statRecentEdits', {}, { defaultValue: 'Recent edits' })}
            value={String(activity?.filter((a) => a.type === 'project_edited').length ?? 0)}
            accent="accent"
            icon="calendar_view_week"
          />
          <MotionStatTile
            label={t('dashboard.statExports', {}, { defaultValue: 'Exports' })}
            value={String(exports?.length ?? 0)}
            accent="warning"
            icon="ios_share"
          />
        </div>

        <KeyframeTimelineMini
          caption={t(
            'dashboard.timelineCaption',
            { count: totalProjects },
            { defaultValue: 'Studio overview — {{count}} projects across all tracks.' },
          )}
        />

        <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
          <section className={cm.cn('lg:col-span-2', cm.stack(4))}>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <h3
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'font-headline')}
                style={{ color: 'var(--anim-text)' }}
              >
                {t('dashboard.recentProjects', {}, { defaultValue: 'Recent projects' })}
              </h3>
              <Link
                to="/projects"
                className={'font-mono text-[11px] uppercase tracking-widest transition-colors'}
                style={{ color: 'var(--anim-primary)' }}
              >
                {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
              </Link>
            </div>
            {projects === null ? (
              <p
                className={cm.cn(cm.textSize('xs'), 'font-mono uppercase tracking-widest')}
                style={{ color: 'var(--anim-text-secondary)' }}
              >
                {t('dashboard.projectsLoading', {}, { defaultValue: 'Loading projects…' })}
              </p>
            ) : projectsError ? (
              <p
                role="alert"
                className={cm.cn(cm.textSize('xs'), 'font-mono')}
                style={{ color: 'var(--anim-danger)' }}
              >
                {projectsError}
              </p>
            ) : recent.length === 0 ? (
              <div
                className={cm.cn(cm.sp('p', 8), cm.textCenter, 'rounded-xl border border-dashed')}
                style={{
                  borderColor: 'var(--anim-border)',
                  backgroundColor: 'color-mix(in srgb, var(--anim-surface) 40%, transparent)',
                }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-4xl')}
                  style={{ color: 'var(--anim-text-muted)' }}
                >
                  animation
                </span>
                <p
                  className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2))}
                  style={{ color: 'var(--anim-text-secondary)' }}
                >
                  {t(
                    'dashboard.noProjects',
                    {},
                    { defaultValue: 'No projects yet — create your first one.' },
                  )}
                </p>
              </div>
            ) : (
              <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4')}>
                {recent.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            )}
          </section>

          <aside className={cm.stack(6)}>
            <RenderQueueCard jobs={queue} loading={exports === null} error={exportsError} />
            <section
              className={cm.cn(cm.sp('p', 5), cm.stack(4), 'rounded-xl')}
              style={{
                backgroundColor: 'var(--anim-surface)',
                border: '1px solid var(--anim-border)',
              }}
            >
              <h3
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
                style={{ color: 'var(--anim-text)' }}
              >
                {t('nav.activity', {}, { defaultValue: 'Activity' })}
              </h3>
              {activity === null ? (
                <p
                  className={cm.cn(cm.textSize('xs'), 'font-mono uppercase tracking-widest')}
                  style={{ color: 'var(--anim-text-secondary)' }}
                >
                  {t('nav.loadingActivity', {}, { defaultValue: 'Loading activity…' })}
                </p>
              ) : activityError ? (
                <p
                  role="alert"
                  className={cm.cn(cm.textSize('xs'), 'font-mono')}
                  style={{ color: 'var(--anim-danger)' }}
                >
                  {activityError}
                </p>
              ) : activity.length === 0 ? (
                <p
                  className={cm.cn(cm.textSize('xs'))}
                  style={{ color: 'var(--anim-text-secondary)' }}
                >
                  {t(
                    'dashboard.activityEmpty',
                    {},
                    { defaultValue: 'No activity yet — start a project to see updates here.' },
                  )}
                </p>
              ) : (
                <ol
                  className={cm.cn('relative border-l ml-2 pb-2', cm.stack(5))}
                  style={{ borderColor: 'var(--anim-border)' }}
                >
                  {activity.map((item, idx) => {
                    const accentColor =
                      idx % 2 === 0 ? 'var(--anim-primary)' : 'var(--anim-secondary)'
                    return (
                      <li key={item.id} className={cm.cn('relative pl-4')}>
                        <span
                          className={cm.cn('absolute -left-[5px] top-1.5 w-2 h-2 rounded-full')}
                          style={{ backgroundColor: accentColor }}
                        />
                        <p
                          className={cm.cn(cm.textSize('xs'))}
                          style={{ color: 'var(--anim-text)' }}
                        >
                          {item.text}
                        </p>
                        {item.detail ? (
                          <p
                            className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'italic')}
                            style={{ color: 'var(--anim-text-secondary)' }}
                          >
                            {item.detail}
                          </p>
                        ) : null}
                        <span
                          className={cm.cn(
                            'font-mono text-[10px] uppercase tracking-widest mt-1 block',
                          )}
                          style={{ color: 'var(--anim-text-muted)' }}
                        >
                          {item.ago}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          </aside>
        </div>
      </div>
    </AnimationToolLayout>
  )
}

export default Dashboard
