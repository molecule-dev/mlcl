import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LanguagePairBadge } from '../components/LanguagePairBadge.js'
import { ProjectStatusPill } from '../components/ProjectStatusPill.js'
import { SafeLink } from '../components/SafeLink.js'
import { type Segment, SegmentRow, type SegmentStatus } from '../components/SegmentRow.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface TranslateProject {
  id: string
  name: string
  source_lang: string
  target_langs?: string[] | string
  status: 'draft' | 'in_progress' | 'in_review' | 'review' | 'approved' | 'completed' | 'pending'
  due_date?: string | null
  segments?: ApiSegmentRow[]
  stats?: {
    total: number
    approved: number
    needs_review: number
    draft: number
    untranslated: number
  }
}

interface ApiSegmentRow {
  id?: unknown
  source_text?: unknown
  target_text?: unknown
  source_lang?: unknown
  target_lang?: unknown
  status?: unknown
  position?: unknown
  machine_translation?: unknown
}

interface TmMatch {
  id: string
  value: number
  source: string
  target: string
}

interface GlossaryEntry {
  id: string
  source_term: string
  target_term: string
  approved: boolean
}

const ALLOWED_STATUS: SegmentStatus[] = [
  'untranslated',
  'draft',
  'machine',
  'in_review',
  'needs_review',
  'needs_revision',
  'approved',
]
function normaliseStatus(raw: unknown): SegmentStatus {
  const s = String(raw ?? '').toLowerCase()
  return (ALLOWED_STATUS as string[]).includes(s) ? (s as SegmentStatus) : 'untranslated'
}

const STATUS_TO_DB: Record<SegmentStatus, 'untranslated' | 'draft' | 'needs_review' | 'approved'> =
  {
    untranslated: 'untranslated',
    draft: 'draft',
    machine: 'draft',
    in_review: 'needs_review',
    needs_review: 'needs_review',
    needs_revision: 'needs_review',
    approved: 'approved',
  }

function adaptSegment(row: ApiSegmentRow, idx: number): Segment {
  const target = String(row.target_text ?? '')
  const machine = typeof row.machine_translation === 'string' ? row.machine_translation : ''
  return {
    id: String(row.id ?? `s_${idx}`),
    number: typeof row.position === 'number' ? row.position + 1 : idx + 1,
    source: String(row.source_text ?? ''),
    target: target || machine,
    status: normaliseStatus(row.status),
    confidence: target ? 90 : 60,
  }
}

