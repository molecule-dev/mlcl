import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { authClient } from '../bonds/auth-default.js'
import type { DocumentVisibility } from '../components/DocumentVisibilityPill.js'
import { DocumentVisibilityPill } from '../components/DocumentVisibilityPill.js'
import { getRealtimeConnection } from '../lib/realtime.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface ContentBlock {
  type: 'heading' | 'paragraph'
  text: string
}

interface DocumentContent {
  blocks: ContentBlock[]
}

interface DocumentRow {
  id: string
  owner_id: string
  title: string
  status: 'draft' | 'published' | 'archived'
  is_template: boolean
  version: number
  trashed_at: string | null
  content: DocumentContent | null
  share_role?: 'editor' | 'commenter' | 'viewer'
}

interface ShareRow {
  id: string
  document_id: string
  shared_by: string
  shared_with_user_id: string | null
  email: string | null
  role: 'viewer' | 'commenter' | 'editor'
}

const DEFAULT_BODY: DocumentContent = {
  blocks: [
    { type: 'heading', text: 'Untitled Document' },
    { type: 'paragraph', text: '' },
  ],
}

function visibilityOf(doc: DocumentRow | null): DocumentVisibility {
  if (!doc) return 'private'
  if (doc.status === 'published') return 'public'
  if (doc.status === 'archived') return 'restricted'
  return 'private'
}

function blocksToText(content: DocumentContent | null): string {
  if (!content?.blocks?.length) return ''
  return content.blocks.map((b) => b.text ?? '').join('\n\n')
}

function textToBlocks(text: string): DocumentContent {
  const lines = text.split(/\n\n+/)
  const blocks: ContentBlock[] = lines.map((line, i) => ({
    type: i === 0 ? ('heading' as const) : ('paragraph' as const),
    text: line.trim(),
  }))
  if (blocks.length === 0) blocks.push({ type: 'paragraph', text: '' })
  return { blocks }
}

