import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ProjectSummary, ProjectThumbCard } from '../components/ProjectThumbCard.js'
import { type RenderJob, RenderJobCard } from '../components/RenderJobCard.js'
import { RushesLayout } from '../components/RushesLayout.js'
import { StudioStatTile } from '../components/StudioStatTile.js'
import { TimelinePreview } from '../components/TimelinePreview.js'

interface ProjectRow {
  id: string
  name: string
  width?: number | null
  height?: number | null
  fps?: number | null
  duration_ms?: number | null
  cover_url?: string | null
  updated_at?: string | null
  created_at?: string | null
}

interface ExportRow {
  id: string
  format?: string | null
  resolution?: string | null
  status?: string | null
  progress?: number | null
  output_url?: string | null
  project_id: string
  created_at?: string | null
  finished_at?: string | null
}

function arrayFrom<T>(res: unknown): T[] {
  const d = (res as { data?: unknown })?.data
  if (Array.isArray(d)) return d as T[]
  if (Array.isArray(res)) return res as T[]
  return []
}

function aspectFromDims(width?: number | null, height?: number | null): string {
  if (!width || !height) return '16:9'
  if (width === height) return '1:1'
  if (width / height > 16 / 9 + 0.5) return '21:9'
  if (height > width) return '9:16'
  return '16:9'
}

