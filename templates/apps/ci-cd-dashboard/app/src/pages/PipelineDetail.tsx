import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type PipelineStatus, StatusPill } from '../components/StatusPill.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface Stage {
  name: string
  status: PipelineStatus
  duration_seconds: number | null
  log_excerpt: string[]
}

interface PipelineArtifact {
  id: string
  name: string
  size_bytes: number
}

interface Pipeline {
  id: string
  name: string
  repository: string
  branch: string
  commit_sha: string
  commit_message: string
  commit_author: string
  status: PipelineStatus
  started_at: string
  duration_seconds: number | null
  stages: Stage[]
  artifacts: PipelineArtifact[]
  coverage_pct: number | null
}

const ACCENT: Record<PipelineStatus, string> = {
  queued: 'var(--color-status-queued)',
  running: 'var(--color-status-running)',
  success: 'var(--color-status-success)',
  failed: 'var(--color-status-failed)',
  cancelled: 'var(--color-status-cancelled)',
  skipped: 'var(--color-status-cancelled)',
  healthy: 'var(--color-status-success)',
  degraded: 'var(--color-warning)',
}

const LOG_COLOR_RX = [
  { rx: /\b(error|fail(ed|ure)?|exit\s+code\s+1|panic)\b/i, color: 'var(--color-log-error)' },
  { rx: /\b(warn(ing)?|deprecat)/i, color: 'var(--color-log-warn)' },
  { rx: /\b(pass|ok|success|done|✓)\b/i, color: 'var(--color-status-success)' },
  { rx: /\b(info|installing|building|running)\b/i, color: 'var(--color-log-info)' },
]

function logLineColor(line: string): string {
  for (const { rx, color } of LOG_COLOR_RX) {
    if (rx.test(line)) return color
  }
  return 'var(--color-on-surface-variant)'
}

