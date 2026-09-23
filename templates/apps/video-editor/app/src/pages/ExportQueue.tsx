import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type RenderJob, RenderJobCard } from '../components/RenderJobCard.js'
import { RushesLayout } from '../components/RushesLayout.js'
import { type ProjectStatus, StatusPill } from '../components/StatusPill.js'
import { StudioStatTile } from '../components/StudioStatTile.js'

interface ExportRow {
  id: string
  format?: string | null
  resolution?: string | null
  quality?: string | null
  status?: string | null
  progress?: number | null
  output_url?: string | null
  project_id: string
  created_at?: string | null
  finished_at?: string | null
}

interface ProjectRow {
  id: string
  name?: string | null
}

function arrayFrom<T>(res: unknown): T[] {
  const d = (res as { data?: unknown })?.data
  if (Array.isArray(d)) return d as T[]
  if (Array.isArray(res)) return res as T[]
  return []
}

function statusToPill(s?: string | null): ProjectStatus {
  if (s === 'done') return 'complete'
  if (s === 'failed' || s === 'error') return 'error'
  if (s === 'rendering') return 'rendering'
  return 'rendering'
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

export function ExportQueue() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [exports, setExports] = useState<ExportRow[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedFormat, setSelectedFormat] = useState<'mp4' | 'webm' | 'gif'>('mp4')
  const [selectedResolution, setSelectedResolution] = useState<'480p' | '720p' | '1080p' | '4k'>(
    '1080p',
  )

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [eRes, pRes] = await Promise.all([http.get('/api/exports'), http.get('/api/projects')])
      const e = arrayFrom<ExportRow>(eRes)
      const p = arrayFrom<ProjectRow>(pRes)
      setExports(e)
      setProjects(p)
      if (!selectedProject && p[0]?.id) setSelectedProject(p[0].id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load render queue.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const projectName = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of projects) m.set(p.id, p.name ?? p.id.slice(0, 8))
    return (id: string) => m.get(id) ?? id.slice(0, 8)
  }, [projects])

  const activeJobs: RenderJob[] = exports
    .filter((e) => e.status === 'pending' || e.status === 'rendering')
    .map((e) => ({
      id: e.id,
      filename: `${projectName(e.project_id)}.${e.format ?? 'mp4'}`,
      progress: typeof e.progress === 'number' ? e.progress : null,
      eta: e.status === 'pending' ? 'queued' : undefined,
      preset: `${e.resolution ?? '1080p'} · ${(e.format ?? 'mp4').toUpperCase()}`,
    }))

  const completed = exports.filter((e) => e.status === 'done')
  const failed = exports.filter((e) => e.status === 'failed' || e.status === 'error')

  async function queueRender(e: React.FormEvent) {
    e.preventDefault()
    if (creating) return
    if (!selectedProject) {
      setError(
        t('exportQueue.needProject', {}, { defaultValue: 'Choose a project to render first.' }),
      )
      return
    }
    setCreating(true)
    setError(null)
    try {
      const res = await http.post('/api/exports', {
        project_id: selectedProject,
        format: selectedFormat,
        resolution: selectedResolution,
      })
      void track({
        name: 'export.rendered',
        properties: {
          project_id: selectedProject,
          export_id: (res as { data?: { id?: string } })?.data?.id,
          format: selectedFormat,
          resolution: selectedResolution,
        },
      })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Render queue failed.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <RushesLayout
      title={t('exportQueue.title', {}, { defaultValue: 'Export queue' })}
      breadcrumb="// renders"
    >
      <div className={cm.stack(6)}>
        <header>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'text-[var(--video-text-primary)] tracking-tight',
            )}
          >
            {t('exportQueue.heading', {}, { defaultValue: 'Render queue' })}
          </h2>
          <p
            data-mol-id="exports-subtitle"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 1),
              'text-[var(--video-text-muted-alt)]',
            )}
          >
            {loading
              ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
              : t(
                  'exportQueue.subhead',
                  { active: activeJobs.length, done: completed.length },
                  { defaultValue: '{{active}} active · {{done}} completed' },
                )}
          </p>
        </header>

        {error && (
          <p
            role="alert"
            data-mol-id="exports-error"
            className={cm.cn(cm.textSize('sm'), 'text-[var(--video-error-text)] font-mono')}
          >
            {error}
          </p>
        )}

        <div className={cm.cn('grid grid-cols-2 lg:grid-cols-4 gap-4')}>
          <StudioStatTile
            label={t('exportQueue.statActive', {}, { defaultValue: 'Active renders' })}
            value={String(activeJobs.length)}
            accent="violet"
            icon="cloud_download"
          />
          <StudioStatTile
            label={t('status.queued', {}, { defaultValue: 'Queued' })}
            value={String(exports.filter((e) => e.status === 'pending').length)}
            accent="amber"
            icon="schedule"
          />
          <StudioStatTile
            label={t('common.completed', {}, { defaultValue: 'Completed' })}
            value={String(completed.length)}
            accent="cyan"
            icon="movie"
          />
          <StudioStatTile
            label={t('status.failed', {}, { defaultValue: 'Failed' })}
            value={String(failed.length)}
            accent="pink"
            icon="error"
          />
        </div>

        <form
          onSubmit={queueRender}
          data-mol-id="export-form"
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
            {t('exportQueue.formTitle', {}, { defaultValue: 'Queue a new render' })}
          </h3>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-3')}>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)]',
                )}
              >
                {t('exportQueue.formProject', {}, { defaultValue: 'Project' })}
              </span>
              <select
                data-mol-id="export-form-project"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-md bg-[var(--video-input-bg)] text-[var(--video-text-primary)] border border-[var(--video-border-subtle)] focus:border-[var(--video-cta-from)] focus:outline-none transition-colors text-sm',
                )}
              >
                {projects.length === 0 && (
                  <option value="">
                    {t('exportQueue.noProjectsOption', {}, { defaultValue: 'No projects yet' })}
                  </option>
                )}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? p.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)]',
                )}
              >
                {t('form.format', {}, { defaultValue: 'Format' })}
              </span>
              <select
                data-mol-id="export-form-format"
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as 'mp4' | 'webm' | 'gif')}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-md bg-[var(--video-input-bg)] text-[var(--video-text-primary)] border border-[var(--video-border-subtle)] focus:border-[var(--video-cta-from)] focus:outline-none transition-colors text-sm',
                )}
              >
                <option value="mp4">MP4</option>
                <option value="webm">WebM</option>
                <option value="gif">GIF</option>
              </select>
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)]',
                )}
              >
                {t('exportQueue.formResolution', {}, { defaultValue: 'Resolution' })}
              </span>
              <select
                data-mol-id="export-form-resolution"
                value={selectedResolution}
                onChange={(e) =>
                  setSelectedResolution(e.target.value as '480p' | '720p' | '1080p' | '4k')
                }
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-md bg-[var(--video-input-bg)] text-[var(--video-text-primary)] border border-[var(--video-border-subtle)] focus:border-[var(--video-cta-from)] focus:outline-none transition-colors text-sm',
                )}
              >
                <option value="480p">480p</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="4k">4K</option>
              </select>
            </label>
          </div>
          <div className={cm.cn(cm.flex({ justify: 'end' }))}>
            <button
              type="submit"
              data-mol-id="export-form-submit"
              disabled={creating || !selectedProject}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity disabled:opacity-50',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>cloud_upload</span>
              <span>
                {creating
                  ? t('exportQueue.queuing', {}, { defaultValue: 'Queuing…' })
                  : t('exportQueue.queue', {}, { defaultValue: 'Queue render' })}
              </span>
            </button>
          </div>
        </form>

        <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
          <div className={cm.cn('lg:col-span-1')}>
            <RenderJobCard jobs={activeJobs} hideViewAll />
          </div>

          <section
            className={cm.cn(
              'lg:col-span-2',
              cm.sp('p', 5),
              cm.stack(4),
              'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
            )}
          >
            <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <h3
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-[var(--video-text-primary)]',
                )}
              >
                {t('exportQueue.recentTitle', {}, { defaultValue: 'All exports' })}
              </h3>
              <span
                className={cm.cn(
                  'font-mono text-[10px] uppercase tracking-widest text-[var(--video-link)]',
                )}
              >
                {t(
                  'exportQueue.recentCount',
                  { count: exports.length },
                  { defaultValue: '{{count}} total' },
                )}
              </span>
            </header>

            {exports.length === 0 ? (
              <p
                data-mol-id="exports-empty"
                className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-muted-alt)]')}
              >
                {t(
                  'exportQueue.emptyAll',
                  {},
                  { defaultValue: 'No exports yet — queue one above.' },
                )}
              </p>
            ) : (
              <table
                data-mol-id="exports-table"
                className={cm.cn(cm.w('full'))}
                style={{ borderCollapse: 'separate', borderSpacing: 0 }}
              >
                <thead>
                  <tr>
                    <th
                      className={cm.cn(
                        cm.sp('py', 2),
                        cm.sp('pr', 4),
                        'text-left font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)]',
                      )}
                    >
                      {t('exportQueue.col.filename', {}, { defaultValue: 'File' })}
                    </th>
                    <th
                      className={cm.cn(
                        cm.sp('py', 2),
                        cm.sp('px', 4),
                        'text-left font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)] hidden md:table-cell',
                      )}
                    >
                      {t('exportQueue.col.preset', {}, { defaultValue: 'Preset' })}
                    </th>
                    <th
                      className={cm.cn(
                        cm.sp('py', 2),
                        cm.sp('px', 4),
                        'text-left font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)] hidden md:table-cell',
                      )}
                    >
                      {t('status.queued', {}, { defaultValue: 'Queued' })}
                    </th>
                    <th
                      className={cm.cn(
                        cm.sp('py', 2),
                        cm.sp('px', 4),
                        'text-left font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)]',
                      )}
                    >
                      {t('nav.status', {}, { defaultValue: 'Status' })}
                    </th>
                    <th
                      className={cm.cn(
                        cm.sp('py', 2),
                        cm.sp('pl', 4),
                        'text-right font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)]',
                      )}
                    >
                      {t('nav.actions', {}, { defaultValue: 'Actions' })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exports.map((row) => (
                    <tr
                      key={row.id}
                      data-mol-id={`export-row-${row.id}`}
                      className={cm.cn('hover:bg-[var(--video-input-bg)]/60 transition-colors')}
                    >
                      <td
                        className={cm.cn(
                          cm.sp('py', 3),
                          cm.sp('pr', 4),
                          'border-t border-[var(--video-border-subtle)]',
                        )}
                      >
                        <div className={cm.cn(cm.stack(0))}>
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              'font-mono text-[var(--video-text-primary)]',
                            )}
                          >
                            {projectName(row.project_id)}.{row.format ?? 'mp4'}
                          </span>
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              'text-[var(--video-text-muted-alt)]',
                            )}
                          >
                            {row.id.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('py', 3),
                          cm.sp('px', 4),
                          cm.textSize('xs'),
                          'border-t border-[var(--video-border-subtle)] font-mono text-[var(--video-text-muted-alt)] hidden md:table-cell',
                        )}
                      >
                        {row.resolution ?? '1080p'} · {(row.format ?? 'mp4').toUpperCase()}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('py', 3),
                          cm.sp('px', 4),
                          cm.textSize('xs'),
                          'border-t border-[var(--video-border-subtle)] font-mono text-[var(--video-text-muted-alt)] hidden md:table-cell',
                        )}
                      >
                        {timeAgo(row.created_at)}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('py', 3),
                          cm.sp('px', 4),
                          'border-t border-[var(--video-border-subtle)]',
                        )}
                      >
                        <StatusPill
                          status={statusToPill(row.status)}
                          label={row.status ?? 'pending'}
                        />
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('py', 3),
                          cm.sp('pl', 4),
                          'border-t border-[var(--video-border-subtle)] text-right',
                        )}
                      >
                        <Link
                          to={`/export/${row.id}`}
                          data-mol-id={`export-view-${row.id}`}
                          className={cm.cn(
                            'font-mono text-[10px] uppercase tracking-widest text-[var(--video-link)] hover:text-[var(--video-link-hover)] transition-colors',
                          )}
                        >
                          {t('exportQueue.view', {}, { defaultValue: 'View →' })}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </RushesLayout>
  )
}

export default ExportQueue