function durationLabel(ms?: number | null): string {
  if (!ms || ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function timeAgo(iso?: string | null): string {
  if (!iso) return ''
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const sec = Math.max(1, Math.floor((Date.now() - ts) / 1000))
  if (sec < 60) return `${sec}s ago`
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

const PROJECT_SWATCHES = [
  'linear-gradient(135deg, var(--video-cta-from) 0%, var(--video-cta-to) 100%)',
  'linear-gradient(135deg, var(--video-cta-to) 0%, var(--mol-color-warning) 100%)',
  'linear-gradient(135deg, var(--mol-color-info) 0%, var(--video-cta-from) 100%)',
  'linear-gradient(135deg, var(--mol-color-primary-dark) 0%, var(--video-cta-from) 100%)',
  'linear-gradient(135deg, var(--mol-color-warning) 0%, var(--video-cta-to) 100%)',
  'linear-gradient(135deg, var(--mol-color-success) 0%, var(--mol-color-info) 100%)',
]
const PROJECT_ICONS = [
  'movie',
  'rocket_launch',
  'smartphone',
  'crop_square',
  'movie_filter',
  'school',
]

function projectToCard(
  p: ProjectRow,
  idx: number,
  statusFor: (id: string) => ProjectSummary['status'],
): ProjectSummary {
  return {
    id: p.id,
    name: p.name || 'Untitled Video',
    client: '',
    duration: durationLabel(p.duration_ms),
    lastEdited: timeAgo(p.updated_at ?? p.created_at),
    status: statusFor(p.id),
    swatch: PROJECT_SWATCHES[idx % PROJECT_SWATCHES.length],
    icon: PROJECT_ICONS[idx % PROJECT_ICONS.length],
    aspect: aspectFromDims(p.width, p.height),
  }
}

function exportToJob(e: ExportRow): RenderJob {
  return {
    id: e.id,
    filename: `${(e.id || '').slice(0, 8)}.${e.format || 'mp4'}`,
    progress: typeof e.progress === 'number' ? e.progress : null,
    eta: e.status === 'pending' ? 'queued' : undefined,
    preset: `${e.resolution || '1080p'} · ${(e.format || 'mp4').toUpperCase()}`,
  }
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [exports, setExports] = useState<ExportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [pRes, eRes] = await Promise.all([
          http.get('/api/projects').catch(() => null),
          http.get('/api/exports').catch(() => null),
        ])
        if (cancelled) return
        setProjects(arrayFrom<ProjectRow>(pRes))
        setExports(arrayFrom<ExportRow>(eRes))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard data.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const recentProjects = projects.slice(0, 6)
  const activeJobs = exports
    .filter((e) => e.status !== 'done' && e.status !== 'failed')
    .slice(0, 4)
    .map(exportToJob)
  const completedExports = exports.filter((e) => e.status === 'done')
  const renderingMap = new Map<string, ProjectSummary['status']>()
  for (const e of exports) {
    if (e.status === 'pending' || e.status === 'rendering')
      renderingMap.set(e.project_id, 'rendering')
    else if (!renderingMap.has(e.project_id) && e.status === 'done')
      renderingMap.set(e.project_id, 'shared')
  }
  const statusFor = (id: string): ProjectSummary['status'] => renderingMap.get(id) ?? 'ready'

  return (
    <RushesLayout
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
                'text-[var(--video-text-primary)] tracking-tight',
              )}
            >
              {t('dashboard.welcome', {}, { defaultValue: 'Welcome back, editor' })}
            </h2>
            <p
              data-mol-id="dashboard-subtitle"
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 1),
                'text-[var(--video-text-muted-alt)]',
              )}
            >
              {loading
                ? t('dashboard.loading', {}, { defaultValue: 'Loading projects…' })
                : t(
                    'dashboard.subtitle',
                    { projects: projects.length, renders: activeJobs.length },
                    { defaultValue: '{{projects}} project(s) · {{renders}} active render(s)' },
                  )}
            </p>
          </div>
          <Link
            to="/projects/new"
            data-mol-id="dashboard-new-project"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-lg bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>add</span>
            <span>{t('nav.newProject', {}, { defaultValue: 'New project' })}</span>
          </Link>
        </header>

        {error && (
          <p
            role="alert"
            data-mol-id="dashboard-error"
            className={cm.cn(cm.textSize('sm'), 'text-[var(--video-error-text)] font-mono')}
          >
            {error}
          </p>
        )}

        <div className={cm.cn('grid grid-cols-2 lg:grid-cols-4 gap-4')}>
          <StudioStatTile
            label={t('dashboard.statTotalProjects', {}, { defaultValue: 'Total projects' })}
            value={String(projects.length)}
            accent="violet"
            icon="folder"
          />
          <StudioStatTile
            label={t('dashboard.statActiveRenders', {}, { defaultValue: 'Active renders' })}
            value={String(activeJobs.length)}
            accent="cyan"
            icon="cloud_download"
          />
          <StudioStatTile
            label={t('dashboard.statCompleted', {}, { defaultValue: 'Completed renders' })}
            value={String(completedExports.length)}
            accent="pink"
            icon="movie"
          />
          <StudioStatTile
            label={t('dashboard.statTotalExports', {}, { defaultValue: 'Total exports' })}
            value={String(exports.length)}
            accent="amber"
            icon="archive"
          />
        </div>

        <TimelinePreview
          caption={
            recentProjects[0]
              ? t(
                  'dashboard.timelineCaption',
                  { name: recentProjects[0].name },
                  { defaultValue: 'Last opened — {{name}}' },
                )
              : t(
                  'dashboard.timelineEmpty',
                  {},
                  { defaultValue: 'Your timeline preview appears here once you create a project.' },
                )
          }
        />

        <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
          <section className={cm.cn('lg:col-span-2', cm.stack(4))}>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <h3
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('semibold'),
                  'text-[var(--video-text-primary)]',
                )}
              >
                {t('dashboard.recentProjects', {}, { defaultValue: 'Recent projects' })}
              </h3>
              <Link
                to="/templates"
                className={
                  'inline-block py-2 font-mono text-[11px] uppercase tracking-widest text-[var(--video-link)] hover:text-[var(--video-link-hover)] transition-colors'
                }
              >
                {t('dashboard.browseTemplates', {}, { defaultValue: 'Browse templates →' })}
              </Link>
            </div>
            {recentProjects.length === 0 ? (
              <div
                data-mol-id="dashboard-empty"
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.textCenter,
                  'rounded-xl border border-dashed border-[var(--video-border-subtle)] bg-[var(--video-panel-bg)]/50',
                )}
              >
                <p className={cm.cn(cm.textSize('sm'), 'text-[var(--video-text-muted-alt)]')}>
                  {loading
                    ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                    : t(
                        'dashboard.noProjects',
                        {},
                        { defaultValue: 'No projects yet — create one to get started.' },
                      )}
                </p>
                {!loading && (
                  <Link
                    to="/projects/new"
                    data-mol-id="dashboard-empty-create"
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.sp('mt', 4),
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[18px]')}>add</span>
                    <span>
                      {t(
                        'dashboard.createFirst',
                        {},
                        { defaultValue: 'Create your first project' },
                      )}
                    </span>
                  </Link>
                )}
              </div>
            ) : (
              <div
                data-mol-id="dashboard-projects"
                className={cm.cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4')}
              >
                {recentProjects.map((p, idx) => (
                  <ProjectThumbCard key={p.id} project={projectToCard(p, idx, statusFor)} />
                ))}
              </div>
            )}
          </section>

          <aside className={cm.stack(6)}>
            <RenderJobCard jobs={activeJobs} hideViewAll={false} />
            <section
              className={cm.cn(
                cm.sp('p', 5),
                cm.stack(4),
                'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
              )}
            >
              <h3
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-[var(--video-text-primary)]',
                )}
              >
                {t('dashboard.tipsTitle', {}, { defaultValue: 'Quick start' })}
              </h3>
              <ol className={cm.cn(cm.stack(3))}>
                <Tip
                  step={1}
                  title={t('dashboard.tip1Title', {}, { defaultValue: 'Pick a template' })}
                  body={t(
                    'dashboard.tip1Body',
                    {},
                    { defaultValue: 'Browse hand-tuned shells in the Templates library.' },
                  )}
                  to="/templates"
                  cta={t('dashboard.tip1Cta', {}, { defaultValue: 'Open templates' })}
                />
                <Tip
                  step={2}
                  title={t('dashboard.tip2Title', {}, { defaultValue: 'Upload assets' })}
                  body={t(
                    'dashboard.tip2Body',
                    {},
                    { defaultValue: 'Drop video, audio, and graphics into the Asset Library.' },
                  )}
                  to="/assets"
                  cta={t('dashboard.tip2Cta', {}, { defaultValue: 'Open library' })}
                />
                <Tip
                  step={3}
                  title={t('dashboard.tip3Title', {}, { defaultValue: 'Render & share' })}
                  body={t(
                    'dashboard.tip3Body',
                    {},
                    {
                      defaultValue: 'Queue an export and grab a share link from the Render queue.',
                    },
                  )}
                  to="/export"
                  cta={t('dashboard.tip3Cta', {}, { defaultValue: 'Open queue' })}
                />
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </RushesLayout>
  )
}

interface TipProps {
  step: number
  title: string
  body: string
  to: string
  cta: string
}
function Tip({ step, title, body, to, cta }: TipProps) {
  const cm = getClassMap()
  return (
    <li className={cm.cn(cm.flex({ align: 'start', gap: 3 }))}>
      <span
        className={cm.cn(
          'w-6 h-6 rounded-full bg-[var(--video-cta-from)]/20 text-[var(--video-link)] font-mono text-[11px] flex items-center justify-center shrink-0',
        )}
      >
        {step}
      </span>
      <div className={cm.stack(1)}>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-[var(--video-text-primary)]',
          )}
        >
          {title}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-muted-alt)]')}>{body}</p>
        <Link
          to={to}
          className={cm.cn(
            'inline-block py-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--video-link)] hover:text-[var(--video-link-hover)] transition-colors',
          )}
        >
          {cta} →
        </Link>
      </div>
    </li>
  )
}

export default Dashboard