export function Editor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [doc, setDoc] = useState<DocumentRow | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [shares, setShares] = useState<ShareRow[]>([])
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole, setShareRole] = useState<'viewer' | 'commenter' | 'editor'>('viewer')
  const [shareOpen, setShareOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('loading')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [resolvingNew, setResolvingNew] = useState(false)
  const dirtyRef = useRef(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Mirror the loaded version so the realtime handler can tell a genuinely newer
  // peer save from a stale/echo event WITHOUT re-subscribing on every save.
  const docVersionRef = useRef<number | null>(null)
  useEffect(() => {
    docVersionRef.current = doc?.version ?? null
  }, [doc?.version])

  const docId = params.id ?? 'new'

  // Resolve "/doc/new" by creating a new doc (optionally from ?template=ID).
  useEffect(() => {
    if (docId !== 'new' || resolvingNew) return
    setResolvingNew(true)
    const templateId = searchParams.get('template')
    const create = async (): Promise<void> => {
      try {
        let created: DocumentRow | null = null
        if (templateId) {
          const res = await http.post(`/api/templates/${templateId}/instantiate`, {})
          created = unwrapSingle<DocumentRow>(res)
        } else {
          const res = await http.post('/api/documents', {
            title: t('editor.untitled', {}, { defaultValue: 'Untitled Document' }),
          })
          created = unwrapSingle<DocumentRow>(res)
        }
        if (created?.id) {
          void track({
            name: templateId ? 'doc.created_from_template' : 'doc.created',
            properties: { document_id: created.id, template_id: templateId ?? null },
          })
          navigate(`/doc/${created.id}`, { replace: true })
        } else {
          setStatus('error')
          setStatusMessage(
            t('editor.createFailed', {}, { defaultValue: 'Could not create the document.' }),
          )
        }
      } catch (error) {
        logError('editor.createDoc', error)
        setStatus('error')
        setStatusMessage(
          t('editor.createFailed', {}, { defaultValue: 'Could not create the document.' }),
        )
      }
    }
    void create()
  }, [docId, resolvingNew, searchParams, navigate, http, t])

  // Load existing doc.
  useEffect(() => {
    if (docId === 'new' || !docId) return
    let cancelled = false
    setStatus('loading')
    http
      .get(`/api/documents/${docId}`)
      .then((res) => {
        if (cancelled) return
        const got = unwrapSingle<DocumentRow>(res)
        if (!got) {
          setStatus('error')
          setStatusMessage(t('editor.notFound', {}, { defaultValue: 'Document not found.' }))
          return
        }
        setDoc(got)
        setTitle(got.title || '')
        setBody(blocksToText(got.content ?? DEFAULT_BODY))
        setStatus('idle')
        setStatusMessage(null)
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
          setStatusMessage(
            t('editor.loadFailed', {}, { defaultValue: 'Could not load the document.' }),
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [docId, http, t])

  // Silent re-fetch of the document (realtime path). Unlike the initial load it
  // never flips `status` to loading; it refreshes the body/title ONLY when the
  // local user has no unsaved edits, so a peer's update can't clobber in-progress
  // typing (the caller also gates on dirtyRef before invoking this).
  const refreshDocument = useCallback(async () => {
    if (docId === 'new' || !docId) return
    try {
      const res = await http.get(`/api/documents/${docId}`)
      const got = unwrapSingle<DocumentRow>(res)
      if (!got) return
      setDoc(got)
      if (!dirtyRef.current) {
        setTitle(got.title || '')
        setBody(blocksToText(got.content ?? DEFAULT_BODY))
      }
    } catch (_error) {
      // Best-effort; the current view stays until the next event/load.
    }
  }, [docId, http])

  // Live collaboration: react to a peer saving a new document version. The
  // `document:updated` payload is a version-bump NOTIFICATION ({ id, version,
  // author_id }) — no content — so we pull the latest via refreshDocument. We
  // ignore our OWN save echo (author_id === current user) and any event that
  // isn't strictly newer than what we hold. If the local user has unsaved edits
  // we don't clobber them — we surface a non-destructive "updated elsewhere"
  // notice instead. Server: api/src/handlers/documents.ts; auth: lib/realtime.ts.
  useEffect(() => {
    if (docId === 'new' || !docId) return
    const room = `document:${docId}`
    let active = true
    let connection: RealtimeConnection | null = null

    const onDocumentUpdated = (data: unknown) => {
      const rec =
        typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null
      if (!rec) return
      const authorId = typeof rec.author_id === 'string' ? rec.author_id : null
      const me = authClient.getUser()?.id ?? null
      if (authorId && me && authorId === me) return // our own save echo
      const version = typeof rec.version === 'number' ? rec.version : null
      const current = docVersionRef.current
      if (version !== null && current !== null && version <= current) return // not newer
      if (dirtyRef.current) {
        setStatus('idle')
        setStatusMessage(
          t(
            'editor.updatedElsewhere',
            {},
            {
              defaultValue: 'This document was updated by someone else — reload to see the latest.',
            },
          ),
        )
        return
      }
      void refreshDocument()
    }

    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('document:updated', onDocumentUpdated)
        return conn.joinRoom(room)
      })
      .catch(() => {
        // Realtime is best-effort; the initial fetch already populated the doc.
      })

    return () => {
      active = false
      if (connection) {
        connection.off('document:updated', onDocumentUpdated)
        connection.leaveRoom(room).catch(() => {})
      }
    }
  }, [docId, refreshDocument, t])

  // Load shares (owner-only; failures are silent for non-owners).
  useEffect(() => {
    if (!doc?.id) return
    let cancelled = false
    http
      .get(`/api/sharing/${doc.id}`)
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res) ? res : ((res as { data?: ShareRow[] }).data ?? [])
        setShares(list as ShareRow[])
      })
      .catch(() => {
        if (!cancelled) setShares([])
      })
    return () => {
      cancelled = true
    }
  }, [doc?.id, http])

  // Debounced autosave on title or body change.
  const persistNow = useCallback(async () => {
    if (!doc?.id) return
    setStatus('saving')
    try {
      const next = textToBlocks(body)
      const res = await http.put(`/api/documents/${doc.id}`, {
        title,
        content: next,
      })
      const updated = unwrapSingle<DocumentRow>(res)
      if (updated) setDoc(updated)
      dirtyRef.current = false
      setStatus('saved')
      setStatusMessage(t('common.saved', {}, { defaultValue: 'Saved' }))
      void track({
        name: 'doc.saved',
        properties: { document_id: doc.id, version: updated?.version ?? null },
      })
      setTimeout(() => setStatus('idle'), 1500)
    } catch (error) {
      logError('editor.save', error)
      setStatus('error')
      setStatusMessage(t('common.saveFailed', {}, { defaultValue: 'Save failed.' }))
    }
  }, [doc?.id, body, title, http, t])

  useEffect(() => {
    if (!doc?.id || !dirtyRef.current) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      void persistNow()
    }, 800)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [title, body, doc?.id, persistNow])

  const onTitleChange = (value: string): void => {
    setTitle(value)
    dirtyRef.current = true
    setStatus('saving')
  }

  const onBodyChange = (value: string): void => {
    setBody(value)
    dirtyRef.current = true
    setStatus('saving')
  }

  const onPublishToggle = async (): Promise<void> => {
    if (!doc?.id) return
    const next = doc.status === 'published' ? 'draft' : 'published'
    try {
      const res = await http.put(`/api/documents/${doc.id}`, { status: next })
      const updated = unwrapSingle<DocumentRow>(res)
      if (updated) setDoc(updated)
      void track({
        name: next === 'published' ? 'doc.published' : 'doc.unpublished',
        properties: { document_id: doc.id, status: next },
      })
    } catch (error) {
      logError('editor.publishToggle', error)
      setStatusMessage(
        t('editor.publishFailed', {}, { defaultValue: 'Could not change visibility.' }),
      )
    }
  }

  const onTrash = async (): Promise<void> => {
    if (!doc?.id) return
    try {
      await http.post(`/api/documents/${doc.id}/trash`, {})
      void track({ name: 'doc.trashed', properties: { document_id: doc.id } })
      navigate('/dashboard')
    } catch (error) {
      logError('editor.trash', error)
      setStatusMessage(t('editor.trashFailed', {}, { defaultValue: 'Could not move to trash.' }))
    }
  }

  const onAddShare = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (!doc?.id || !shareEmail) return
    try {
      const res = await http.post(`/api/sharing/${doc.id}`, {
        email: shareEmail,
        role: shareRole,
      })
      const created = unwrapSingle<ShareRow>(res)
      if (created) setShares((prev) => [created, ...prev])
      void track({
        name: 'doc.shared',
        properties: { document_id: doc.id, share_id: created?.id ?? null, role: shareRole },
      })
      setShareEmail('')
    } catch (error) {
      logError('editor.addShare', error)
      setStatusMessage(t('editor.shareFailed', {}, { defaultValue: 'Could not add share.' }))
    }
  }

  const onRemoveShare = async (id: string): Promise<void> => {
    if (!doc?.id) return
    try {
      await http.delete(`/api/sharing/${doc.id}/${id}`)
      setShares((prev) => prev.filter((s) => s.id !== id))
      void track({
        name: 'doc.share_removed',
        properties: { document_id: doc.id, share_id: id },
      })
    } catch (error) {
      logError('editor.removeShare', error)
      setStatusMessage(
        t('editor.shareRemoveFailed', {}, { defaultValue: 'Could not remove share.' }),
      )
    }
  }

  if (status === 'loading' && !doc) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'text-center text-on-surface-variant')}
      >
        {t('editor.loading', {}, { defaultValue: 'Opening the manuscript…' })}
      </div>
    )
  }

  if (status === 'error' && !doc) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'text-center text-error')}>
        {statusMessage}
      </div>
    )
  }

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col' }), 'min-h-full bg-surface-container-low')}
      data-testid="editor-root"
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
          cm.sp('px', 4),
          cm.sp('py', 4),
          // On mobile the app's own top bar (h-14) is sticky above this one, so
          // this header pins beneath it; at md+ the top bar is gone (sidebar).
          'sticky top-14 z-30 flex-wrap border-b border-outline-variant bg-surface/95 backdrop-blur md:top-0',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0 flex-1')}>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.flex({ align: 'center' }),
              'rounded-full p-2 text-on-surface-variant hover:bg-surface-container',
            )}
            aria-label={t('editor.back', {}, { defaultValue: 'Back to manuscripts' })}
          >
            <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
              arrow_back
            </span>
          </Link>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            aria-label={t('editor.titleLabel', {}, { defaultValue: 'Document title' })}
            data-testid="editor-title"
            className={cm.cn(
              cm.fontWeight('extrabold'),
              cm.textSize('lg'),
              'min-w-0 flex-1 border-0 bg-transparent text-on-surface focus:outline-none',
            )}
          />
          <DocumentVisibilityPill visibility={visibilityOf(doc)} />
          <span
            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
            data-testid="editor-save-status"
          >
            {status === 'saving'
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : status === 'saved'
                ? t('common.saved', {}, { defaultValue: 'Saved' })
                : status === 'error'
                  ? t('editor.errorShort', {}, { defaultValue: 'Save failed' })
                  : doc?.version
                    ? t('editor.version', { v: doc.version }, { defaultValue: 'v{{v}}' })
                    : ''}
          </span>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          <Link
            to={`/doc/${docId}/comments`}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full border border-outline text-on-surface hover:bg-surface-container',
            )}
          >
            {t('editor.comments', {}, { defaultValue: 'Comments' })}
          </Link>
          <Link
            to={`/doc/${docId}/history`}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full border border-outline text-on-surface hover:bg-surface-container',
            )}
          >
            {t('nav.history', {}, { defaultValue: 'History' })}
          </Link>
          <button
            type="button"
            onClick={onPublishToggle}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full border border-outline text-on-surface hover:bg-surface-container',
            )}
            data-testid="editor-publish-toggle"
          >
            {doc?.status === 'published'
              ? t('editor.unpublish', {}, { defaultValue: 'Unpublish' })
              : t('common.publish', {}, { defaultValue: 'Publish' })}
          </button>
          <button
            type="button"
            onClick={onTrash}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full border border-outline text-error hover:bg-error/5',
            )}
            data-testid="editor-trash"
          >
            {t('editor.trash', {}, { defaultValue: 'Move to trash' })}
          </button>
          <button
            type="button"
            onClick={() => setShareOpen((o) => !o)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('extrabold'),
              cm.textSize('sm'),
              'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5',
            )}
            aria-expanded={shareOpen}
            data-testid="editor-share-toggle"
          >
            {t('common.share', {}, { defaultValue: 'Share' })}
          </button>
        </div>
      </header>

      {shareOpen ? (
        <div
          className={cm.cn(
            cm.sp('p', 6),
            cm.sp('mx', 6),
            cm.sp('mt', 4),
            'rounded-2xl border border-outline-variant bg-surface',
          )}
          data-testid="editor-share-panel"
        >
          <h2 className={cm.cn(cm.fontWeight('extrabold'), cm.textSize('lg'))}>
            {t('editor.share.heading', {}, { defaultValue: 'Share this manuscript' })}
          </h2>
          <form
            onSubmit={onAddShare}
            className={cm.cn(cm.sp('mt', 3), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}
          >
            <input
              type="email"
              required
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'flex-1 rounded-full border border-outline-variant bg-surface-container-lowest focus:border-primary focus:outline-none',
              )}
              data-testid="editor-share-email"
            />
            <select
              value={shareRole}
              onChange={(e) => setShareRole(e.target.value as 'viewer' | 'commenter' | 'editor')}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-full border border-outline-variant bg-surface-container-lowest',
              )}
              data-testid="editor-share-role"
            >
              <option value="viewer">
                {t('editor.share.role.viewer', {}, { defaultValue: 'Viewer' })}
              </option>
              <option value="commenter">
                {t('editor.share.role.commenter', {}, { defaultValue: 'Commenter' })}
              </option>
              <option value="editor">{t('nav.editor', {}, { defaultValue: 'Editor' })}</option>
            </select>
            <button
              type="submit"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('extrabold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-white shadow-sm',
              )}
              data-testid="editor-share-submit"
            >
              {t('common.add', {}, { defaultValue: 'Add' })}
            </button>
          </form>
          <ul className={cm.cn(cm.sp('mt', 4), 'space-y-1')} data-testid="editor-share-list">
            {shares.length === 0 ? (
              <li className={cm.cn('text-sm text-on-surface-variant')}>
                {t('editor.share.empty', {}, { defaultValue: 'Not yet shared with anyone.' })}
              </li>
            ) : (
              shares.map((s) => (
                <li
                  key={s.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 2),
                    'text-sm',
                  )}
                >
                  <span>
                    {s.email ?? s.shared_with_user_id} ·{' '}
                    <span className={cm.fontWeight('semibold')}>{s.role}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveShare(s.id)}
                    className={cm.cn('text-xs font-extrabold text-error hover:underline')}
                  >
                    {t('common.remove', {}, { defaultValue: 'Remove' })}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      <main
        className={cm.cn(cm.sp('px', 3), cm.sp('py', 6), 'flex justify-center md:px-6 md:py-12')}
      >
        <article
          className={cm.cn(
            cm.sp('p', 4),
            'w-full max-w-[820px] rounded-2xl bg-surface ring-1 ring-outline-variant/60 shadow-sm md:p-12',
          )}
        >
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder={t(
              'editor.bodyPlaceholder',
              {},
              { defaultValue: 'Begin where the cursor blinks.' },
            )}
            aria-label={t('editor.bodyLabel', {}, { defaultValue: 'Document body' })}
            className={cm.cn(
              cm.w('full'),
              'min-h-[60vh] resize-none border-0 bg-transparent text-[17px] leading-[1.7] text-on-surface focus:outline-none',
            )}
            style={{ fontFamily: 'Charter, Georgia, serif' }}
            data-testid="editor-body"
          />
        </article>
      </main>
    </div>
  )
}

export default Editor
