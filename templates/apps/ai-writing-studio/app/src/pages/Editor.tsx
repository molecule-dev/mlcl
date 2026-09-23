import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AISuggestionCard } from '../components/AISuggestionCard.js'
import { type DocumentStatus, DocumentStatusPill } from '../components/DocumentStatusPill.js'
import { SeoScoreRing } from '../components/SeoScoreRing.js'

/** True below the `md` breakpoint — phones get the AI panel collapsed. */
function isPhoneWidth(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767.98px)').matches
}

interface DocumentRow {
  id: string
  title: string
  content: string
  status: string
  word_count: number
  reading_minutes: number
  seo_score?: number | null
}

interface AiSuggestion {
  id: string
  labelKey: string
  labelDefault: string
  body: string
}

const TOOLBAR_GROUPS: ReadonlyArray<{
  group: ReadonlyArray<{ icon: string; wrap: (s: string) => string; defaultLabel: string }>
}> = [
  {
    group: [
      { icon: 'format_bold', wrap: (s) => `**${s}**`, defaultLabel: 'Bold' },
      { icon: 'format_italic', wrap: (s) => `*${s}*`, defaultLabel: 'Italic' },
      { icon: 'format_underlined', wrap: (s) => `__${s}__`, defaultLabel: 'Underline' },
    ],
  },
  {
    group: [
      {
        icon: 'format_list_bulleted',
        wrap: (s) => `\n- ${s || 'List item'}`,
        defaultLabel: 'Bulleted list',
      },
      {
        icon: 'format_list_numbered',
        wrap: (s) => `\n1. ${s || 'List item'}`,
        defaultLabel: 'Numbered list',
      },
    ],
  },
  {
    group: [
      {
        icon: 'format_quote',
        wrap: (s) => `\n> ${s || 'Quoted text'}`,
        defaultLabel: 'Block quote',
      },
      { icon: 'code', wrap: (s) => `\`${s || 'code'}\``, defaultLabel: 'Inline code' },
    ],
  },
]

const STATUS_PILL_MAP: Record<string, DocumentStatus> = {
  draft: 'draft',
  published: 'published',
  archived: 'archived',
  'ai-assisted': 'ai-assisted',
}

function statusFor(status: string): DocumentStatus {
  return STATUS_PILL_MAP[status] ?? 'draft'
}