function fmtDur(seconds: number | null): string {
  if (seconds == null) return '—'
  if (seconds < 1) return '< 1s'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m ${s.toString().padStart(2, '0')}s`
  const h = Math.floor(m / 60)
  return `${h}h ${(m % 60).toString().padStart(2, '0')}m`
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function coverageTone(pct: number): { color: string; bg: string; label: string } {
  if (pct >= 80)
    return {
      color: 'var(--color-on-primary-container)',
      bg: 'var(--color-status-success)',
      label: 'High',
    }
  if (pct >= 50)
    return { color: 'var(--color-log-warn)', bg: 'var(--color-warning)', label: 'Medium' }
  return { color: 'var(--color-log-error)', bg: 'var(--color-status-failed)', label: 'Low' }
}

export function PipelineDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/pipelines/${id}`)
      .then((res) => {
        const p = unwrapSingle<Pipeline>(res)
        if (!cancelled) {
          setPipeline(p)
          if (p) {
            // Domain funnel event — fire-and-forget; a no-op without a
            // bonded analytics provider.
            void track({
              name: 'pipeline.viewed',
              properties: { pipeline_id: p.id, status: p.status, repository: p.repository },
            })
            const next = new Set<string>()
            for (const s of p.stages) {
              if (s.status === 'failed' || s.status === 'running') next.add(s.name)
            }
            setExpanded(next)
          }
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('pipelineDetail.loadError', {}, { defaultValue: 'Failed to load pipeline.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  function toggleStage(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Link
        to="/pipelines"
        className={cm.cn(
          cm.textSize('xs'),
          'inline-flex items-center gap-1 font-mono uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors',
        )}
      >
        <span className={'material-symbols-outlined text-base'} aria-hidden="true">
          arrow_back
        </span>
        {t('pipelineDetail.backLink', {}, { defaultValue: 'All pipelines' })}
      </Link>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('pipelineDetail.loading', {}, { defaultValue: 'Loading pipeline…' })}
        </p>
      ) : !pipeline ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('pipelineDetail.notFound', {}, { defaultValue: 'Pipeline not found.' })}
        </p>
      ) : (
        <>
          {/* Hero header */}
          <header
            className={'relative overflow-hidden rounded-[1.5rem] mt-4 p-6 md:p-8'}
            style={{
              backgroundImage: `linear-gradient(135deg, ${ACCENT[pipeline.status]}33, rgba(99, 102, 241, 0.10))`,
              backgroundColor: 'var(--color-surface)',
              border: '1px solid rgba(30, 41, 59, 0.8)',
            }}
            data-mol-id="pipeline-detail-hero"
          >
            <div
              className={
                'absolute -right-16 -bottom-20 h-56 w-56 rounded-full blur-3xl pointer-events-none'
              }
              style={{ backgroundColor: `${ACCENT[pipeline.status]}55` }}
              aria-hidden="true"
            />
            <div className="relative">
              <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
                <StatusPill status={pipeline.status} emphasis />
                <span className={'font-mono text-xs text-on-surface-variant'}>
                  #{pipeline.id} · {fmtRelative(pipeline.started_at)}
                </span>
              </div>
              <h1
                className={
                  'mt-3 font-mono text-3xl md:text-4xl font-extrabold tracking-tighter text-on-surface'
                }
              >
                {pipeline.name}
              </h1>
              <p className={'mt-1 text-sm font-semibold text-on-surface-variant'}>
                {pipeline.repository}
              </p>

              <div className={'mt-5 flex flex-wrap items-center gap-x-6 gap-y-3'}>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    {t('pipelineDetail.commit', {}, { defaultValue: 'Commit' })}
                  </p>
                  <p className={'mt-0.5 font-mono text-sm font-bold text-on-surface'}>
                    {pipeline.commit_sha.slice(0, 8)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    {t('pipelineDetail.branch', {}, { defaultValue: 'Branch' })}
                  </p>
                  <p
                    className={'mt-0.5 font-mono text-sm font-bold'}
                    style={{ color: ACCENT[pipeline.status] }}
                  >
                    {pipeline.branch}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    {t('form.duration', {}, { defaultValue: 'Duration' })}
                  </p>
                  <p className={'mt-0.5 font-mono text-sm font-bold text-on-surface'}>
                    {fmtDur(pipeline.duration_seconds)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    {t('pipelineDetail.author', {}, { defaultValue: 'Triggered by' })}
                  </p>
                  <p className={'mt-0.5 text-sm font-semibold text-on-surface'}>
                    {pipeline.commit_author}
                  </p>
                </div>
              </div>

              <p className={'mt-4 max-w-2xl text-sm text-on-surface-variant italic'}>
                “{pipeline.commit_message}”
              </p>
            </div>
          </header>

          <div className={cm.cn(cm.sp('mt', 6), cm.grid({ cols: 12, gap: 'lg' }))}>
            {/* Stages */}
            <div className={'col-span-12 lg:col-span-8'}>
              <h2
                className={
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3'
                }
              >
                {t('pipelineDetail.stagesHeading', {}, { defaultValue: 'Stages' })}
              </h2>
              <ul className={'space-y-2.5'}>
                {pipeline.stages.map((stage, idx) => {
                  const isOpen = expanded.has(stage.name)
                  const accent = ACCENT[stage.status]
                  return (
                    <li
                      key={stage.name}
                      className={'rounded-xl overflow-hidden'}
                      style={{
                        backgroundColor: 'rgba(30, 34, 53, 0.6)',
                        border: '1px solid rgba(30, 41, 59, 0.8)',
                        borderLeft: `3px solid ${accent}`,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleStage(stage.name)}
                        className={
                          'w-full flex items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]'
                        }
                        aria-expanded={isOpen}
                        data-mol-id={`stage-toggle-${stage.name}`}
                      >
                        <span className={'flex items-center gap-3 min-w-0'}>
                          <span
                            className={
                              'font-mono text-[11px] font-bold text-on-surface-variant w-6 shrink-0'
                            }
                          >
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <StatusPill status={stage.status} />
                          <span className={'font-mono text-sm font-bold text-on-surface truncate'}>
                            {stage.name}
                          </span>
                        </span>
                        <span className={'flex items-center gap-3 shrink-0'}>
                          <span
                            className={'font-mono text-xs font-semibold text-on-surface-variant'}
                          >
                            {fmtDur(stage.duration_seconds)}
                          </span>
                          <span
                            className={
                              'material-symbols-outlined text-base text-on-surface-variant transition-transform'
                            }
                            aria-hidden="true"
                            style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                          >
                            chevron_right
                          </span>
                        </span>
                      </button>
                      {isOpen && stage.log_excerpt.length > 0 ? (
                        <div
                          className={'border-t font-mono text-[12px] leading-[1.6]'}
                          style={{
                            borderColor: 'rgba(30, 41, 59, 0.8)',
                            backgroundColor: 'var(--color-background)',
                          }}
                        >
                          <table className={'w-full'}>
                            <tbody>
                              {stage.log_excerpt.map((line, lineIdx) => (
                                <tr key={lineIdx}>
                                  <td
                                    className={
                                      'select-none text-right px-3 py-0.5 align-top w-[60px] font-mono text-[11px]'
                                    }
                                    style={{
                                      color: 'var(--color-on-surface-variant)',
                                      borderRight: '1px solid rgba(30, 41, 59, 0.8)',
                                    }}
                                  >
                                    {String(lineIdx + 1).padStart(3, '0')}
                                  </td>
                                  <td
                                    className={'px-3 py-0.5 whitespace-pre-wrap break-words'}
                                    style={{ color: logLineColor(line) }}
                                  >
                                    {line}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : isOpen ? (
                        <p
                          className={'border-t px-4 py-3 text-xs italic text-on-surface-variant'}
                          style={{ borderColor: 'rgba(30, 41, 59, 0.8)' }}
                        >
                          {t(
                            'pipelineDetail.noLogs',
                            {},
                            { defaultValue: 'No log output captured for this stage.' },
                          )}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Side panel */}
            <aside className={'col-span-12 lg:col-span-4 space-y-4'}>
              <div
                className={'rounded-xl p-5'}
                style={{
                  backgroundColor: 'rgba(30, 34, 53, 0.6)',
                  border: '1px solid rgba(30, 41, 59, 0.8)',
                }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t('pipelineDetail.commitDetails', {}, { defaultValue: 'Commit details' })}
                </p>
                <p className={'mt-2 font-mono text-sm font-bold text-on-surface break-all'}>
                  {pipeline.commit_sha}
                </p>
                <p className={'mt-1 text-sm text-on-surface italic'}>{pipeline.commit_message}</p>
                <p className={'mt-2 text-xs text-on-surface-variant'}>
                  {t(
                    'pipelineDetail.byAuthor',
                    { author: pipeline.commit_author },
                    { defaultValue: 'by {{author}}' },
                  )}
                </p>
              </div>

              {pipeline.coverage_pct != null
                ? (() => {
                    const cov = coverageTone(pipeline.coverage_pct)
                    const pct = pipeline.coverage_pct
                    return (
                      <div
                        className={'rounded-xl p-5'}
                        style={{
                          backgroundColor: 'rgba(30, 34, 53, 0.6)',
                          border: '1px solid rgba(30, 41, 59, 0.8)',
                        }}
                      >
                        <div
                          className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}
                        >
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                            {t('pipelineDetail.coverage', {}, { defaultValue: 'Coverage' })}
                          </p>
                          <span
                            className={
                              'inline-flex px-2 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest'
                            }
                            style={{ backgroundColor: `${cov.bg}25`, color: cov.color }}
                          >
                            {cov.label}
                          </span>
                        </div>
                        <p
                          className={
                            'mt-2 font-mono text-3xl font-extrabold tracking-tighter text-on-surface'
                          }
                        >
                          {pct.toFixed(1)}
                          <span className={'text-base font-medium text-on-surface-variant'}>%</span>
                        </p>
                        <div
                          className={'mt-3 h-1.5 w-full rounded-full overflow-hidden'}
                          style={{ backgroundColor: 'rgba(30, 41, 59, 0.9)' }}
                        >
                          <div
                            className={'h-full rounded-full transition-all'}
                            style={{ width: `${pct}%`, backgroundColor: cov.bg }}
                          />
                        </div>
                      </div>
                    )
                  })()
                : null}

              {pipeline.artifacts.length > 0 ? (
                <div
                  className={'rounded-xl p-5'}
                  style={{
                    backgroundColor: 'rgba(30, 34, 53, 0.6)',
                    border: '1px solid rgba(30, 41, 59, 0.8)',
                  }}
                >
                  <p
                    className={
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3'
                    }
                  >
                    {t('pipelineDetail.artifacts', {}, { defaultValue: 'Artifacts' })}
                  </p>
                  <ul className={'space-y-2'}>
                    {pipeline.artifacts.map((a) => (
                      <li
                        key={a.id}
                        className={'flex items-center gap-3 px-3 py-2 rounded-md'}
                        style={{ backgroundColor: 'rgba(12, 14, 20, 0.6)' }}
                      >
                        <span
                          className={'material-symbols-outlined text-base text-on-surface-variant'}
                          aria-hidden="true"
                        >
                          inventory_2
                        </span>
                        <span
                          className={
                            'font-mono text-xs font-semibold text-on-surface flex-1 truncate'
                          }
                        >
                          {a.name}
                        </span>
                        <span className="font-mono text-[11px] text-on-surface-variant">
                          {fmtSize(a.size_bytes)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
