import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { unwrapSingle } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RushesLayout } from '../components/RushesLayout.js'
import { type ProjectStatus, StatusPill } from '../components/StatusPill.js'
import { StudioStatTile } from '../components/StudioStatTile.js'
import { TimelinePreview } from '../components/TimelinePreview.js'

interface ProjectRow {
  id: string
  name: string
  description?: string | null
  width?: number | null
  height?: number | null
  fps?: number | null
  duration_ms?: number | null
  cover_url?: string | null
  template_id?: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface TrackRow {
  id: string
  name: string
  type: string
  position: number
}
interface ClipRow {
  id: string
  name?: string | null
  start_time?: number
  end_time?: number
  track_id: string
}
interface ExportRow {
  id: string
  format?: string | null
  resolution?: string | null
  status?: string | null
  progress?: number | null
  created_at?: string | null
  finished_at?: string | null
  output_url?: string | null
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

function aspectFromDims(w?: number | null, h?: number | null): string {
  if (!w || !h) return '16:9'
  if (w === h) return '1:1'
  if (w / h > 16 / 9 + 0.5) return '21:9'
  if (h > w) return '9:16'
  return '16:9'
}

function durationLabel(ms?: number | null): string {
  if (!ms || ms <= 0) return '00:00:00'
  const t = Math.floor(ms / 1000)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
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

export function ProjectDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [project, setProject] = useState<ProjectRow | null>(null)
  const [tracks, setTracks] = useState<TrackRow[]>([])
  const [clips, setClips] = useState<ClipRow[]>([])
  const [exports, setExports] = useState<ExportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const projRes = await http.get(`/api/projects/${id}`)
        if (cancelled) return
        const proj = unwrapSingle<ProjectRow>(projRes.data)
        if (!proj || !proj.id) throw new Error('Project not found')
        setProject(proj as ProjectRow)
        setName(proj.name ?? '')
        const [tRes, cRes, eRes] = await Promise.all([
          http.get(`/api/timeline/tracks?projectId=${id}`).catch(() => null),
          http.get(`/api/clips?projectId=${id}`).catch(() => null),
          http.get(`/api/exports?projectId=${id}`).catch(() => null),
        ])
        if (cancelled) return
        setTracks(arrayFrom<TrackRow>(tRes))
        setClips(arrayFrom<ClipRow>(cRes))
        setExports(arrayFrom<ExportRow>(eRes))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load project.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, http])

