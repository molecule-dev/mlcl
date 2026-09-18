import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { unwrapSingle } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RushesLayout } from '../components/RushesLayout.js'
import { type ProjectStatus, StatusPill } from '../components/StatusPill.js'

interface ExportRow {
  id: string
  project_id: string
  format?: string | null
  resolution?: string | null
  quality?: string | null
  status?: string | null
  progress?: number | null
  output_url?: string | null
  error_message?: string | null
  created_at?: string | null
  finished_at?: string | null
}

interface ProjectRow {
  id: string
  name?: string | null
  width?: number | null
  height?: number | null
  fps?: number | null
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

export function ExportDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [exp, setExp] = useState<ExportRow | null>(null)
  const [project, setProject] = useState<ProjectRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await http.get(`/api/exports/${id}`)
        if (cancelled) return
        const data = unwrapSingle<ExportRow>(res.data)
        if (!data || !data.id) throw new Error('Export not found')
        setExp(data as ExportRow)
        try {
          const p = await http.get(`/api/projects/${data.project_id}`)
          if (cancelled) return
          setProject(unwrapSingle<ProjectRow>(p.data) as ProjectRow)
        } catch (_error) {
          // non-fatal — project may have been deleted; export detail still renders without it
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load export.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, http])

  async function handleCopy() {
    if (!exp?.output_url && !exp) return
    const url = exp.output_url || `${window.location.origin}/export/${exp.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2_000)
    } catch (_error) {
      // clipboard API rejection is handled by surfacing a UI error message
      setError(t('exportDetail.copyFailed', {}, { defaultValue: 'Could not copy to clipboard.' }))
    }
  }

  if (loading) {
    return (
      <RushesLayout
        title={t('exportDetail.loading', {}, { defaultValue: 'Loading render…' })}
        breadcrumb="// renders"
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-[var(--video-text-muted-alt)] font-mono')}>
          {t('exportDetail.loading', {}, { defaultValue: 'Loading render…' })}
        </p>
      </RushesLayout>
    )
  }
  if (error || !exp) {
    return (
      <RushesLayout
        title={t('exportDetail.error', {}, { defaultValue: 'Render unavailable' })}
        breadcrumb="// renders"
      >
        <div className={cm.stack(4)}>
          <p
            role="alert"
            data-mol-id="export-error"
            className={cm.cn(cm.textSize('sm'), 'text-[var(--video-error-text)] font-mono')}
          >
            {error ?? t('exportDetail.notFound', {}, { defaultValue: 'Render not found.' })}
          </p>
          <Link
            to="/export"
            className={cm.cn(
              'font-mono text-[11px] uppercase tracking-widest text-[var(--video-link)] hover:text-[var(--video-link-hover)]',
            )}
          >
            ← {t('exportDetail.back', {}, { defaultValue: 'Back to queue' })}
          </Link>
        </div>
      </RushesLayout>
    )
  }

  const projectName = project?.name ?? exp.project_id.slice(0, 8)
  const filename = `${projectName}.${exp.format ?? 'mp4'}`
  const pct = typeof exp.progress === 'number' ? Math.max(0, Math.min(100, exp.progress)) : 0
  const shareUrl =
    exp.output_url ||
    `${typeof window !== 'undefined' ? window.location.origin : ''}/export/${exp.id}`

  return (
    <RushesLayout
      title={filename}
      breadcrumb={t(
        'exportDetail.crumb',
        { id: exp.id.slice(0, 8) },
        { defaultValue: '// renders › {{id}}' },
      )}
    >
      <div data-mol-id="export-detail" className={cm.stack(6)}>
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
            <StatusPill status={statusToPill(exp.status)} label={exp.status ?? 'pending'} />
            <span
              className={cm.cn(
                'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)]',
              )}
            >
              {timeAgo(exp.created_at)}
            </span>
          </div>
          <h2
            data-mol-id="export-filename"
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-[var(--video-text-primary)] relative z-10 font-mono break-all',
            )}
          >
            {filename}
          </h2>
          {project && (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'text-[var(--video-text-muted-alt)] relative z-10',
              )}
            >
              {t(
                'exportDetail.from',
                { project: project.name ?? '' },
                { defaultValue: 'From {{project}}' },
              )}{' '}
              <Link
                to={`/projects/${project.id}`}
                className={cm.cn('text-[var(--video-link)] hover:text-[var(--video-link-hover)]')}
              >
                ↗
              </Link>
            </p>
          )}

          <div className={cm.cn('relative z-10', cm.stack(2))}>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <span
                data-mol-id="export-progress"
                className={cm.cn(
                  'font-mono text-[12px] uppercase tracking-widest text-[var(--video-link)]',
                )}
              >
                {pct}%
              </span>
              <span
                className={cm.cn(
                  'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)]',
                )}
              >
                {exp.status === 'done'
                  ? t('exportDetail.complete', {}, { defaultValue: 'Render complete' })
                  : exp.status === 'failed'
                    ? t('status.failed', {}, { defaultValue: 'Failed' })
                    : t('status.queued', {}, { defaultValue: 'Queued' })}
              </span>
            </div>
            <div
              className={cm.cn(
                'h-2 w-full bg-[var(--video-input-bg)] rounded-full overflow-hidden',
              )}
            >
              <div
                className={cm.cn(
                  'h-full rounded-full bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] transition-[width] duration-500',
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </header>

        {exp.error_message && (
          <p
            role="alert"
            data-mol-id="export-error-msg"
            className={cm.cn(cm.textSize('sm'), 'text-[var(--video-error-text)] font-mono')}
          >
            {exp.error_message}
          </p>
        )}

        <div className={cm.cn('grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6')}>
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
                {t('exportDetail.log', {}, { defaultValue: 'Render log' })}
              </h3>
            </header>
            <ol
              className={cm.cn('font-mono', cm.textSize('xs'), cm.stack(2))}
              data-mol-id="export-log"
            >
              <LogLine
                ts={exp.created_at}
                msg={t('exportDetail.logCreated', {}, { defaultValue: 'Render queued.' })}
              />
              {exp.status !== 'pending' && exp.status !== 'failed' && (
                <LogLine
                  ts={exp.created_at}
                  msg={t(
                    'exportDetail.logRendering',
                    { fmt: (exp.format ?? 'mp4').toUpperCase(), res: exp.resolution ?? '1080p' },
                    { defaultValue: 'Encoder started — {{fmt}} · {{res}}' },
                  )}
                />
              )}
              {exp.status === 'done' && (
                <LogLine
                  ts={exp.finished_at}
                  msg={t('exportDetail.logDone', {}, { defaultValue: 'Render complete.' })}
                />
              )}
              {exp.status === 'failed' && (
                <LogLine
                  ts={exp.finished_at ?? exp.created_at}
                  msg={
                    exp.error_message ??
                    t('exportDetail.logFailed', {}, { defaultValue: 'Render failed.' })
                  }
                  accent="error"
                />
              )}
            </ol>
          </section>

          <aside className={cm.cn(cm.stack(4))}>
            <div
              className={cm.cn(
                cm.sp('p', 5),
                cm.stack(3),
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
                {t('exportDetail.specs', {}, { defaultValue: 'Output specs' })}
              </h3>
              <Spec
                label={t('form.format', {}, { defaultValue: 'Format' })}
                value={(exp.format ?? 'mp4').toUpperCase()}
              />
              <Spec
                label={t('exportDetail.resolution', {}, { defaultValue: 'Resolution' })}
                value={exp.resolution ?? '1080p'}
              />
              <Spec
                label={t('exportDetail.quality', {}, { defaultValue: 'Quality' })}
                value={exp.quality ?? 'high'}
              />
              {project && (
                <Spec
                  label={t('exportDetail.fps', {}, { defaultValue: 'Frame rate' })}
                  value={`${project.fps ?? 30} fps`}
                />
              )}
              <Spec
                label={t('exportDetail.created', {}, { defaultValue: 'Created' })}
                value={timeAgo(exp.created_at) || '—'}
              />
            </div>

            <div
              className={cm.cn(
                cm.sp('p', 5),
                cm.stack(3),
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
                {t('common.share', {}, { defaultValue: 'Share' })}
              </h3>
              <p
                data-mol-id="export-share-url"
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-mono text-[var(--video-text-muted-alt)] truncate',
                )}
              >
                {shareUrl}
              </p>
              <button
                type="button"
                data-mol-id="export-copy"
                onClick={handleCopy}
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg border border-[var(--video-border-subtle)] hover:border-[var(--video-cta-from)]/40 text-[var(--video-text-primary)] transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>content_copy</span>
                <span>
                  {copied
                    ? t('common.copiedBang', {}, { defaultValue: 'Copied!' })
                    : t('exportDetail.copy', {}, { defaultValue: 'Copy link' })}
                </span>
              </button>
              {exp.output_url && (
                <a
                  href={exp.output_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-mol-id="export-download"
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'rounded-lg bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-[18px]')}>download</span>
                  <span>{t('exportDetail.download', {}, { defaultValue: 'Download render' })}</span>
                </a>
              )}
            </div>

            <Link
              to="/export"
              className={cm.cn(
                cm.fontWeight('medium'),
                cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-[var(--video-border-subtle)] hover:border-[var(--video-cta-from)]/40 text-[var(--video-text-primary)] transition-colors',
              )}
            >
              ← {t('exportDetail.backToQueue', {}, { defaultValue: 'Back to queue' })}
            </Link>
          </aside>
        </div>
      </div>
    </RushesLayout>
  )
}

interface LogLineProps {
  ts?: string | null
  msg: string
  accent?: 'error'
}
function LogLine({ ts, msg, accent }: LogLineProps) {
  const cm = getClassMap()
  const fmt = ts ? new Date(ts).toISOString().slice(11, 19) : '--:--:--'
  return (
    <li
      className={cm.cn(
        'flex gap-3 px-3 py-2 rounded-md bg-[var(--video-input-bg)] border border-[var(--video-border-subtle)]',
      )}
    >
      <span className={cm.cn('text-[var(--video-text-dim)] tabular-nums shrink-0')}>{fmt}</span>
      <span
        className={cm.cn(
          accent === 'error'
            ? 'text-[var(--video-error-text)]'
            : 'text-[var(--video-text-primary)]',
        )}
      >
        {msg}
      </span>
    </li>
  )
}

interface SpecProps {
  label: string
  value: string
}
function Spec({ label, value }: SpecProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('xs'))}>
      <span className={cm.cn('font-mono uppercase tracking-widest text-[var(--video-text-dim)]')}>
        {label}
      </span>
      <span className={cm.cn('font-mono text-[var(--video-text-primary)]')}>{value}</span>
    </div>
  )
}

export default ExportDetail