export function Editor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const templateId = searchParams.get('template')
  // Desktop: the AI rail is the editor's signature — open by default.
  // Mobile: the panel stacks BELOW the (taller) writing surface, so opening
  // it by default would bury it below the fold anyway; start collapsed and
  // let the sparkle toggle reveal it.
  const [aiPanelOpen, setAiPanelOpen] = useState(() => !isPhoneWidth())
  const [doc, setDoc] = useState<DocumentRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])

  const isNew = id === 'new'

  // React StrictMode runs effects twice in dev. Without this guard, the
  // /documents/new flow POSTs to /api/documents twice and orphans an extra
  // empty draft for every "Start a new document" click.
  const createRequestedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setLoading(false)
      return
    }
    if (isNew) {
      if (createRequestedRef.current) return
      createRequestedRef.current = true
      // For a brand-new document, eagerly create the row server-side so that
      // subsequent saves, publish, version-history, and SEO-analysis flows
      // all have a real id to operate on. If a `?template=<id>` is present,
      // instantiate from that template instead of an empty draft.
      setLoading(true)
      const create = async () => {
        try {
          let createdId: string | null = null
          let row: DocumentRow | null = null
          if (templateId) {
            const res = await http.post<DocumentRow>(
              `/templates/${encodeURIComponent(templateId)}/instantiate`,
              {},
            )
            row = res.data ?? null
            createdId = row?.id ?? null
          } else {
            const res = await http.post<DocumentRow>('/documents', {
              title: t('editor.newDocumentTitle', {}, { defaultValue: 'Untitled document' }),
              content: '',
              status: 'draft',
              tags: [],
              outline: [],
            })
            row = res.data ?? null
            createdId = row?.id ?? null
          }
          if (!createdId) {
            if (!cancelled) {
              setError(t('editor.createFailed', {}, { defaultValue: 'Could not create document.' }))
              setLoading(false)
            }
            return
          }
          // Always navigate to the freshly-created doc — even if the first
          // StrictMode effect run was "cancelled" (dev-only remount). The
          // server row exists; the URL must reflect it so the second mount
          // loads the real document instead of looping on /documents/new.
          track({
            name: 'document.created',
            properties: { documentId: createdId, fromTemplate: templateId ?? undefined },
          })
          navigate(`/documents/${createdId}`, { replace: true })
        } catch (error) {
          logError('editor.create', error)
          if (!cancelled) {
            setError(t('editor.createFailed', {}, { defaultValue: 'Could not create document.' }))
            setLoading(false)
          }
        }
      }
      void create()
      return () => {
        cancelled = true
      }
    }
    setLoading(true)
    http
      .get<DocumentRow>(`/documents/${id}`)
      .then((res) => {
        if (cancelled) return
        const row = res.data
        if (!row) {
          setError(t('editor.notFound', {}, { defaultValue: 'This document is unavailable.' }))
        } else {
          setDoc(row)
          setContent(String(row.content ?? ''))
          setTitle(String(row.title ?? ''))
          setError(null)
        }
      })
      .catch((error: unknown) => {
        logError('editor.load', error)
        if (cancelled) return
        setError(t('editor.loadError', {}, { defaultValue: 'Could not load document.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, isNew, navigate, t, templateId])

  const wordCount = content.split(/\s+/).filter(Boolean).length
  const charCount = content.length
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200))

  const persist = useCallback(
    async (next: string) => {
      if (!doc || isNew) return
      setSavingState('saving')
      try {
        await http.put(`/documents/${doc.id}`, { content: next })
        setSavedAt(new Date())
        setSavingState('saved')
      } catch (error) {
        logError('editor.persist', error)
        setSavingState('error')
      }
    },
    [doc, http, isNew],
  )

  const persistTitle = useCallback(
    async (next: string) => {
      if (!doc || isNew) return
      const trimmed = next.trim()
      if (!trimmed || trimmed === doc.title) return
      setSavingState('saving')
      try {
        const res = await http.put<DocumentRow>(`/documents/${doc.id}`, { title: trimmed })
        const updated = res.data ?? null
        if (updated) setDoc(updated)
        setSavedAt(new Date())
        setSavingState('saved')
      } catch (error) {
        logError('editor.persistTitle', error)
        setSavingState('error')
      }
    },
    [doc, http, isNew],
  )

  function handleToolbar(wrap: (s: string) => string) {
    setContent((current) => {
      const inserted = wrap(current.length > 0 ? '' : '')
      const next = current.length === 0 ? inserted.trim() : `${current}${inserted}`
      void persist(next)
      return next
    })
  }

  async function handlePublish() {
    if (!doc || isNew) {
      setStatusMessage(
        t('editor.saveBeforePublish', {}, { defaultValue: 'Save the document before publishing.' }),
      )
      return
    }
    setSavingState('saving')
    try {
      const res = await http.put<DocumentRow>(`/documents/${doc.id}`, {
        status: 'published',
        content,
      })
      const updated = res.data ?? null
      if (updated) setDoc(updated)
      setStatusMessage(t('editor.publishedToast', {}, { defaultValue: 'Document published.' }))
      setSavingState('saved')
      setSavedAt(new Date())
      track({
        name: 'document.published',
        properties: { documentId: doc.id, wordCount },
      })
    } catch (error) {
      logError('editor.publish', error)
      setStatusMessage(t('editor.publishFailed', {}, { defaultValue: 'Publish failed.' }))
      setSavingState('error')
    }
  }

  async function loadSuggestions() {
    if (!doc) return
    if (!content.trim()) {
      setSuggestions([])
      return
    }
    setSuggestions([
      {
        id: 'pending',
        labelKey: 'editor.aiSuggestion.loading',
        labelDefault: `Asking ${APP_NAME}…`,
        body: t(
          'editor.aiSuggestion.loadingBody',
          {},
          { defaultValue: 'Generating a clarity refinement…' },
        ),
      },
    ])
    try {
      const res = await http.post<{ content: string }>('/generate/rewrite', {
        content,
        instruction: 'Tighten and clarify without changing the voice.',
        document_id: isNew ? undefined : doc.id,
      })
      const reply = res.data?.content?.trim() ?? ''
      setSuggestions(
        reply
          ? [
              {
                id: 'rewrite-1',
                labelKey: 'editor.aiSuggestion.rewrite.label',
                labelDefault: 'Tighten pacing',
                body: reply,
              },
            ]
          : [],
      )
    } catch (error) {
      logError('editor.loadSuggestions', error)
      setSuggestions([])
      setStatusMessage(
        t(
          'editor.aiSuggestion.failed',
          {},
          { defaultValue: 'Could not load suggestions right now.' },
        ),
      )
    }
  }

  function handleAcceptSuggestion(text: string) {
    setContent((current) => {
      const next = `${current}\n\n${text}`.trim()
      void persist(next)
      return next
    })
    setSuggestions((prev) => prev.slice(1))
    track({ name: 'ai.suggestion_accepted', properties: { documentId: doc?.id } })
  }

  /** Download the current draft as Markdown or plain text (client-side). */
  function handleExport(format: 'md' | 'txt') {
    if (!doc) return
    const heading =
      title.trim() || t('editor.titlePlaceholder', {}, { defaultValue: 'Untitled document' })
    const body = format === 'md' ? `# ${heading}\n\n${content}\n` : `${heading}\n\n${content}\n`
    const blob = new Blob([body], {
      type: format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    const slug =
      heading
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'document'
    anchor.download = `${slug}.${format}`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setStatusMessage(
      t(
        'editor.exported',
        { format: format === 'md' ? 'Markdown' : 'TXT' },
        {
          defaultValue: 'Exported as {{format}}.',
        },
      ),
    )
    track({ name: 'export.completed', properties: { documentId: doc.id, format } })
  }

  function handleDiscardSuggestion(idToDrop: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== idToDrop))
  }

  return (
    <div className={cm.cn(cm.minH('screen'), cm.flex({ direction: 'col' }), 'bg-background')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 3),
          'border-b border-outline-variant bg-surface',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0 flex-1')}>
          <Link
            to="/documents"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.textMuted,
              'hover:text-on-surface transition-colors shrink-0',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              arrow_back
            </span>
            {t('editor.backToDocuments', {}, { defaultValue: 'All documents' })}
          </Link>
          <span
            className={cm.cn('h-6 w-px bg-outline-variant hidden sm:block')}
            aria-hidden="true"
          />
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              'font-serif text-lg text-on-surface min-w-0 truncate',
            )}
          >
            {doc
              ? title.trim() ||
                t('editor.titlePlaceholder', {}, { defaultValue: 'Untitled document' })
              : t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </h1>
          {doc ? (
            <span className="hidden sm:inline-flex">
              <DocumentStatusPill status={statusFor(doc.status)} />
            </span>
          ) : null}
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
          <Link
            to={`/documents/${doc?.id ?? id ?? 'new'}/seo`}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'h-10 rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              travel_explore
            </span>
            {t('editor.viewSeo', {}, { defaultValue: 'SEO' })}
          </Link>
          <button
            type="button"
            onClick={handlePublish}
            disabled={savingState === 'saving' || isNew}
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'h-10 rounded-full bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-60',
            )}
          >
            {savingState === 'saving'
              ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
              : t('common.publish', {}, { defaultValue: 'Publish' })}
          </button>
          <button
            type="button"
            onClick={() => setAiPanelOpen((v) => !v)}
            aria-pressed={aiPanelOpen}
            aria-label={t('editor.toggleAiPanel', {}, { defaultValue: 'Toggle AI panel' })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-10 w-10 border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary/30 transition-colors',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              auto_awesome
            </span>
          </button>
        </div>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
          cm.sp('px', 4),
          cm.sp('py', 2),
          'border-b border-outline-variant bg-surface',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap', gap: 'xs' }))}>
          {TOOLBAR_GROUPS.map((tg, gi) => (
            <div key={gi} className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              {tg.group.map((tool) => (
                <button
                  key={tool.icon}
                  type="button"
                  onClick={() => handleToolbar(tool.wrap)}
                  aria-label={t(
                    `editor.tool.${tool.icon}`,
                    {},
                    { defaultValue: tool.defaultLabel },
                  )}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-10 w-10 rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                    {tool.icon}
                  </span>
                </button>
              ))}
              {gi < TOOLBAR_GROUPS.length - 1 ? (
                <span className={cm.cn('h-4 w-px bg-outline-variant mx-2')} aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          {(['md', 'txt'] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => handleExport(fmt)}
              disabled={!doc}
              aria-label={t(
                'editor.exportAriaLabel',
                { format: fmt.toUpperCase() },
                { defaultValue: `Export as ${fmt.toUpperCase()}` },
              )}
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 3),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.roundedFull,
                'h-10 uppercase tracking-widest border border-outline-variant text-on-surface-variant hover:border-primary/30 hover:text-primary transition-colors disabled:opacity-50',
              )}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
          <span className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('px', 1))}>
            {t('editor.exportLabel', {}, { defaultValue: 'Export' })}
          </span>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'bg-error-container text-on-error-container',
          )}
        >
          {error}
        </div>
      ) : null}
      {statusMessage ? (
        <div
          role="status"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'bg-info-container text-on-info-container',
          )}
        >
          {statusMessage}
        </div>
      ) : null}

      <div
        className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'overflow-hidden md:flex-row')}
      >
        <main className={cm.cn(cm.flex1, 'overflow-y-auto min-w-0')}>
          <article className={cm.cn(cm.mxAuto, cm.sp('px', 8), cm.sp('py', 12), 'max-w-[720px]')}>
            {doc ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => void persistTitle(title)}
                placeholder={t(
                  'editor.titlePlaceholder',
                  {},
                  { defaultValue: 'Untitled document' },
                )}
                aria-label={t('editor.titleAriaLabel', {}, { defaultValue: 'Document title' })}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('mb', 6),
                  'bg-transparent border-none outline-none font-serif text-4xl font-medium text-on-surface tracking-tight placeholder:text-on-surface-variant/50',
                )}
              />
            ) : (
              <h2
                className={cm.cn(
                  cm.sp('mb', 6),
                  'font-serif text-4xl font-medium text-on-surface tracking-tight',
                )}
              >
                {t('editor.loading', {}, { defaultValue: 'Loading…' })}
              </h2>
            )}
            {loading ? (
              <p className={cm.cn(cm.textMuted, 'font-serif italic')}>
                {t('editor.loadingBody', {}, { defaultValue: 'Fetching your draft…' })}
              </p>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={() => persist(content)}
                placeholder={t(
                  'editor.placeholder',
                  { appName: APP_NAME },
                  {
                    defaultValue: 'Begin writing here. {{appName}} saves automatically as you go.',
                  },
                )}
                aria-label={t('editor.bodyAriaLabel', {}, { defaultValue: 'Document body' })}
                className={cm.cn(
                  'w-full min-h-[40vh] bg-transparent border-none outline-none font-serif text-[18px] leading-[1.8] text-on-surface',
                )}
                rows={12}
              />
            )}
          </article>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'border-t border-outline-variant bg-surface text-xs text-on-surface-variant font-mono',
            )}
          >
            <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'md' }))}>
              <span>
                {t('common.countWords', { count: wordCount }, { defaultValue: '{{count}} words' })}
              </span>
              <span>
                {t(
                  'editor.status.chars',
                  { count: charCount },
                  { defaultValue: '{{count}} characters' },
                )}
              </span>
              <span>
                {t(
                  'editor.status.readTime',
                  { minutes: readingMinutes },
                  { defaultValue: '{{minutes}} min read' },
                )}
              </span>
            </div>
            <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  'w-2 h-2 rounded-full',
                  savingState === 'error' ? 'bg-error' : 'bg-success',
                )}
                aria-hidden="true"
              />
              {savingState === 'saving'
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : savingState === 'error'
                  ? t('editor.status.saveError', {}, { defaultValue: 'Save failed' })
                  : savedAt
                    ? t(
                        'editor.status.savedAt',
                        { time: savedAt.toLocaleTimeString() },
                        { defaultValue: 'Saved {{time}}' },
                      )
                    : t('editor.status.unsaved', {}, { defaultValue: 'Not saved yet' })}
            </span>
          </div>
        </main>

        {aiPanelOpen ? (
          <aside
            className={cm.cn(
              cm.sp('p', 5),
              cm.flex({ direction: 'col', gap: 'md' }),
              // Mobile: stacks BELOW the writing surface (order-first would
              // push the prose off-screen); desktop: fixed 380px side rail.
              'w-full border-t border-outline-variant md:w-[380px] md:border-t-0 md:border-l max-h-[45vh] md:max-h-none overflow-y-auto',
            )}
            style={{
              // Theme token defined in theme.css (light + dark variants).
              background: 'var(--ai-panel-bg, var(--color-surface-container-low))',
            }}
          >
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <h3
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.fontWeight('bold'),
                  'text-primary text-sm',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  auto_awesome
                </span>
                {t(
                  'editor.aiPanelTitle',
                  { appName: APP_NAME },
                  { defaultValue: '{{appName}} Intelligence' },
                )}
              </h3>
              <button
                type="button"
                onClick={() => setAiPanelOpen(false)}
                aria-label={t('editor.closeAiPanel', {}, { defaultValue: 'Close AI panel' })}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-9 w-9 rounded-md text-on-surface-variant hover:text-primary',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  close
                </span>
              </button>
            </div>

            <SeoScoreRing
              score={typeof doc?.seo_score === 'number' ? doc.seo_score : 0}
              captionKey="editor.seoCaption"
              captionDefault="Live SEO score"
              size={88}
            />

            <button
              type="button"
              onClick={loadSuggestions}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.sp('px', 3),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.roundedFull,
                'min-h-10 uppercase tracking-widest border border-primary/30 text-primary hover:bg-primary/10 transition-colors',
              )}
            >
              {t('editor.requestSuggestion', {}, { defaultValue: 'Request a refinement' })}
            </button>

            {suggestions.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'font-serif italic')}>
                {t(
                  'editor.aiSuggestion.empty',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'No active refinements. Ask {{appName}} for a suggestion when you want a second pair of eyes.',
                  },
                )}
              </p>
            ) : (
              suggestions.map((s) => (
                <AISuggestionCard
                  key={s.id}
                  labelKey={s.labelKey}
                  labelDefault={s.labelDefault}
                  suggestion={s.body}
                  onAccept={() => handleAcceptSuggestion(s.body)}
                  onDiscard={() => handleDiscardSuggestion(s.id)}
                />
              ))
            )}
          </aside>
        ) : null}
      </div>
    </div>
  )
}

export default Editor
export { Editor as EditorPage }