export function Translate() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [project, setProject] = useState<TranslateProject | null>(null)
  const [segments, setSegments] = useState<ReadonlyArray<Segment>>([])
  const [tmMatches, setTmMatches] = useState<ReadonlyArray<TmMatch>>([])
  const [glossaryEntries, setGlossaryEntries] = useState<ReadonlyArray<GlossaryEntry>>([])
  const [activeId, setActiveId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const [mtRunning, setMtRunning] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      id ? http.get(`/projects/${encodeURIComponent(id)}`) : http.get('/projects'),
      http.get(id ? `/segments?project_id=${encodeURIComponent(id)}` : '/segments'),
      http.get('/memory'),
      http.get('/glossary'),
    ])
      .then(([pRes, sRes, tmRes, gRes]) => {
        if (cancelled) return
        const single = unwrapSingle<TranslateProject>(pRes)
        if (single) setProject(single)
        else {
          const list = unwrapList<TranslateProject>(pRes)
          setProject(list[0] ?? null)
        }
        const apiSegments = unwrapList<ApiSegmentRow>(sRes)
        const adapted = apiSegments.map((s, i) => adaptSegment(s, i))
        setSegments(adapted)
        if (adapted.length > 0) setActiveId(adapted[0].id)
        const tmList = unwrapList<Record<string, unknown>>(tmRes).slice(0, 6)
        setTmMatches(
          tmList.map((m, i) => ({
            id: String(m.id ?? `tm_${i}`),
            value: 100,
            source: String(m.source_text ?? ''),
            target: String(m.target_text ?? ''),
          })),
        )
        const glossList = unwrapList<Record<string, unknown>>(gRes).slice(0, 8)
        setGlossaryEntries(
          glossList.map((g, i) => ({
            id: String(g.id ?? `g_${i}`),
            source_term: String(g.source_term ?? ''),
            target_term: String(g.target_term ?? ''),
            approved: g.notes != null,
          })),
        )
      })
      .catch(() => {
        if (!cancelled)
          setError(t('translate.loadError', {}, { defaultValue: 'Failed to load project.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  const active = useMemo(() => segments.find((s) => s.id === activeId), [segments, activeId])

  const totalSegments = segments.length
  const approvedSegments = segments.filter((s) => s.status === 'approved').length

  const projectTargetLang = useMemo(() => {
    const list = Array.isArray(project?.target_langs) ? project.target_langs : []
    return typeof list[0] === 'string' ? list[0] : 'ES'
  }, [project])
  const projectSourceLang = useMemo(() => {
    return (project?.source_lang ? String(project.source_lang) : 'EN').toUpperCase()
  }, [project])

  // Persist a segment edit to the backend.
  const handleCommitTarget = async (segId: string, newTarget: string) => {
    const prev = segments.find((s) => s.id === segId)
    if (!prev) return
    const nextStatus: SegmentStatus =
      newTarget.trim().length === 0
        ? 'untranslated'
        : prev.status === 'untranslated'
          ? 'draft'
          : prev.status
    setSegments((curr) =>
      curr.map((s) => (s.id === segId ? { ...s, target: newTarget, status: nextStatus } : s)),
    )
    try {
      await http.put(`/segments/${encodeURIComponent(segId)}`, {
        target_text: newTarget,
        status: STATUS_TO_DB[nextStatus],
      })
      setActionStatus(t('common.savedPeriod', {}, { defaultValue: 'Saved.' }))
    } catch (_error) {
      // Segment save failed — revert optimistic update and surface the error.
      setSegments((curr) => curr.map((s) => (s.id === segId ? prev : s)))
      setActionStatus(t('common.saveFailed', {}, { defaultValue: 'Save failed.' }))
    }
  }

  // Commit a workflow status change against the backend.
  const setStatus = async (newStatus: SegmentStatus) => {
    if (!active) return
    const prev = active
    const dbStatus = STATUS_TO_DB[newStatus]
    setSegments((curr) => curr.map((s) => (s.id === prev.id ? { ...s, status: newStatus } : s)))
    try {
      await http.put(`/segments/${encodeURIComponent(prev.id)}`, { status: dbStatus })
      setActionStatus(
        t(
          'translate.statusUpdated',
          { number: prev.number },
          { defaultValue: 'Segment {{number}} updated.' },
        ),
      )
    } catch (_error) {
      // Status update failed — revert optimistic update and surface the error.
      setSegments((curr) => curr.map((s) => (s.id === prev.id ? prev : s)))
      setActionStatus(
        t('translate.statusUpdateFailed', {}, { defaultValue: 'Could not update segment status.' }),
      )
    }
  }

  const handleApprove = () => {
    void setStatus('approved')
  }
  const handleRequestReview = () => {
    void setStatus('needs_review')
  }
  const handleFlag = () => {
    void setStatus('needs_revision')
  }

  const handleInsertTm = async (matchId: string) => {
    if (!active) return
    const m = tmMatches.find((x) => x.id === matchId)
    if (!m) return
    await handleCommitTarget(active.id, m.target)
    setActionStatus(
      t('translate.tmInsertedStatus', {}, { defaultValue: 'Inserted from translation memory.' }),
    )
  }

  const handleMachineTranslate = async () => {
    if (!active) return
    setMtRunning(true)
    setActionStatus(null)
    try {
      const res = await http.post('/translations/translate', {
        text: active.source,
        source_lang: projectSourceLang,
        target_lang: projectTargetLang.toUpperCase(),
      })
      const body = res as { data?: { target_text?: string }; target_text?: string }
      const proposed = body.data?.target_text ?? body.target_text ?? ''
      if (!proposed) {
        setActionStatus(
          t('translate.mtFailed', {}, { defaultValue: 'Machine translation failed.' }),
        )
        return
      }
      await handleCommitTarget(active.id, proposed)
      setActionStatus(
        t('translate.mtInserted', {}, { defaultValue: 'Machine translation inserted.' }),
      )
    } catch (_error) {
      // Machine translation request failed — surface the error message to the user.
      setActionStatus(t('translate.mtFailed', {}, { defaultValue: 'Machine translation failed.' }))
    } finally {
      setMtRunning(false)
    }
  }

  const handleSuggest = async () => {
    if (!active) return
    setAiSuggesting(true)
    setAiSuggestion(null)
    setActionStatus(null)
    try {
      const res = await http.post('/translations/suggest', {
        source_text: active.source,
        current_translation: active.target,
        source_lang: projectSourceLang,
        target_lang: projectTargetLang.toUpperCase(),
      })
      const body = res as { data?: { suggestion?: string }; suggestion?: string }
      const suggestion = body.data?.suggestion ?? body.suggestion ?? ''
      if (!suggestion) {
        setActionStatus(t('translate.suggestFailed', {}, { defaultValue: 'No AI suggestion.' }))
        return
      }
      setAiSuggestion(suggestion)
    } catch (_error) {
      // AI suggest request failed — surface the error message to the user.
      setActionStatus(t('translate.suggestFailed', {}, { defaultValue: 'AI suggestion failed.' }))
    } finally {
      setAiSuggesting(false)
    }
  }

  const handleApplySuggestion = async () => {
    if (!active || !aiSuggestion) return
    await handleCommitTarget(active.id, aiSuggestion)
    setAiSuggestion(null)
  }

  // Real export — hits GET /api/projects/:id/export and downloads the CSV.
  // Auth rides the httpOnly session cookie (same-origin fetch); never read
  // tokens out of localStorage for an Authorization header — that is the
  // XSS-exfiltration anti-pattern the platform's auth model exists to avoid.
  const handleExport = async () => {
    if (!project?.id) return
    setExportStatus(t('translate.exportStarting', {}, { defaultValue: 'Starting export…' }))
    try {
      const url = `/api/projects/${encodeURIComponent(String(project.id))}/export`
      const resp = await fetch(url)
      if (!resp.ok) {
        setExportStatus(t('translate.exportFailed', {}, { defaultValue: 'Export failed.' }))
        return
      }
      const blob = await resp.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `${String(project.name ?? 'project')}-segments.csv`
      a.rel = 'noopener'
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      setExportStatus(
        t('translate.exportReady', {}, { defaultValue: 'Export ready — file downloaded.' }),
      )
    } catch (_error) {
      // Export request failed — surface the error message to the user.
      setExportStatus(t('translate.exportFailed', {}, { defaultValue: 'Export failed.' }))
    }
  }

  const projectStatus = (() => {
    const raw = project?.status ?? 'in_progress'
    if (raw === 'in_progress' || raw === 'in_review' || raw === 'approved' || raw === 'pending')
      return raw
    if (raw === 'review') return 'in_review' as const
    if (raw === 'completed') return 'approved' as const
    return 'in_progress' as const
  })()

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'bg-surface/80 backdrop-blur-md border-b border-surface-container-high/40 sticky top-0 z-20',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <SafeLink
            to="/projects"
            aria-label={t('translate.back', {}, { defaultValue: 'Back to projects' })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(9),
              cm.h(9),
              'rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[20px]')} aria-hidden="true">
              arrow_back
            </span>
          </SafeLink>
          <div className={cm.flex({ direction: 'col' })}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-bold uppercase tracking-widest text-primary',
              )}
            >
              {t('translate.eyebrow', {}, { defaultValue: 'Translation editor' })}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('xl'),
                'font-extrabold tracking-tight text-on-background',
              )}
            >
              {project?.name ?? t('translate.untitled', {}, { defaultValue: 'Untitled project' })}
            </h1>
          </div>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
          {project && (
            <LanguagePairBadge
              source={project.source_lang ?? 'en'}
              target={projectTargetLang.toLowerCase()}
            />
          )}
          {project && <ProjectStatusPill status={projectStatus} />}
          <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
            {t(
              'translate.progress',
              { done: approvedSegments, total: totalSegments },
              { defaultValue: '{{done}} / {{total}} segments approved' },
            )}
          </span>
          <button
            data-mol-id="translate-export"
            onClick={() => {
              void handleExport()
            }}
            type="button"
            disabled={!project?.id}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full inline-flex items-center gap-2 text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-opacity shadow-sm shadow-primary/30 disabled:opacity-60',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              file_download
            </span>
            {t('common.export', {}, { defaultValue: 'Export' })}
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('mx', 8),
            cm.sp('mt', 4),
            cm.sp('p', 4),
            'rounded-xl bg-error-container text-on-error-container text-sm',
          )}
        >
          {error}
        </div>
      )}

      {exportStatus && (
        <div
          role="status"
          data-mol-id="translate-export-status"
          className={cm.cn(
            cm.sp('mx', 8),
            cm.sp('mt', 4),
            cm.sp('p', 3),
            'rounded-xl bg-primary-fixed/40 text-on-primary-fixed text-sm',
          )}
        >
          {exportStatus}
        </div>
      )}

      {loading && (
        <p
          className={cm.cn(
            cm.sp('mx', 8),
            cm.sp('mt', 4),
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          {t('translate.loading', {}, { defaultValue: 'Loading project…' })}
        </p>
      )}

      {!loading && segments.length === 0 && !error && (
        <div
          className={cm.cn(
            cm.sp('mx', 8),
            cm.sp('mt', 4),
            cm.flex({ direction: 'col', gap: 'sm' }),
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'translate.empty',
              {},
              { defaultValue: 'No segments yet — add a source segment to start translating.' },
            )}
          </p>
          {project?.id && (
            <AddSegmentForm
              projectId={String(project.id)}
              targetLang={projectTargetLang.toUpperCase()}
              sourceLang={(project?.source_lang ?? 'EN').toString().toUpperCase()}
              onAdded={(seg) => {
                const adapted = adaptSegment(seg, 0)
                setSegments([adapted])
                setActiveId(adapted.id)
              }}
            />
          )}
        </div>
      )}

      <div
        className={cm.cn(
          cm.grid({ gap: 'lg' }),
          cm.sp('p', 8),
          'grid-cols-1 xl:grid-cols-12 items-start',
        )}
      >
        <section
          className={cm.cn(
            'xl:col-span-8 bg-surface-container-lowest rounded-[1.25rem] border border-surface-container/50 shadow-sm overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 6),
              cm.sp('py', 4),
              'border-b border-surface-container-high/50',
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('translate.segmentsHeading', {}, { defaultValue: 'Segments' })}
            </h2>
            <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
              {segments.length} {t('translate.shown', {}, { defaultValue: 'shown' })}
            </span>
          </div>
          <div>
            {segments.map((s) => (
              <SegmentRow
                key={s.id}
                segment={s}
                active={s.id === activeId}
                onSelect={setActiveId}
                onCommit={handleCommitTarget}
              />
            ))}
            {project?.id && segments.length > 0 && (
              <AddSegmentForm
                projectId={String(project.id)}
                targetLang={projectTargetLang.toUpperCase()}
                sourceLang={(project?.source_lang ?? 'EN').toString().toUpperCase()}
                onAdded={(seg) => {
                  setSegments((curr) => {
                    const adapted = adaptSegment(seg, curr.length)
                    return [...curr, adapted]
                  })
                  setActiveId(String(seg.id ?? ''))
                }}
              />
            )}
          </div>
        </section>

        <aside className={cm.cn('xl:col-span-4 flex flex-col gap-6')}>
          <div
            className={cm.cn(
              cm.sp('p', 5),
              'bg-surface-container-lowest rounded-[1.25rem] border border-surface-container/50 shadow-sm',
            )}
          >
            <h3
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('mb', 4),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[18px] text-primary')}
                aria-hidden="true"
              >
                storage
              </span>
              {t('translate.tmHeading', {}, { defaultValue: 'TM matches' })}
            </h3>
            <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
              {tmMatches.length === 0 ? (
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t('translate.tmEmpty', {}, { defaultValue: 'No memory matches yet.' })}
                </p>
              ) : (
                tmMatches.map((m) => {
                  const tone =
                    m.value >= 95
                      ? 'bg-success-light text-success'
                      : m.value >= 75
                        ? 'bg-warning-light text-warning'
                        : 'bg-tertiary-container/15 text-tertiary'
                  return (
                    <div
                      key={m.id}
                      className={cm.cn(cm.sp('p', 3), 'bg-surface-container-low rounded-lg')}
                    >
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'between' }),
                          cm.sp('mb', 2),
                        )}
                      >
                        <span
                          className={cm.cn(
                            cm.fontWeight('bold'),
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono',
                            tone,
                          )}
                        >
                          {m.value}%
                        </span>
                        <button
                          onClick={() => {
                            void handleInsertTm(m.id)
                          }}
                          type="button"
                          className={cm.cn(
                            cm.textSize('xs'),
                            'font-bold text-primary hover:underline',
                          )}
                        >
                          {t('translate.tmInsert', {}, { defaultValue: 'Insert' })}
                        </button>
                      </div>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'font-serif-content text-on-surface-variant',
                        )}
                      >
                        {m.source}
                      </p>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'font-serif-content text-on-surface mt-1',
                        )}
                      >
                        {m.target}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div
            className={cm.cn(
              cm.sp('p', 5),
              'bg-surface-container-lowest rounded-[1.25rem] border border-surface-container/50 shadow-sm',
            )}
          >
            <h3
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('mb', 4),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[18px] text-primary')}
                aria-hidden="true"
              >
                menu_book
              </span>
              {t('translate.glossaryHeading', {}, { defaultValue: 'Glossary terms' })}
            </h3>
            <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
              {glossaryEntries.length === 0 ? (
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t('translate.glossaryEmpty', {}, { defaultValue: 'No glossary terms yet.' })}
                </p>
              ) : (
                glossaryEntries.map((g) => (
                  <div
                    key={g.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('p', 3),
                      'bg-surface-container-low rounded-lg',
                    )}
                  >
                    <div className={cm.flex({ direction: 'col' })}>
                      <span
                        className={cm.cn(cm.textSize('xs'), 'font-mono font-bold text-primary')}
                      >
                        {g.source_term}
                      </span>
                      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                        {g.target_term}
                      </span>
                    </div>
                    {g.approved && (
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.textSize('xs'),
                          'text-success font-bold uppercase tracking-widest',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-base')}
                          aria-hidden="true"
                        >
                          check_circle
                        </span>
                        {t('translate.glossaryApproved', {}, { defaultValue: 'Approved' })}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {active && (
            <div
              className={cm.cn(
                cm.sp('p', 5),
                'bg-surface-container-lowest rounded-[1.25rem] border border-surface-container/50 shadow-sm',
              )}
            >
              <h3
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('mb', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[18px] text-primary')}
                  aria-hidden="true"
                >
                  bolt
                </span>
                {t(
                  'translate.activeHeading',
                  { number: active.number },
                  { defaultValue: 'Segment {{number}} actions' },
                )}
              </h3>
              {actionStatus && (
                <p
                  role="status"
                  data-mol-id="translate-action-status"
                  className={cm.cn(cm.textSize('xs'), cm.sp('mb', 3), 'text-primary font-medium')}
                >
                  {actionStatus}
                </p>
              )}
              <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
                <button
                  data-mol-id="translate-machine"
                  onClick={() => {
                    void handleMachineTranslate()
                  }}
                  type="button"
                  disabled={mtRunning}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'w-full rounded-lg border border-outline-variant/40 text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-60',
                  )}
                >
                  {mtRunning
                    ? t('translate.mtRunning', {}, { defaultValue: 'Translating…' })
                    : t(
                        'translate.machineTranslate',
                        {},
                        { defaultValue: 'Machine translate (DeepL)' },
                      )}
                </button>
                <button
                  data-mol-id="translate-suggest"
                  onClick={() => {
                    void handleSuggest()
                  }}
                  type="button"
                  disabled={aiSuggesting}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'w-full rounded-lg border border-outline-variant/40 text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-60',
                  )}
                >
                  {aiSuggesting
                    ? t('translate.suggesting', {}, { defaultValue: 'Asking AI…' })
                    : t('translate.suggest', {}, { defaultValue: 'AI suggest review' })}
                </button>
                {aiSuggestion && (
                  <div
                    data-mol-id="translate-ai-suggestion"
                    className={cm.cn(
                      cm.sp('p', 3),
                      'rounded-lg bg-success-light text-on-surface text-sm font-serif-content border border-success-light',
                    )}
                  >
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mb', 1),
                        'uppercase tracking-widest font-bold text-success',
                      )}
                    >
                      {t('translate.aiProposal', {}, { defaultValue: 'AI proposes' })}
                    </p>
                    <p>{aiSuggestion}</p>
                    <button
                      onClick={() => {
                        void handleApplySuggestion()
                      }}
                      type="button"
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 2),
                        'font-bold text-success hover:underline',
                      )}
                    >
                      {t('translate.applySuggestion', {}, { defaultValue: 'Apply' })}
                    </button>
                  </div>
                )}
                <button
                  data-mol-id="translate-approve"
                  onClick={handleApprove}
                  type="button"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'w-full rounded-lg text-on-primary bg-primary hover:opacity-90 transition-opacity',
                  )}
                >
                  {t('translate.approve', {}, { defaultValue: 'Approve translation' })}
                </button>
                <button
                  data-mol-id="translate-request-review"
                  onClick={handleRequestReview}
                  type="button"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'w-full rounded-lg border border-outline-variant/40 text-on-surface hover:bg-surface-container-low transition-colors',
                  )}
                >
                  {t('translate.requestReview', {}, { defaultValue: 'Request review' })}
                </button>
                <button
                  data-mol-id="translate-flag"
                  onClick={handleFlag}
                  type="button"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'w-full rounded-lg text-tertiary hover:bg-tertiary-container/15 transition-colors',
                  )}
                >
                  {t('translate.flag', {}, { defaultValue: 'Flag for revision' })}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

