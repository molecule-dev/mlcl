import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, PromptDialog } from '@molecule/app-ui-react'

import type { VersoNote } from '../components/VersoNoteCard.js'
import { VersoNoteCard } from '../components/VersoNoteCard.js'

interface Workspace {
  id: string
  name: string
  icon: string | null
  updated_at: string
}

interface Page {
  id: string
  workspace_id: string
  title: string
  icon: string | null
  is_favorited: boolean
  trashed_at: string | null
  updated_at: string
  created_at: string
}

const formatRelative = (iso: string): string => {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = Math.max(0, now - then)
  const day = 24 * 60 * 60 * 1000
  if (diffMs < day)
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (diffMs < 2 * day) return 'Yesterday'
  const days = Math.floor(diffMs / day)
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const pageToNote = (page: Page, workspaceName: string, untitledLabel: string): VersoNote => ({
  id: page.id,
  title: page.title || untitledLabel,
  excerpt: '',
  updatedAtLabel: formatRelative(page.updated_at),
  notebook: workspaceName,
  tags: [],
  backlinkCount: 0,
  wordCount: 0,
  pinned: page.is_favorited,
})

export function Notes() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pinned'>('all')
  const [newNotebookOpen, setNewNotebookOpen] = useState(false)
  const [notebookError, setNotebookError] = useState<string | null>(null)

  const ensureWorkspaces = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = (await http.get<Workspace[]>('/workspaces')).data
      let next = list
      if (next.length === 0) {
        const created = (
          await http.post<Workspace>('/workspaces', {
            name: t('notes.defaultWorkspaceName', {}, { defaultValue: 'My notebook' }),
            icon: 'auto_stories',
          })
        ).data
        next = [created]
      }
      setWorkspaces(next)
      setActiveWorkspaceId(next[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notebooks')
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    ensureWorkspaces()
  }, [ensureWorkspaces])

  useEffect(() => {
    if (!activeWorkspaceId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get<Page[]>(`/pages?workspace_id=${activeWorkspaceId}`)
      .then((res) => {
        if (cancelled) return
        setPages(res.data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load notes')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, activeWorkspaceId])

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  )

  const visibleNotes = useMemo<ReadonlyArray<VersoNote>>(() => {
    const filtered = filter === 'pinned' ? pages.filter((p) => p.is_favorited) : pages
    const untitledLabel = t('status.untitled', {}, { defaultValue: 'Untitled' })
    return filtered.map((p) => pageToNote(p, activeWorkspace?.name ?? '', untitledLabel))
  }, [pages, filter, activeWorkspace, t])

  const closeNewNotebook = () => {
    setNewNotebookOpen(false)
    setNotebookError(null)
  }

  // Shared PromptDialog replaces the former window.prompt. A fulfilled submit
  // resolves → the dialog auto-closes (onClose fires); a rejection keeps it
  // open so the error Alert in `children` stays visible.
  const handleCreateWorkspace = async (rawName: string) => {
    const name = rawName.trim()
    if (!name) {
      const msg = t('notes.newNotebookRequired', {}, { defaultValue: 'Enter a notebook name.' })
      setNotebookError(msg)
      throw new Error(msg)
    }
    try {
      const created = (await http.post<Workspace>('/workspaces', { name, icon: 'auto_stories' }))
        .data
      setWorkspaces((prev) => [created, ...prev])
      setActiveWorkspaceId(created.id)
      void track({ name: 'notebook.created', properties: { id: created.id } })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create notebook'
      setNotebookError(msg)
      throw err instanceof Error ? err : new Error(msg)
    }
  }

  const handleCreateNote = async () => {
    if (!activeWorkspaceId) return
    try {
      const created = (
        await http.post<Page>('/pages', {
          workspace_id: activeWorkspaceId,
          title: t('status.untitled', {}, { defaultValue: 'Untitled' }),
        })
      ).data
      void track({ name: 'note.created', properties: { id: created.id } })
      navigate(`/notes/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note')
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'row' }), 'min-h-full')}>
      <aside
        className={cm.cn(
          'w-[260px] shrink-0 hidden md:block border-r border-outline-variant/40 bg-surface-container-low/40 p-5',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mb-5')}>
          <h2
            className={cm.cn(
              'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant',
            )}
          >
            {t('notes.notebooksHeading', {}, { defaultValue: 'Notebooks' })}
          </h2>
          <button
            type="button"
            data-testid="new-notebook"
            aria-label={t('notes.newNotebook', {}, { defaultValue: 'New notebook' })}
            onClick={() => setNewNotebookOpen(true)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-9 w-9 shrink-0 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[20px]')} aria-hidden="true">
              add
            </span>
          </button>
        </div>

        <ul className={cm.cn('space-y-1')}>
          {workspaces.map((ws) => (
            <li key={ws.id}>
              <button
                type="button"
                onClick={() => setActiveWorkspaceId(ws.id)}
                className={cm.cn(
                  cm.sp('px', 2.5),
                  cm.sp('py', 2),
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'w-full rounded-lg text-sm font-semibold transition-colors',
                  activeWorkspaceId === ws.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface hover:bg-surface-container',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[18px]')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  {ws.icon ?? 'auto_stories'}
                </span>
                <span className={cm.cn('flex-1 text-left truncate')}>{ws.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className={cm.cn('flex-1 min-w-0 px-6 py-10 lg:px-10')}>
        <header className={cm.cn('mb-6 max-w-[820px]')}>
          <p
            className={cm.cn(
              'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant mb-2',
            )}
          >
            {t('notes.eyebrow', {}, { defaultValue: 'Notebook' })}
          </p>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(
                cm.w(11),
                cm.h(11),
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-xl bg-primary/10 text-primary',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[24px]')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {activeWorkspace?.icon ?? 'folder'}
              </span>
            </span>
            <h1
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
              )}
              style={{
                fontFamily:
                  'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
              }}
            >
              {activeWorkspace?.name ?? t('form.notes', {}, { defaultValue: 'Notes' })}
            </h1>
            <span
              className={cm.cn(
                'ml-2 px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums bg-surface-container text-on-surface-variant',
              )}
              data-testid="notes-count"
            >
              {visibleNotes.length}
            </span>
          </div>
          <p className={cm.cn(cm.sp('mt', 3), 'text-on-surface-variant text-base max-w-xl')}>
            {t(
              'notes.subtitle',
              {},
              {
                defaultValue:
                  'Pick a notebook on the left, then press the New note button to start a fresh entry.',
              },
            )}
          </p>
        </header>

        {/* Mobile notebook picker — the sidebar aside is desktop-only, so
            below md the notebooks render as a horizontal chip scroller. */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'mb-4 max-w-[820px] -mx-1 px-1 overflow-x-auto pb-1 md:hidden',
          )}
          data-testid="mobile-notebooks"
        >
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => setActiveWorkspaceId(ws.id)}
              aria-pressed={activeWorkspaceId === ws.id}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'shrink-0 min-h-[36px] px-3 py-1.5 rounded-full border text-[13px] font-semibold transition-colors',
                activeWorkspaceId === ws.id
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-outline-variant/50 text-on-surface-variant hover:bg-surface-container',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[15px]')} aria-hidden="true">
                {ws.icon ?? 'auto_stories'}
              </span>
              <span className="max-w-[160px] truncate">{ws.name}</span>
            </button>
          ))}
          <button
            type="button"
            data-testid="new-notebook-mobile"
            aria-label={t('notes.newNotebook', {}, { defaultValue: 'New notebook' })}
            onClick={() => setNewNotebookOpen(true)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'shrink-0 min-h-[36px] w-9 rounded-full border border-dashed border-outline-variant/60 text-on-surface-variant hover:bg-surface-container transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
              add
            </span>
          </button>
        </div>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' }),
            'gap-3 mb-6 max-w-[820px]',
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              type="button"
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'min-h-[36px] px-3.5 rounded-full text-[12px] font-bold transition-colors',
                filter === 'all'
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[14px]')}>filter_list</span>
              {t('notes.filterAll', {}, { defaultValue: 'All notes' })}
            </button>
            <button
              type="button"
              onClick={() => setFilter('pinned')}
              aria-pressed={filter === 'pinned'}
              className={cm.cn(
                'min-h-[36px] px-3.5 rounded-full text-[12px] font-semibold transition-colors',
                filter === 'pinned'
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t('notes.filterPinned', {}, { defaultValue: 'Pinned' })}
            </button>
          </div>
          <button
            type="button"
            data-testid="new-note"
            onClick={handleCreateNote}
            disabled={!activeWorkspaceId}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-xl text-sm font-bold text-white shadow-md',
              'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity disabled:opacity-50',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
              add
            </span>
            <span>{t('notes.newCta', {}, { defaultValue: 'New note' })}</span>
          </button>
        </div>

        {error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-xl border border-error/40 bg-error/5 text-on-surface mb-4 max-w-[820px]',
            )}
          >
            {error}
          </div>
        ) : null}

        <div className={cm.cn('space-y-3 max-w-[820px]')}>
          {loading ? (
            <p className={cm.cn('text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : visibleNotes.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                'rounded-2xl border border-dashed border-outline-variant text-center',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[36px] text-on-surface-variant')}
                aria-hidden="true"
              >
                draw
              </span>
              <p className={cm.cn('mt-2 text-on-surface-variant')}>
                {t(
                  'notes.empty',
                  {},
                  { defaultValue: 'No notes here yet — start one to fill the notebook.' },
                )}
              </p>
            </div>
          ) : (
            visibleNotes.map((note) => <VersoNoteCard key={note.id} note={note} />)
          )}
        </div>
      </div>

      <PromptDialog
        open={newNotebookOpen}
        onClose={closeNewNotebook}
        title={t('notes.newNotebook', {}, { defaultValue: 'New notebook' })}
        description={t('notes.newNotebookPrompt', {}, { defaultValue: 'New notebook name' })}
        placeholder={t('notes.newNotebookPrompt', {}, { defaultValue: 'New notebook name' })}
        confirmLabel={t('common.create', {}, { defaultValue: 'Create' })}
        cancelLabel={t('common.cancel', {}, { defaultValue: 'Cancel' })}
        inputMolId="new-notebook-name"
        confirmMolId="new-notebook-confirm"
        cancelMolId="new-notebook-cancel"
        onSubmit={handleCreateWorkspace}
      >
        {notebookError ? <Alert status="error">{notebookError}</Alert> : null}
      </PromptDialog>
    </div>
  )
}

export default Notes
