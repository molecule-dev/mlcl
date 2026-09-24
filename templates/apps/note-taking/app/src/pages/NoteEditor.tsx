import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

interface BlockRow {
  id: string
  page_id: string
  type: string
  content: Record<string, unknown> & { text?: string }
  properties: Record<string, unknown>
  position: number
  updated_at: string
}

interface PageRow {
  id: string
  workspace_id: string
  title: string
  icon: string | null
  is_favorited: boolean
  trashed_at: string | null
  updated_at: string
  blocks: BlockRow[]
}

interface Workspace {
  id: string
  name: string
  icon: string | null
}

const TITLE_FONT = 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif'

export function NoteEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [page, setPage] = useState<PageRow | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [bodyBlockId, setBodyBlockId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bodyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirtyRef = useRef(false)

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<PageRow>(`/pages/${id}`)
      const p = res.data
      setPage(p)
      setTitle(p.title)
      const bodyBlock = p.blocks.find((b) => b.type === 'paragraph' || b.type === 'text')
      setBodyBlockId(bodyBlock?.id ?? null)
      setBody(
        typeof bodyBlock?.content?.text === 'string' ? (bodyBlock.content.text as string) : '',
      )
      const ws = (await http.get<Workspace>(`/workspaces/${p.workspace_id}`)).data
      setWorkspace(ws)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load note')
    } finally {
      setLoading(false)
    }
  }, [http, id])

  useEffect(() => {
    reload()
  }, [reload])

  const flushTitle = useCallback(
    async (next: string) => {
      if (!page) return
      if (next === page.title) return
      setSaving(true)
      try {
        await http.patch<PageRow>(`/pages/${page.id}`, { title: next })
        setSavedAt(new Date())
        isDirtyRef.current = false
        void track({ name: 'note.updated', properties: { id: page.id, field: 'title' } })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save title')
      } finally {
        setSaving(false)
      }
    },
    [http, page],
  )

  const flushBody = useCallback(
    async (next: string) => {
      if (!page) return
      setSaving(true)
      try {
        if (bodyBlockId) {
          await http.patch<BlockRow>(`/blocks/${bodyBlockId}`, {
            content: { text: next },
          })
        } else {
          const created = (
            await http.post<BlockRow>('/blocks', {
              page_id: page.id,
              type: 'paragraph',
              content: { text: next },
            })
          ).data
          setBodyBlockId(created.id)
        }
        setSavedAt(new Date())
        isDirtyRef.current = false
        void track({ name: 'note.updated', properties: { id: page.id, field: 'body' } })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save body')
      } finally {
        setSaving(false)
      }
    },
    [http, page, bodyBlockId],
  )

  const handleTitleChange = (next: string) => {
    setTitle(next)
    isDirtyRef.current = true
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => flushTitle(next), 600)
  }

  const handleBodyChange = (next: string) => {
    setBody(next)
    isDirtyRef.current = true
    if (bodyTimer.current) clearTimeout(bodyTimer.current)
    bodyTimer.current = setTimeout(() => flushBody(next), 600)
  }

  const togglePin = async () => {
    if (!page) return
    try {
      const next = !page.is_favorited
      await http.patch<PageRow>(`/pages/${page.id}`, { is_favorited: next })
      setPage({ ...page, is_favorited: next })
      void track({ name: 'note.pinned', properties: { id: page.id, pinned: next } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pin')
    }
  }

  const trashPage = async () => {
    if (!page) return
    try {
      await http.post(`/pages/${page.id}/trash`)
      void track({ name: 'note.deleted', properties: { id: page.id, trashed: true } })
      navigate('/notes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trash note')
    }
  }

  const wordCount = useMemo(() => {
    const trimmed = body.trim()
    if (!trimmed) return 0
    return trimmed.split(/\s+/).length
  }, [body])

  const updatedLabel = useMemo(() => {
    if (savedAt) {
      return savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }
    if (!page) return ''
    return new Date(page.updated_at).toLocaleString([], { hour: 'numeric', minute: '2-digit' })
  }, [savedAt, page])

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 10), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (error && !page) {
    return (
      <div className={cm.cn(cm.sp('p', 10))}>
        <p className={cm.cn('text-on-surface mb-3')}>{error}</p>
        <Link
          to="/notes"
          className={cm.cn('text-primary font-semibold')}
          onClick={(e) => {
            e.preventDefault()
            navigate('/notes')
          }}
        >
          {t('noteEditor.backToNotes', {}, { defaultValue: 'Back to notes' })}
        </Link>
      </div>
    )
  }

  if (!page) return null

  return (
    <div className={cm.cn(cm.flex({ direction: 'row' }), 'min-h-full')}>
      <div className={cm.cn(cm.flex1, 'min-w-0 px-6 py-10 lg:px-12 lg:py-14 bg-background')}>
        <article className={cm.cn('mx-auto w-full max-w-[720px]')}>
          {workspace ? (
            <nav
              className={cm.cn(
                cm.flex({ align: 'center', wrap: 'wrap' }),
                'gap-1 text-[12px] text-on-surface-variant font-medium mb-6',
              )}
            >
              <Link to="/notes" className={cm.cn('hover:text-on-surface transition-colors')}>
                {workspace.name}
              </Link>
              <span aria-hidden="true">/</span>
              <span className={cm.cn('text-on-surface font-semibold')}>
                {title || t('status.untitled', {}, { defaultValue: 'Untitled' })}
              </span>
            </nav>
          ) : null}

          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className={cm.cn(
                  cm.w(12),
                  cm.h(12),
                  cm.flex({ align: 'center', justify: 'center' }),
                  'rounded-xl bg-primary/10 text-primary',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[28px]')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  description
                </span>
              </span>
              <span
                className={cm.cn(
                  'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant',
                )}
                data-testid="updated-label"
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : `${t('noteEditor.updated', {}, { defaultValue: 'Updated' })} · ${updatedLabel}`}
              </span>
            </div>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <button
                type="button"
                onClick={togglePin}
                aria-pressed={page.is_favorited}
                aria-label={t('noteEditor.pinToggle', {}, { defaultValue: 'Toggle favorite' })}
                data-testid="pin-toggle"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-11 w-11 rounded-full transition-colors',
                  page.is_favorited
                    ? 'text-warning hover:bg-warning/10'
                    : 'text-on-surface-variant hover:text-warning hover:bg-surface-container',
                )}
              >
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={{ fontVariationSettings: page.is_favorited ? "'FILL' 1" : "'FILL' 0" }}
                  aria-hidden="true"
                >
                  star
                </span>
              </button>
              {/* Two-click confirm (shared ConfirmButton) replaces the former
                  window.confirm: first click arms, second commits. */}
              <ConfirmButton
                label={t('noteEditor.trash', {}, { defaultValue: 'Move to trash' })}
                confirmLabel={t(
                  'noteEditor.confirmTrash',
                  {},
                  { defaultValue: 'Move this note to trash?' },
                )}
                onConfirm={trashPage}
                disarmSeconds={6}
                aria-label={t('noteEditor.trash', {}, { defaultValue: 'Move to trash' })}
                data-testid="trash-page"
              />
            </div>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={t('form.title', {}, { defaultValue: 'Title' })}
            aria-label={t('noteEditor.titleLabel', {}, { defaultValue: 'Note title' })}
            data-testid="note-title"
            className={cm.cn(
              'mt-4 w-full bg-transparent border-0 rounded text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] text-on-surface placeholder:text-on-surface-variant/40',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            )}
            style={{ fontFamily: TITLE_FONT }}
          />

          <div
            className={cm.cn(
              cm.flex({ align: 'center', wrap: 'wrap' }),
              'gap-2 mt-4 text-[12px] text-on-surface-variant',
            )}
          >
            <span className={cm.cn('inline-flex items-center gap-1 font-semibold')}>
              <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                edit_note
              </span>
              <span data-testid="word-count">
                {t('common.countWords', { count: wordCount }, { defaultValue: '{{count}} words' })}
              </span>
            </span>
          </div>

          <textarea
            value={body}
            onChange={(e) => handleBodyChange(e.target.value)}
            placeholder={t(
              'noteEditor.bodyPlaceholder',
              {},
              { defaultValue: 'Start writing — your note autosaves as you type.' },
            )}
            aria-label={t('noteEditor.bodyLabel', {}, { defaultValue: 'Note body' })}
            data-testid="note-body"
            rows={18}
            className={cm.cn(
              'mt-10 w-full bg-transparent border-0 rounded resize-y text-[17px] leading-[1.7] text-on-surface placeholder:text-on-surface-variant/50',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            )}
            style={{ fontFamily: TITLE_FONT }}
          />

          {error ? (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('p', 3),
                cm.sp('mt', 4),
                'rounded-xl border border-error/40 bg-error/5 text-on-surface',
              )}
            >
              {error}
            </div>
          ) : null}
        </article>
      </div>
    </div>
  )
}

export default NoteEditor