  async function handleSaveName() {
    if (!project || !name.trim()) return
    try {
      const res = await http.put(`/api/projects/${project.id}`, { name: name.trim() })
      const updated = unwrapSingle<ProjectRow>(res.data)
      setProject(updated as ProjectRow)
      setEditingName(false)
      void track({ name: 'project.renamed', properties: { project_id: project.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project.')
    }
  }

  async function handleDelete() {
    if (!project) return
    if (
      !confirm(
        t(
          'projectDetail.confirmDelete',
          { name: project.name },
          { defaultValue: 'Delete "{{name}}" and all its clips? This cannot be undone.' },
        ),
      )
    )
      return
    setDeleting(true)
    setError(null)
    try {
      await http.delete(`/api/projects/${project.id}`)
      void track({ name: 'project.deleted', properties: { project_id: project.id } })
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
      setDeleting(false)
    }
  }

  async function handleExport() {
    if (!project) return
    try {
      const res = await http.post('/api/exports', {
        project_id: project.id,
        format: 'mp4',
        resolution: '1080p',
      })
      const created = unwrapSingle<ExportRow>(res.data)
      if (!created?.id) throw new Error('Export not created')
      void track({
        name: 'export.rendered',
        properties: {
          project_id: project.id,
          export_id: created.id,
          format: 'mp4',
          resolution: '1080p',
        },
      })
      navigate(`/export/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Render queue failed.')
    }
  }

  if (loading) {
    return (
      <RushesLayout
        title={t('projectDetail.loading', {}, { defaultValue: 'Loading project…' })}
        breadcrumb="// projects"
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-[var(--video-text-muted-alt)] font-mono')}>
          {t('projectDetail.loading', {}, { defaultValue: 'Loading project…' })}
        </p>
      </RushesLayout>
    )
  }
  if (error || !project) {
    return (
      <RushesLayout
        title={t('projectDetail.error', {}, { defaultValue: 'Project unavailable' })}
        breadcrumb="// projects"
      >
        <div className={cm.stack(4)}>
          <p
            role="alert"
            data-mol-id="project-error"
            className={cm.cn(cm.textSize('sm'), 'text-[var(--video-error-text)] font-mono')}
          >
            {error ?? t('projectDetail.notFound', {}, { defaultValue: 'Project not found.' })}
          </p>
          <Link
            to="/dashboard"
            className={cm.cn(
              'font-mono text-[11px] uppercase tracking-widest text-[var(--video-link)] hover:text-[var(--video-link-hover)]',
            )}
          >
            ← {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          </Link>
        </div>
      </RushesLayout>
    )
  }

  const activeRender = exports.find((e) => e.status === 'rendering' || e.status === 'pending')
  const totalDurationMs = clips.reduce(
    (acc, c) => acc + Math.max(0, (c.end_time ?? 0) - (c.start_time ?? 0)),
    0,
  )

  return (
    <RushesLayout
      title={project.name}
      breadcrumb={t('projectDetail.crumb', {}, { defaultValue: '// projects › detail' })}
      toolbar={
        <Link
          to={`/editor/${project.id}`}
          data-mol-id="projectDetail-edit"
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', gap: 1 }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            'rounded-md bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity uppercase tracking-widest font-mono',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')}>edit</span>
          <span>{t('projectDetail.edit', {}, { defaultValue: 'Open editor' })}</span>
        </Link>
      }
    >
      <div className={cm.stack(6)} data-mol-id="project-detail">
        <header
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'rounded-2xl border border-[var(--video-border-subtle)] bg-gradient-to-br from-[var(--video-panel-bg)] to-[var(--video-panel-bg-alt)] relative overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              'absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full bg-[var(--video-cta-from)]/15 blur-3xl pointer-events-none',
            )}
          />
          <div
            className={cm.cn(
              'absolute -bottom-20 -left-20 w-[300px] h-[300px] rounded-full bg-[var(--video-link-hover)]/15 blur-3xl pointer-events-none',
            )}
          />
          <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), 'relative z-10')}>
            <StatusPill
              status={activeRender ? 'rendering' : 'ready'}
              label={
                activeRender
                  ? t('projectDetail.activeRender', {}, { defaultValue: 'Render in progress' })
                  : t('projectDetail.ready', {}, { defaultValue: 'Ready' })
              }
            />
            <span
              className={cm.cn(
                'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)]',
              )}
            >
              {t(
                'projectDetail.id',
                { id: project.id.slice(0, 8) },
                { defaultValue: '// id · {{id}}' },
              )}
            </span>
          </div>
          {editingName ? (
            <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'relative z-10')}>
              <input
                type="text"
                data-mol-id="project-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xl'),
                  'rounded-md bg-[var(--video-input-bg)] text-[var(--video-text-primary)] border border-[var(--video-cta-from)]/40 focus:border-[var(--video-cta-from)] focus:outline-none transition-colors flex-1',
                )}
              />
              <button
                type="button"
                data-mol-id="project-name-save"
                onClick={handleSaveName}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  'rounded-md bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white font-semibold',
                )}
              >
                {t('common.save', {}, { defaultValue: 'Save' })}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingName(false)
                  setName(project.name)
                }}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  'rounded-md border border-[var(--video-border-subtle)] text-[var(--video-text-muted-alt)]',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
            </div>
          ) : (
            <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), 'relative z-10')}>
              <h2
                data-mol-id="project-name"
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-[var(--video-text-primary)]',
                )}
              >
                {project.name}
              </h2>
              <button
                type="button"
                data-mol-id="project-name-edit"
                onClick={() => setEditingName(true)}
                aria-label={t('projectDetail.rename', {}, { defaultValue: 'Rename project' })}
                className={cm.cn(
                  'text-[var(--video-text-muted-alt)] hover:text-[var(--video-link)] transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[20px]')}>edit</span>
              </button>
            </div>
          )}
          {project.description && (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'text-[var(--video-text-muted-alt)] max-w-[640px] relative z-10',
              )}
            >
              {project.description}
            </p>
          )}
          <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), 'relative z-10 flex-wrap')}>
            <Pill
              icon="aspect_ratio"
              label={`${aspectFromDims(project.width, project.height)} · ${project.width ?? 1920}×${project.height ?? 1080}`}
            />
            <Pill icon="schedule" label={durationLabel(totalDurationMs || project.duration_ms)} />
            <Pill icon="speed" label={`${project.fps ?? 30}fps`} />
            <Pill
              icon="layers"
              label={t(
                'projectDetail.tracks',
                { tracks: tracks.length, clips: clips.length },
                { defaultValue: '{{tracks}} tracks · {{clips}} clips' },
              )}
            />
          </div>
          <div className={cm.cn(cm.flex({ gap: 2 }), 'relative z-10')}>
            <button
              type="button"
              data-mol-id="project-export"
              onClick={handleExport}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>cloud_upload</span>
              <span>{t('projectDetail.queueRender', {}, { defaultValue: 'Queue render' })}</span>
            </button>
            <button
              type="button"
              data-mol-id="project-delete"
              onClick={handleDelete}
              disabled={deleting}
              className={cm.cn(
                cm.fontWeight('medium'),
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-[var(--video-danger)]/40 text-[var(--video-error-text)] hover:bg-[var(--video-danger)]/10 transition-colors disabled:opacity-50',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>delete</span>
              <span>
                {deleting
                  ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                  : t('projectDetail.delete', {}, { defaultValue: 'Delete project' })}
              </span>
            </button>
          </div>
        </header>

        <div className={cm.cn('grid grid-cols-2 lg:grid-cols-4 gap-4')}>
          <StudioStatTile
            label={t('projectDetail.statTracks', {}, { defaultValue: 'Tracks' })}
            value={String(tracks.length)}
            accent="violet"
            icon="layers"
          />
          <StudioStatTile
            label={t('projectDetail.statClips', {}, { defaultValue: 'Clips' })}
            value={String(clips.length)}
            accent="cyan"
            icon="video_library"
          />
          <StudioStatTile
            label={t('projectDetail.statRenders', {}, { defaultValue: 'Renders' })}
            value={String(exports.length)}
            accent="pink"
            icon="movie"
          />
          <StudioStatTile
            label={t('projectDetail.statUpdated', {}, { defaultValue: 'Last updated' })}
            value={timeAgo(project.updated_at ?? project.created_at) || '—'}
            accent="amber"
            icon="history"
          />
        </div>

        <TimelinePreview
          caption={t(
            'projectDetail.timelineCaption',
            { tracks: tracks.length, clips: clips.length },
            { defaultValue: '{{tracks}} tracks · {{clips}} clips · open the editor to scrub' },
          )}
        />

        <section
          className={cm.cn(
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
              {t('projectDetail.renderHistory', {}, { defaultValue: 'Render history' })}
            </h3>
            <Link
              to="/export"
              className={cm.cn(
                'font-mono text-[10px] uppercase tracking-widest text-[var(--video-link)] hover:text-[var(--video-link-hover)]',
              )}
            >
              {t('projectDetail.openQueue', {}, { defaultValue: 'Open queue →' })}
            </Link>
          </header>
          {exports.length === 0 ? (
            <p
              data-mol-id="project-renders-empty"
              className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-muted-alt)]')}
            >
              {t(
                'projectDetail.noRenders',
                {},
                { defaultValue: 'No renders yet — queue one above.' },
              )}
            </p>
          ) : (
            <ul className={cm.stack(3)} data-mol-id="project-renders">
              {exports.map((r) => (
                <li
                  key={r.id}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.flex({ align: 'center', justify: 'between', gap: 3 }),
                    'rounded-md bg-[var(--video-input-bg)] border border-[var(--video-border-subtle)]',
                  )}
                >
                  <div className={cm.stack(0)}>
                    <Link
                      to={`/export/${r.id}`}
                      className={cm.cn(
                        cm.textSize('xs'),
                        'font-mono text-[var(--video-text-primary)] hover:text-[var(--video-link)]',
                      )}
                    >
                      {r.id.slice(0, 8)}.{r.format ?? 'mp4'}
                    </Link>
                    <span
                      className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-muted-alt)]')}
                    >
                      {r.resolution ?? '1080p'} · {(r.format ?? 'mp4').toUpperCase()}
                    </span>
                  </div>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                    {r.finished_at && (
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)]',
                        )}
                      >
                        {timeAgo(r.finished_at)}
                      </span>
                    )}
                    <StatusPill status={statusToPill(r.status)} label={r.status ?? 'pending'} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </RushesLayout>
  )
}

interface PillProps {
  icon: string
  label: string
}
function Pill({ icon, label }: PillProps) {
  const cm = getClassMap()
  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 1 }),
        cm.sp('px', 3),
        cm.sp('py', 1),
        'rounded-full bg-[var(--video-input-bg)]/60 border border-[var(--video-border-subtle)] font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)]',
      )}
    >
      <span className={cm.cn('material-symbols-outlined text-[14px] text-[var(--video-link)]')}>
        {icon}
      </span>
      <span>{label}</span>
    </span>
  )
}

export default ProjectDetail