interface AddSegmentFormProps {
  projectId: string
  sourceLang: string
  targetLang: string
  onAdded: (seg: {
    id?: string
    source_text?: string
    target_text?: string
    status?: string
    position?: number
    source_lang?: string
    target_lang?: string
  }) => void
}

function AddSegmentForm({ projectId, sourceLang, targetLang, onAdded }: AddSegmentFormProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await http.post('/segments', {
        project_id: projectId,
        source_text: text,
        source_lang: sourceLang,
        target_lang: targetLang,
        position: 0,
      })
      const body = res as unknown as { data?: Record<string, unknown> } & Record<string, unknown>
      const seg = (body.data ?? body) as Record<string, unknown>
      onAdded({
        id: seg.id ? String(seg.id) : undefined,
        source_text: seg.source_text ? String(seg.source_text) : undefined,
        target_text: seg.target_text ? String(seg.target_text) : '',
        status: seg.status ? String(seg.status) : 'untranslated',
        position: typeof seg.position === 'number' ? seg.position : 0,
        source_lang: seg.source_lang ? String(seg.source_lang) : sourceLang,
        target_lang: seg.target_lang ? String(seg.target_lang) : targetLang,
      })
      setText('')
    } catch (_error) {
      // Add segment request failed — surface the error message to the user.
      setError(t('translate.addSegmentFailed', {}, { defaultValue: 'Failed to add segment.' }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleAdd}
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'sm' }),
        cm.sp('p', 4),
        'border-t border-surface-container/50',
      )}
    >
      <label
        htmlFor="add-segment-source"
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {t('translate.addSegment', {}, { defaultValue: 'Add a source segment' })}
      </label>
      <textarea
        id="add-segment-source"
        data-mol-id="add-segment-source"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t(
          'translate.addSegmentPlaceholder',
          {},
          { defaultValue: 'Paste source text…' },
        )}
        rows={3}
        className={cm.cn(
          cm.w('full'),
          cm.sp('px', 4),
          cm.sp('py', 2),
          'rounded-lg bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none font-serif-content',
        )}
      />
      {error && (
        <p role="alert" className={cm.cn(cm.textSize('xs'), 'text-error')}>
          {error}
        </p>
      )}
      <button
        type="submit"
        data-mol-id="add-segment-submit"
        disabled={!text.trim() || busy}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.fontWeight('semibold'),
          cm.textSize('sm'),
          'self-start rounded-full text-on-primary bg-primary hover:opacity-90 disabled:opacity-60',
        )}
      >
        {busy
          ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
          : t('translate.addSegmentSubmit', {}, { defaultValue: 'Add segment' })}
      </button>
    </form>
  )
}

export default Translate
export { Translate as TranslatePage }
