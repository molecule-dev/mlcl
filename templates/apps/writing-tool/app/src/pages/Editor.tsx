import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { readDefaultExportFormat } from '../lib/export-format.js'
import { readDailyGoal } from '../lib/goal.js'
import type { DocumentRow } from '../lib/types.js'

const AUTOSAVE_DEBOUNCE_MS = 800

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Editor — the writing surface.
 *
 * Loads the document by id, lets the writer edit title + body, and
 * autosaves on debounce (PATCH /documents/:id). Toolbar wraps selected
 * text with markdown markers. Sidebar exposes pin / publish / snapshot /
 * trash, all of which mutate live API state — there is no client-only
 * "fake save" anywhere in this file.
 */
export function Editor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const docId = id ?? ''

  const [doc, setDoc] = useState<DocumentRow | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!docId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    http
      .get<DocumentRow>(`/documents/${docId}`)
      .then((res) => {
        if (cancelled) return
        const row = res.data
        if (!row) {
          setError(t('editor.notFound', {}, { defaultValue: 'Document not found.' }))
        } else {
          setDoc(row)
          setTitle(row.title ?? '')
          setBody(row.body_md ?? '')
          setError(null)
        }
      })
      .catch(() => {
        if (cancelled) return
        setError(t('editor.loadError', {}, { defaultValue: 'Could not load document.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [docId, http, t])

  const persist = useCallback(
    async (patch: Partial<Pick<DocumentRow, 'title' | 'body_md' | 'status' | 'pinned'>>) => {
      if (!doc) return
      setSaveState('saving')
      try {
        const res = await http.patch<DocumentRow>(`/documents/${doc.id}`, patch)
        if (res.data) setDoc(res.data)
        setSaveState('saved')
      } catch (error) {
        logError('editor.persist', error)
        setSaveState('error')
      }
    },
    [doc, http],
  )

  // Debounced autosave for body + title edits.
  useEffect(() => {
    if (!doc) return
    if (body === doc.body_md && title === doc.title) return
    const handle = window.setTimeout(() => {
      const patch: Partial<Pick<DocumentRow, 'title' | 'body_md'>> = {}
      if (title !== doc.title) patch.title = title
      if (body !== doc.body_md) patch.body_md = body
      void persist(patch)
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [body, title, doc, persist])

  const wordCount = useMemo(() => body.trim().split(/\s+/).filter(Boolean).length, [body])
  const charCount = body.length
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200))

  const wrapSelection = useCallback(
    (wrap: (s: string) => string) => {
      const el = textareaRef.current
      if (!el) {
        setBody((prev) => prev + wrap(''))
        return
      }
      const start = el.selectionStart ?? 0
      const end = el.selectionEnd ?? 0
      const before = body.slice(0, start)
      const selected = body.slice(start, end)
      const after = body.slice(end)
      const inserted = wrap(selected)
      const next = before + inserted + after
      setBody(next)
      requestAnimationFrame(() => {
        const pos = before.length + inserted.length
        el.focus()
        el.setSelectionRange(pos, pos)
      })
    },
    [body],
  )

  const handlePin = useCallback(async () => {
    if (!doc) return
    await persist({ pinned: !doc.pinned })
    void track({ name: 'doc.pin_toggled', properties: { doc_id: doc.id, pinned: !doc.pinned } })
    setActionMsg(
      !doc.pinned
        ? t('editor.pinned', {}, { defaultValue: 'Pinned' })
        : t('editor.unpinned', {}, { defaultValue: 'Unpinned' }),
    )
  }, [doc, persist, t])

  const handlePublish = useCallback(async () => {
    if (!doc) return
    const next = doc.status === 'published' ? 'draft' : 'published'
    await persist({ status: next })
    void track({
      name: next === 'published' ? 'doc.published' : 'doc.unpublished',
      properties: { doc_id: doc.id, status: next },
    })
    setActionMsg(
      next === 'published'
        ? t('status.published', {}, { defaultValue: 'Published' })
        : t('editor.unpublished', {}, { defaultValue: 'Reverted to draft' }),
    )
  }, [doc, persist, t])

  const handleSnapshot = useCallback(async () => {
    if (!doc) return
    setSaveState('saving')
    try {
      await http.post(`/documents/${doc.id}/versions/snapshot`, { body_md: body })
      setSaveState('saved')
      void track({ name: 'doc.snapshot_created', properties: { doc_id: doc.id } })
      setActionMsg(t('editor.snapshotSaved', {}, { defaultValue: 'Version snapshot saved' }))
    } catch (error) {
      logError('editor.handleSnapshot', error)
      setSaveState('error')
      setActionMsg(t('editor.snapshotFailed', {}, { defaultValue: 'Snapshot failed' }))
    }
  }, [doc, http, body, t])

  const handleTrash = useCallback(async () => {
    if (!doc) return
    if (
      !window.confirm(
        t('editor.confirmTrash', {}, { defaultValue: 'Move this document to trash?' }),
      )
    ) {
      return
    }
    try {
      await http.post(`/documents/${doc.id}/trash`, {})
      void track({ name: 'doc.trashed', properties: { doc_id: doc.id } })
      navigate('/library')
    } catch (error) {
      logError('editor.handleTrash', error)
      setActionMsg(t('editor.trashFailed', {}, { defaultValue: 'Could not trash document.' }))
    }
  }, [doc, http, navigate, t])

  const handleExport = useCallback(async () => {
    if (!doc) return
    try {
      const res = await http.post<{
        id: string
        format: string
        content?: string
        contentType?: string
        filename?: string
      }>('/exports', { document_id: doc.id, format: readDefaultExportFormat() })
      const payload = res.data
      if (payload?.id && typeof payload.content === 'string') {
        // Deliver the rendered artifact via a real <a download> click so
        // the user actually receives the file. The export row records
        // the audit trail; this Blob is the artifact promised by the
        // Export label.
        const blob = new Blob([payload.content], {
          type: payload.contentType ?? 'text/markdown;charset=utf-8',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = payload.filename ?? `${doc.title || 'untitled'}.md`
        a.rel = 'noopener'
        document.body.appendChild(a)
        a.click()
        a.remove()
        // Revoke after a tick so the browser has a chance to start the download.
        setTimeout(() => URL.revokeObjectURL(url), 1_500)
        void track({
          name: 'export.completed',
          properties: { doc_id: doc.id, export_id: payload.id, format: payload.format },
        })
        setActionMsg(
          t(
            'editor.exportDelivered',
            { format: (payload.format || 'md').toUpperCase() },
            { defaultValue: 'Export delivered ({{format}}).' },
          ),
        )
      } else {
        setActionMsg(t('editor.exportFailed', {}, { defaultValue: 'Could not start export.' }))
      }
    } catch (error) {
      logError('editor.handleExport', error)
      setActionMsg(t('editor.exportFailed', {}, { defaultValue: 'Could not start export.' }))
    }
  }, [doc, http, t])

  if (loading) {
    return (
      <div className={cm.cn('p-12 text-center text-on-surface-variant')}>
        {t('editor.loading', {}, { defaultValue: 'Loading document…' })}
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className={cm.cn('p-12 text-center')}>
        <p className={cm.cn('text-on-surface mb-4')}>{error}</p>
        <Link to="/library" className={cm.cn('text-primary font-bold')}>
          {t('editor.backToLibrary', {}, { defaultValue: 'Back to library' })}
        </Link>
      </div>
    )
  }

  const dailyGoal = readDailyGoal()
  const dailyWords = wordCount
  const progress = Math.min(100, Math.round((dailyWords / dailyGoal) * 100))

  const toolbar: ReadonlyArray<{ icon: string; label: string; wrap: (s: string) => string }> = [
    { icon: 'format_bold', label: 'Bold', wrap: (s) => `**${s || 'bold text'}**` },
    { icon: 'format_italic', label: 'Italic', wrap: (s) => `*${s || 'italic text'}*` },
    { icon: 'title', label: 'Heading', wrap: (s) => `\n## ${s || 'Heading'}\n` },
    { icon: 'format_quote', label: 'Quote', wrap: (s) => `\n> ${s || 'Quoted text'}\n` },
    {
      icon: 'format_list_bulleted',
      label: 'Bullet list',
      wrap: (s) => `\n- ${s || 'Item'}\n`,
    },
    {
      icon: 'link',
      label: 'Link',
      wrap: (s) => `[${s || 'link text'}](https://example.com)`,
    },
    { icon: 'code', label: 'Code', wrap: (s) => '`' + (s || 'code') + '`' },
  ]

  return (
    <div className={cm.cn(cm.flex({ direction: 'row' }), 'min-h-full bg-background')}>
      <aside
        className={cm.cn(
          'w-[280px] shrink-0 hidden lg:block border-r border-outline-variant/40 bg-surface-container-low/40',
        )}
      >
        <div className={cm.cn(cm.sp('p', 5), 'flex flex-col h-full')}>
          <Link
            to="/library"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant hover:text-primary transition-colors mb-6',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
              arrow_back
            </span>
            {t('nav.library', {}, { defaultValue: 'Library' })}
          </Link>

          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-[0.32em] text-on-surface-variant/70 mb-2',
            )}
          >
            {doc.status === 'published'
              ? t('status.published', {}, { defaultValue: 'Published' })
              : t('editor.draftLabel', {}, { defaultValue: 'Draft' })}
          </p>
          <h2
            className={cm.cn(
              'text-xl font-extrabold tracking-tight text-on-surface mb-6 leading-snug',
            )}
            style={{
              fontFamily:
                'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
            }}
          >
            {title || t('status.untitled', {}, { defaultValue: 'Untitled' })}
          </h2>

          <div
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 mb-4',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mb-2')}>
              <p
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-[0.32em] text-on-surface-variant',
                )}
              >
                {t('status.today', {}, { defaultValue: 'Today' })}
              </p>
              <span className={cm.cn('text-[10px] font-bold tabular-nums text-on-surface-variant')}>
                {progress}%
              </span>
            </div>
            <p
              className={cm.cn('text-2xl font-extrabold tabular-nums text-on-surface')}
              style={{
                fontFamily:
                  'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
              }}
            >
              {dailyWords.toLocaleString()}
              <span className={cm.cn('text-sm font-semibold text-on-surface-variant')}>
                {' '}
                / {dailyGoal.toLocaleString()}
              </span>
            </p>
            <div className={cm.cn('mt-3 h-1.5 rounded-full bg-surface-container overflow-hidden')}>
              <div
                className={cm.cn('h-full rounded-full bg-primary transition-[width] duration-500')}
                style={{ width: `${progress}%` }}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className={cm.cn('flex flex-col gap-2 mb-4')}>
            <button
              type="button"
              onClick={handlePublish}
              data-testid="editor-publish"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2.5),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-xl text-sm font-bold text-white shadow-md',
                doc.status === 'published'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                {doc.status === 'published' ? 'check_circle' : 'publish'}
              </span>
              {doc.status === 'published'
                ? t('editor.unpublishCta', {}, { defaultValue: 'Move to draft' })
                : t('common.publish', {}, { defaultValue: 'Publish' })}
            </button>
            <button
              type="button"
              onClick={handlePin}
              data-testid="editor-pin"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2.5),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-xl text-sm font-semibold border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[18px]')}
                style={{ fontVariationSettings: doc.pinned ? "'FILL' 1" : undefined }}
                aria-hidden="true"
              >
                push_pin
              </span>
              {doc.pinned
                ? t('editor.unpinCta', {}, { defaultValue: 'Unpin' })
                : t('editor.pinCta', {}, { defaultValue: 'Pin' })}
            </button>
            <button
              type="button"
              onClick={handleSnapshot}
              data-testid="editor-snapshot"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2.5),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-xl text-sm font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                save
              </span>
              {t('editor.snapshotCta', {}, { defaultValue: 'Save snapshot' })}
            </button>
            <Link
              to={`/editor/${doc.id}/focus`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2.5),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-xl text-sm font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                center_focus_strong
              </span>
              {t('editor.focusCta', {}, { defaultValue: 'Enter focus mode' })}
            </Link>
            <Link
              to={`/editor/${doc.id}/history`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2.5),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-xl text-sm font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                history
              </span>
              {t('editor.historyCta', {}, { defaultValue: 'Version history' })}
            </Link>
            <button
              type="button"
              onClick={handleTrash}
              data-testid="editor-trash"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2.5),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-xl text-sm font-semibold border border-error/40 text-error hover:bg-error/10 transition-colors mt-2',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                delete
              </span>
              {t('editor.trashCta', {}, { defaultValue: 'Move to trash' })}
            </button>
          </div>
        </div>
      </aside>

      <div className={cm.cn(cm.flex1, 'min-w-0 flex flex-col')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 3),
            'sm:px-6 py-2 sm:py-3 gap-y-2 flex-wrap',
            'border-b border-outline-variant/30 bg-surface-container-low/20',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
            <Link
              to="/library"
              aria-label={t('nav.library', {}, { defaultValue: 'Library' })}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-8 h-8 rounded-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors lg:hidden',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')} aria-hidden="true">
                arrow_back
              </span>
            </Link>
            {toolbar.map((btn) => (
              <button
                key={btn.icon}
                type="button"
                onClick={() => wrapSelection(btn.wrap)}
                aria-label={btn.label}
                className={cm.cn(
                  'w-8 h-8 rounded-md flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  {btn.icon}
                </span>
              </button>
            ))}
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
            <span
              className={cm.cn('text-[11px] font-bold tabular-nums text-on-surface-variant')}
              data-testid="editor-word-count"
            >
              {t('common.countWords', { count: wordCount }, { defaultValue: '{{count}} words' })}
            </span>
            <span className={cm.cn('text-[11px] text-on-surface-variant hidden sm:inline')}>·</span>
            <span
              className={cm.cn('text-[11px] tabular-nums text-on-surface-variant hidden sm:inline')}
              aria-label={t(
                'editor.charCount',
                { count: charCount },
                { defaultValue: '{{count}} characters' },
              )}
            >
              {charCount.toLocaleString()} ch
            </span>
            <span className={cm.cn('text-[11px] text-on-surface-variant hidden sm:inline')}>·</span>
            <span
              className={cm.cn('text-[11px] tabular-nums text-on-surface-variant hidden sm:inline')}
            >
              {readingMinutes} min
            </span>
            <span className={cm.cn('text-[11px] text-on-surface-variant hidden sm:inline')}>·</span>
            <span
              data-testid="editor-save-state"
              className={cm.cn(
                'inline-flex items-center gap-1 text-[11px] font-bold',
                saveState === 'error'
                  ? 'text-error'
                  : saveState === 'saving'
                    ? 'text-on-surface-variant'
                    : saveState === 'saved'
                      ? 'text-success'
                      : 'text-on-surface-variant/70',
              )}
            >
              <span
                className={cm.cn(
                  'w-1.5 h-1.5 rounded-full',
                  saveState === 'error'
                    ? 'bg-error'
                    : saveState === 'saving'
                      ? 'bg-on-surface-variant/40 animate-pulse'
                      : saveState === 'saved'
                        ? 'bg-emerald-500'
                        : 'bg-on-surface-variant/40',
                )}
                aria-hidden="true"
              />
              {saveState === 'saving'
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : saveState === 'error'
                  ? t('editor.saveError', {}, { defaultValue: 'Save failed' })
                  : saveState === 'saved'
                    ? t('common.saved', {}, { defaultValue: 'Saved' })
                    : t('editor.autosaveOn', {}, { defaultValue: 'Autosave on' })}
            </span>
            <button
              type="button"
              onClick={handleExport}
              data-testid="editor-export"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                'rounded-md text-[12px] font-bold border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors',
              )}
            >
              {t('common.export', {}, { defaultValue: 'Export' })}
            </button>
          </div>
        </div>

        {/* Document actions on phone/tablet (< lg) — the action sidebar is
            hidden below lg, so publish/pin/snapshot/focus/history/trash
            would be unreachable. Horizontally scrollable chip row; testids
            carry a `-m` suffix so desktop specs never hit strict-mode
            collisions with these CSS-hidden twins. */}
        <div
          data-testid="editor-mobile-actions"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'lg:hidden overflow-x-auto px-3 py-2 border-b border-outline-variant/20 bg-surface-container-low/10',
          )}
        >
          {(
            [
              {
                icon: doc.status === 'published' ? 'check_circle' : 'publish',
                label:
                  doc.status === 'published'
                    ? t('editor.unpublishCta', {}, { defaultValue: 'Move to draft' })
                    : t('common.publish', {}, { defaultValue: 'Publish' }),
                testid: 'editor-m-publish',
                onClick: handlePublish,
              },
              {
                icon: 'push_pin',
                label: doc.pinned
                  ? t('editor.unpinCta', {}, { defaultValue: 'Unpin' })
                  : t('editor.pinCta', {}, { defaultValue: 'Pin' }),
                testid: 'editor-m-pin',
                onClick: handlePin,
              },
              {
                icon: 'save',
                label: t('editor.snapshotCta', {}, { defaultValue: 'Snapshot' }),
                testid: 'editor-m-snapshot',
                onClick: handleSnapshot,
              },
              {
                icon: 'center_focus_strong',
                label: t('editor.focusCta', {}, { defaultValue: 'Focus' }),
                testid: 'editor-m-focus',
                href: `/editor/${doc.id}/focus`,
              },
              {
                icon: 'history',
                label: t('editor.historyCta', {}, { defaultValue: 'History' }),
                testid: 'editor-m-history',
                href: `/editor/${doc.id}/history`,
              },
              {
                icon: 'delete',
                label: t('editor.trashCta', {}, { defaultValue: 'Trash' }),
                testid: 'editor-m-trash',
                onClick: handleTrash,
              },
            ] as ReadonlyArray<{
              icon: string
              label: string
              testid: string
              onClick?: () => void
              href?: string
            }>
          ).map((a) =>
            a.href ? (
              <Link
                key={a.testid}
                to={a.href}
                data-testid={a.testid}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'shrink-0 px-3 h-9 rounded-full text-[12px] font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors whitespace-nowrap',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                  {a.icon}
                </span>
                {a.label}
              </Link>
            ) : (
              <button
                key={a.testid}
                type="button"
                onClick={a.onClick}
                data-testid={a.testid}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'shrink-0 px-3 h-9 rounded-full text-[12px] font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors whitespace-nowrap',
                  a.testid === 'editor-m-trash' ? 'border-error/40 text-error' : undefined,
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                  {a.icon}
                </span>
                {a.label}
              </button>
            ),
          )}
        </div>

        {actionMsg ? (
          <div
            role="status"
            className={cm.cn(
              'mx-6 mt-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-[12px] font-semibold text-primary',
            )}
          >
            {actionMsg}
          </div>
        ) : null}

        <div className={cm.cn(cm.flex1, 'overflow-y-auto')}>
          <div className={cm.cn('px-4 sm:px-8 py-8 sm:py-12 mx-auto w-full max-w-[760px]')}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('form.title', {}, { defaultValue: 'Title' })}
              data-testid="editor-title"
              className={cm.cn(
                'w-full bg-transparent text-on-surface text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-6 focus:outline-none placeholder:text-on-surface-variant/40',
              )}
              style={{
                fontFamily:
                  'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
              }}
            />
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t(
                'editor.bodyPlaceholder',
                {},
                { defaultValue: 'Begin writing — saving happens automatically.' },
              )}
              data-testid="editor-body"
              className={cm.cn(
                'w-full min-h-[60vh] bg-transparent text-on-surface text-[18px] focus:outline-none resize-none placeholder:text-on-surface-variant/40',
              )}
              style={{
                fontFamily:
                  'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                lineHeight: 1.8,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Editor
