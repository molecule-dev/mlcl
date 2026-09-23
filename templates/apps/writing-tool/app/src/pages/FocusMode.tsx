import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { DocumentRow } from '../lib/types.js'

const AUTOSAVE_DEBOUNCE_MS = 800

/**
 * Focus mode — distraction-free writing surface.
 *
 * Same data model as the Editor (loads + autosaves the same row), but
 * strips chrome to a single textarea + word-count footer that fades on
 * idle. Body changes flow back to /api/documents/:id (PATCH).
 */
export function FocusMode() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const docId = id ?? ''

  const [doc, setDoc] = useState<DocumentRow | null>(null)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!docId) return
    let cancelled = false
    setLoading(true)
    http
      .get<DocumentRow>(`/documents/${docId}`)
      .then((res) => {
        if (cancelled) return
        const row = res.data
        if (!row) {
          setError(t('focus.notFound', {}, { defaultValue: 'Document not found.' }))
        } else {
          setDoc(row)
          setBody(row.body_md ?? '')
          setError(null)
        }
      })
      .catch(() => {
        if (cancelled) return
        setError(t('focus.loadError', {}, { defaultValue: 'Could not load document.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [docId, http, t])

  const persist = useCallback(
    async (next: string) => {
      if (!doc) return
      setSaveState('saving')
      try {
        const res = await http.patch<DocumentRow>(`/documents/${doc.id}`, { body_md: next })
        if (res.data) setDoc(res.data)
        setSaveState('saved')
      } catch (error) {
        logError('focus.persist', error)
        setSaveState('error')
      }
    },
    [doc, http],
  )

  useEffect(() => {
    if (!doc) return
    if (body === doc.body_md) return
    const handle = window.setTimeout(() => {
      void persist(body)
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [body, doc, persist])

  useEffect(() => {
    const reveal = () => {
      setChromeVisible(true)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(() => setChromeVisible(false), 3000)
    }
    reveal()
    window.addEventListener('mousemove', reveal)
    window.addEventListener('keydown', reveal)
    return () => {
      window.removeEventListener('mousemove', reveal)
      window.removeEventListener('keydown', reveal)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  const wordCount = useMemo(() => body.trim().split(/\s+/).filter(Boolean).length, [body])

  if (loading) {
    return (
      <div className={cm.cn('p-12 text-center text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className={cm.cn('p-12 text-center')}>
        <p className={cm.cn('text-on-surface mb-4')}>{error}</p>
        <Link to="/library" className={cm.cn('text-primary font-bold')}>
          {t('focus.backToLibrary', {}, { defaultValue: 'Back to library' })}
        </Link>
      </div>
    )
  }

  return (
    <div
      className={cm.cn('min-h-screen w-full flex flex-col bg-background text-on-surface relative')}
    >
      <header
        className={cm.cn(
          'fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-3',
          'bg-background/80 backdrop-blur transition-opacity',
          chromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        <Link
          to={`/editor/${doc.id}`}
          className={cm.cn(
            'flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant hover:text-primary',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
            arrow_back
          </span>
          {t('focus.exit', {}, { defaultValue: 'Exit focus mode' })}
        </Link>
        <div
          data-testid="focus-save-state"
          className={cm.cn(
            'inline-flex items-center gap-2 text-[11px] font-bold',
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
              ? t('focus.saveError', {}, { defaultValue: 'Save failed' })
              : saveState === 'saved'
                ? t('common.saved', {}, { defaultValue: 'Saved' })
                : t('focus.autosaveOn', {}, { defaultValue: 'Autosave on' })}
        </div>
      </header>

      <main
        className={cm.cn('flex-1 flex items-stretch w-full max-w-[680px] mx-auto px-6 pt-24 pb-32')}
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          data-testid="focus-body"
          placeholder={t(
            'focus.bodyPlaceholder',
            {},
            { defaultValue: 'A line at a time. Nobody else is here.' },
          )}
          className={cm.cn(
            'w-full bg-transparent text-on-surface text-[20px] resize-none focus:outline-none placeholder:text-on-surface-variant/40',
          )}
          style={{
            fontFamily:
              'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
            lineHeight: 1.9,
            minHeight: '60vh',
          }}
        />
      </main>

      <footer
        className={cm.cn(
          'fixed bottom-0 left-0 right-0 z-10 flex items-center justify-center px-6 py-3 transition-opacity',
          chromeVisible ? 'opacity-100' : 'opacity-30',
        )}
      >
        <span
          className={cm.cn(
            'text-[11px] font-bold tabular-nums uppercase tracking-[0.32em] text-on-surface-variant',
          )}
          data-testid="focus-word-count"
        >
          {t('common.countWords', { count: wordCount }, { defaultValue: '{{count}} words' })}
        </span>
      </footer>
    </div>
  )
}

export default FocusMode
