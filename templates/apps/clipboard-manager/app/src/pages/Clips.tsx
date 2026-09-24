import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { t } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { CategoryPill, type ClipCategory } from '../components/CategoryPill.js'
import { KbdBadge } from '../components/KbdBadge.js'
import { type SnippetItem, SnippetRow } from '../components/SnippetRow.js'
import { useFetchList } from '../lib/use-fetch.js'
import { useIsMobile, useMediaQuery } from '../lib/use-is-mobile.js'

interface ApiClipRow {
  id: string
  title: string
  content: string | null
  preview?: string | null
  type: 'text' | 'code' | 'link' | 'image' | string
  source_app: string | null
  category_id: string | null
  is_pinned: boolean
  is_favorite: boolean
  is_sensitive: boolean
  created_at: string
  updated_at: string
}

interface ApiCategoryRow {
  id: string
  name: string
  icon: string | null
  color: string | null
  position: number
}

interface ClipDetail {
  id: string
  title: string
  category: ClipCategory
  source: { icon: string; label: string }
  body: string
  characters: number
  createdAt: string
  isPinned: boolean
  isFavorite: boolean
  isSensitive: boolean
  categoryId: string | null
}

function uiCategoryFor(row: ApiClipRow): ClipCategory {
  if (row.is_sensitive) return 'credential'
  if (row.type === 'link') return 'url'
  if (row.type === 'image') return 'image'
  if (row.type === 'code') return 'code'
  return 'text'
}

function relativeTimestamp(iso: string): string {
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return ''
  const diff = Math.max(0, Date.now() - d)
  const sec = Math.round(diff / 1000)
  if (sec < 60) return t('time.justNow', {}, { defaultValue: 'Just now' })
  const min = Math.round(sec / 60)
  if (min < 60) return t('time.minutesAgoShort', { count: min }, { defaultValue: '{{count}}m ago' })
  const hr = Math.round(min / 60)
  if (hr < 24) return t('time.hoursAgoShort', { count: hr }, { defaultValue: '{{count}}h ago' })
  const day = Math.round(hr / 24)
  if (day < 7) return t('time.daysAgoShort', { count: day }, { defaultValue: '{{count}}d ago' })
  return new Date(iso).toLocaleDateString()
}

function adaptToSnippet(row: ApiClipRow): SnippetItem & { detail: ClipDetail } {
  const previewSrc = row.preview ?? row.content ?? ''
  const category = uiCategoryFor(row)
  const sourceLabel = row.source_app ?? null
  const sourceIcon =
    category === 'code'
      ? 'terminal'
      : category === 'url'
        ? 'link'
        : category === 'image'
          ? 'image'
          : 'description'
  return {
    id: row.id,
    preview: previewSrc.slice(0, 200) || row.title,
    category,
    sourceIcon,
    sourceLabel: sourceLabel ?? undefined,
    timestamp: relativeTimestamp(row.created_at),
    pinned: row.is_pinned,
    encrypted: row.is_sensitive,
    detail: {
      id: row.id,
      title: row.title,
      category,
      source: { icon: sourceIcon, label: sourceLabel ?? '—' },
      body: row.is_sensitive ? '••••••••••••••••••••' : (row.content ?? ''),
      characters: (row.content ?? '').length || 0,
      createdAt: new Date(row.created_at).toLocaleString(),
      isPinned: row.is_pinned,
      isFavorite: row.is_favorite,
      isSensitive: row.is_sensitive,
      categoryId: row.category_id,
    },
  }
}

export function Clips() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isMobile = useIsMobile()
  // Below lg (1024px) the shared sidebar + fixed 420px detail pane cannot
  // both fit — use the phone-style pane swap there too (768-1023 keeps the
  // desktop sidebar but swaps list/detail like a phone).
  const isNarrow = useMediaQuery('(max-width: 1023.98px)')
  const [activeId, setActiveId] = useState<string>('')
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [draftContent, setDraftContent] = useState('')
  const [draftSensitive, setDraftSensitive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  const adapt = useCallback(adaptToSnippet, [])
  const clipsState = useFetchList<ApiClipRow, SnippetItem & { detail: ClipDetail }>(
    '/api/clips',
    adapt,
  )

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return clipsState.data
    return clipsState.data.filter(
      (c) => c.preview.toLowerCase().includes(q) || c.detail.title.toLowerCase().includes(q),
    )
  }, [clipsState.data, filter])

  const pinned = visible.filter((c) => c.pinned)
  const others = visible.filter((c) => !c.pinned)
  // Only an explicitly selected clip opens the detail pane (the old
  // `?? visible[0]` fallback showed content no row highlighted, and on a
  // phone it would yank the user off the list for no reason).
  const active = activeId ? (clipsState.data.find((c) => c.id === activeId)?.detail ?? null) : null

  const selectClip = useCallback((id: string) => {
    setActiveId(id)
  }, [])

  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const content = draftContent.trim()
      if (!content || busy) return
      setBusy(true)
      try {
        await http.post<ApiClipRow>('/api/clips', {
          content,
          is_sensitive: draftSensitive,
        })
        setDraftContent('')
        setDraftSensitive(false)
        setAdding(false)
        void track({ name: 'clip.created', properties: { sensitive: draftSensitive } })
        await clipsState.refetch()
      } catch (_error) {
        /* surfaced via fetch state */
      } finally {
        setBusy(false)
      }
    },
    [draftContent, draftSensitive, busy, http, clipsState],
  )

  const handleCopy = useCallback(async () => {
    if (!active) return
    try {
      // Sensitive clips are masked in the list payload — fetch the decrypted
      // content on demand so the copy button works for credentials too.
      let text = active.body
      if (active.isSensitive) {
        const res = await http.get<ApiClipRow>(`/api/clips/${active.id}`)
        if (typeof res.data?.content !== 'string') return
        text = res.data.content
      }
      await navigator.clipboard?.writeText(text)
      setCopied(true)
      void track({
        name: 'clip.copied',
        properties: { clip_id: active.id, category: active.category },
      })
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch (_error) {
      /* clipboard may be blocked in test envs */
    }
  }, [active, http])

  const handleTogglePin = useCallback(async () => {
    if (!active || busy) return
    setBusy(true)
    try {
      await http.post(`/api/clips/${active.id}/pin`, {})
      void track({
        name: active.isPinned ? 'clip.unpinned' : 'clip.pinned',
        properties: { clip_id: active.id },
      })
      await clipsState.refetch()
    } finally {
      setBusy(false)
    }
  }, [active, busy, http, clipsState])

  const handleToggleFavorite = useCallback(async () => {
    if (!active || busy) return
    setBusy(true)
    try {
      await http.post(`/api/clips/${active.id}/favorite`, {})
      void track({
        name: 'clip.favorite_toggled',
        properties: { clip_id: active.id, favorite: !active.isFavorite },
      })
      await clipsState.refetch()
    } finally {
      setBusy(false)
    }
  }, [active, busy, http, clipsState])

  const handleToggleEncrypt = useCallback(async () => {
    if (!active || busy) return
    setBusy(true)
    try {
      const next = !active.isSensitive
      // The list payload masks sensitive content, so `active.body` is the
      // bullet mask for encrypted clips. Fetch the decrypted content first —
      // otherwise un-encrypting would overwrite the clip with the mask.
      let content = active.body
      if (active.isSensitive) {
        const res = await http.get<ApiClipRow>(`/api/clips/${active.id}`)
        if (typeof res.data?.content !== 'string') return
        content = res.data.content
      }
      await http.patch(`/api/clips/${active.id}`, {
        content,
        is_sensitive: next,
      })
      void track({
        name: 'clip.encryption_toggled',
        properties: { clip_id: active.id, sensitive: next },
      })
      await clipsState.refetch()
    } catch (_error) {
      /* surfaced via fetch state on the next refetch */
    } finally {
      setBusy(false)
    }
  }, [active, busy, http, clipsState])

  const handleDelete = useCallback(async () => {
    if (!active || busy) return
    // Confirmation is owned by the shared ConfirmButton (arm → confirm,
    // 4s auto-disarm, Escape, aria-live); this handler only commits.
    setBusy(true)
    try {
      await http.delete(`/api/clips/${active.id}`)
      void track({
        name: 'clip.deleted',
        properties: { clip_id: active.id, category: active.category },
      })
      setActiveId('')
      await clipsState.refetch()
    } finally {
      setBusy(false)
    }
  }, [active, busy, http, clipsState])

  const iconBtn =
    'w-10 h-10 md:w-8 md:h-8 rounded-md hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

  const renderRows = (rows: Array<SnippetItem & { detail: ClipDetail }>) => (
    <div className={cm.cn('grid grid-cols-1 gap-2 md:flex md:flex-col md:gap-1')}>
      {rows.map((s) => (
        <SnippetRow key={s.id} snippet={s} active={s.id === activeId} onSelect={selectClip} />
      ))}
    </div>
  )

  const listBody = (
    <>
      {clipsState.loading && clipsState.data.length === 0 && (
        <div className={cm.cn(cm.sp('py', 4), cm.stack(2))} aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cm.cn(
                cm.h(12),
                cm.w('full'),
                'animate-pulse rounded-md bg-surface-container border border-outline-variant/20',
              )}
            />
          ))}
          <span className="sr-only">
            {t('clips.loading', {}, { defaultValue: 'Loading clips…' })}
          </span>
        </div>
      )}

      {clipsState.error && clipsState.data.length === 0 && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 3),
            'rounded-md bg-error-container/30 border border-error/30 text-error',
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('clips.loadError', {}, { defaultValue: 'Clips could not be loaded.' })}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mb', 2), 'opacity-80 break-words')}>
            {clipsState.error}
          </p>
          <button
            type="button"
            data-mol-id="clips-retry"
            onClick={() => void clipsState.refetch()}
            className={cm.cn(
              cm.sp('px', 3),
              'min-h-[36px] rounded-md border border-error/40 text-xs font-semibold hover:bg-error-container/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Retry' })}
          </button>
        </div>
      )}

      {pinned.length > 0 && (
        <>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 2),
              cm.sp('mb', 2),
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-[12px] text-warning')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              push_pin
            </span>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('clips.pinnedHeading', {}, { defaultValue: 'Pinned' })}
            </span>
          </div>
          <div className={cm.cn(cm.sp('mb', 4))}>{renderRows(pinned)}</div>
        </>
      )}

      {others.length > 0 && (
        <>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 2),
              cm.sp('mb', 2),
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('status.recent', {}, { defaultValue: 'Recent' })}
            </span>
          </div>
          {renderRows(others)}
        </>
      )}

      {!clipsState.loading && visible.length === 0 && !clipsState.error && (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.sp('py', 12),
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-4xl text-on-surface-variant/40')}
          >
            {filter.trim() ? 'search_off' : 'content_paste_off'}
          </span>
          <p
            className={cm.cn(
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant max-w-[260px]',
            )}
          >
            {filter.trim()
              ? t('clips.empty', {}, { defaultValue: 'No clips match that filter.' })
              : t(
                  'clips.emptyAll',
                  {},
                  {
                    defaultValue: 'Nothing yanked yet. Hit "New clip" or copy something.',
                  },
                )}
          </p>
          {!filter.trim() && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className={cm.cn(
                cm.sp('px', 4),
                'min-h-[40px] mt-2 rounded-md text-sm font-semibold text-white hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              )}
              style={{ background: 'var(--color-primary)' }}
            >
              {t('clips.newClip', {}, { defaultValue: 'New clip' })}
            </button>
          )}
        </div>
      )}
    </>
  )

  return (
    <div className={cm.cn(cm.flex(), cm.h('screen'), 'overflow-hidden')}>
      {/* Pane 1 — list (full width on mobile; the detail pane swaps in
          when a clip is selected). */}
      <section
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'flex-1 min-w-0 lg:max-w-[640px] lg:min-w-[400px] border-outline-variant/40 lg:border-r bg-surface-container-low',
          isNarrow && active ? 'hidden' : 'flex',
        )}
      >
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 3),
            'border-b border-outline-variant/40 bg-surface-container-low/95 backdrop-blur-sm sticky top-0 z-10',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-1 min-w-0')}>
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-[18px] text-on-surface-variant')}
            >
              filter_list
            </span>
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label={t('clips.filterPlaceholder', {}, { defaultValue: 'Filter snippets…' })}
              placeholder={t('clips.filterPlaceholder', {}, { defaultValue: 'Filter snippets…' })}
              className={cm.cn(
                cm.w('full'),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'bg-transparent border-none outline-none focus:ring-0 placeholder:text-on-surface-variant/60 min-w-0 min-h-[36px]',
              )}
            />
          </div>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            aria-label={t('clips.newClip', {}, { defaultValue: 'New clip' })}
            aria-expanded={adding}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              'min-h-[36px] shrink-0',
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'rounded-md text-white hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            )}
            style={{ background: 'var(--color-primary)' }}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              add
            </span>
            <span className="hidden sm:inline">
              {t('clips.newClip', {}, { defaultValue: 'New clip' })}
            </span>
            <span className="sm:hidden sr-only">
              {t('clips.newClip', {}, { defaultValue: 'New clip' })}
            </span>
          </button>
          <KbdBadge className="hidden md:inline-flex">⌘K</KbdBadge>
        </header>

        {adding && (
          <form
            onSubmit={handleAdd}
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 3),
              'border-b border-outline-variant/40 bg-surface-container-lowest',
            )}
          >
            <textarea
              data-mol-id="clip-new-content"
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder={t(
                'clips.contentPlaceholder',
                {},
                { defaultValue: 'Paste or type a snippet…' },
              )}
              rows={3}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-md border border-outline-variant bg-surface-container-lowest font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              )}
            />
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                'flex-wrap',
              )}
            >
              <label
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  'text-on-surface-variant min-h-[36px]',
                )}
              >
                <input
                  type="checkbox"
                  checked={draftSensitive}
                  onChange={(e) => setDraftSensitive(e.target.checked)}
                />
                <span>
                  {t('clips.markSensitive', {}, { defaultValue: 'Encrypt as credential' })}
                </span>
              </label>
              <button
                type="submit"
                disabled={busy || !draftContent.trim()}
                className={cm.cn(
                  cm.sp('px', 4),
                  'min-h-[36px]',
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'rounded-md text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                )}
                style={{ background: 'var(--color-primary)' }}
              >
                {busy
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('clips.save', {}, { defaultValue: 'Save clip' })}
              </button>
            </div>
          </form>
        )}

        <div className={cm.cn('flex-1 overflow-y-auto', cm.sp('p', 3))}>{listBody}</div>
      </section>

      {/* Pane 2 — detail (full-screen view on mobile once a clip is
          selected, side pane on md+). */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'w-full lg:w-[420px] flex-shrink-0 bg-surface',
          isNarrow && !active ? 'hidden' : 'flex flex-1 lg:flex-none',
        )}
        data-mol-id="clip-detail-pane"
      >
        {active ? (
          <>
            <header
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 3),
                'border-b border-outline-variant/40',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0 flex-1')}>
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => selectClip('')}
                    aria-label={t('common.back', {}, { defaultValue: 'Back to list' })}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.roundedFull,
                      'h-10 w-10 -ml-2 shrink-0 text-on-surface-variant hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    )}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                      arrow_back
                    </span>
                  </button>
                )}
                <div className="min-w-0">
                  <CategoryPill category={active.category} />
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.textSize('xs'),
                      cm.sp('mt', 1),
                      'text-on-surface-variant',
                    )}
                  >
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                      {active.source.icon}
                    </span>
                    <span className="truncate">{active.source.label}</span>
                  </span>
                </div>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
                <button
                  onClick={() => void handleCopy()}
                  type="button"
                  aria-label={
                    copied
                      ? t('clips.copiedFeedback', {}, { defaultValue: 'Copied to clipboard' })
                      : t('clips.copyAction', {}, { defaultValue: 'Copy clip' })
                  }
                  data-mol-id="clip-copy"
                  className={cm.cn(iconBtn, copied && 'text-primary bg-primary-container/40')}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                  >
                    {copied ? 'check' : 'content_copy'}
                  </span>
                </button>
                <button
                  onClick={handleTogglePin}
                  type="button"
                  aria-pressed={active.isPinned}
                  aria-label={t('clips.pinAction', {}, { defaultValue: 'Pin clip' })}
                  className={cm.cn(iconBtn, active.isPinned ? 'text-on-surface' : undefined)}
                  style={active.isPinned ? { color: 'var(--color-icon-pin)' } : undefined}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                    style={active.isPinned ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    push_pin
                  </span>
                </button>
                <button
                  onClick={handleToggleFavorite}
                  type="button"
                  aria-pressed={active.isFavorite}
                  aria-label={t('clips.favoriteAction', {}, { defaultValue: 'Favorite clip' })}
                  data-mol-id="clip-favorite"
                  className={cm.cn(iconBtn, active.isFavorite ? 'text-on-surface' : undefined)}
                  style={active.isFavorite ? { color: 'var(--color-icon-pin)' } : undefined}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                    style={active.isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    star
                  </span>
                </button>
                <button
                  onClick={handleToggleEncrypt}
                  type="button"
                  aria-pressed={active.isSensitive}
                  aria-label={t('clips.encryptAction', {}, { defaultValue: 'Encrypt clip' })}
                  className={cm.cn(iconBtn, active.isSensitive ? 'text-on-surface' : undefined)}
                  style={active.isSensitive ? { color: 'var(--color-icon-lock)' } : undefined}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                  >
                    lock
                  </span>
                </button>
                <ConfirmButton
                  label={
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                    >
                      delete
                    </span>
                  }
                  confirmLabel={t(
                    'clips.deleteConfirmAction',
                    {},
                    { defaultValue: 'Confirm delete' },
                  )}
                  aria-label={t('clips.deleteAction', {}, { defaultValue: 'Delete clip' })}
                  onConfirm={() => void handleDelete()}
                  data-mol-id="clip-delete"
                  disabled={busy}
                  size="sm"
                  color="error"
                  variant="ghost"
                  className={cm.touchTargetCompact}
                />
              </div>
            </header>

            <div className={cm.cn(cm.sp('p', 4), 'flex-1 overflow-y-auto lg:p-5')}>
              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/40 group relative',
                )}
              >
                <pre
                  data-mol-id="clip-body"
                  className={cm.cn(
                    cm.textSize('sm'),
                    'font-mono leading-relaxed text-on-surface whitespace-pre-wrap break-words',
                  )}
                >
                  {active.body}
                </pre>
                <button
                  onClick={() => void handleCopy()}
                  type="button"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'absolute top-3 right-3 rounded-md text-white transition-opacity hidden lg:group-hover:opacity-100 lg:opacity-0 lg:flex',
                  )}
                  style={{ background: 'var(--color-primary)' }}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-[14px]')}
                  >
                    content_copy
                  </span>
                  <span>{t('common.copy', {}, { defaultValue: 'Copy' })}</span>
                </button>
                <span role="status" className="sr-only">
                  {copied
                    ? t('clips.copiedFeedback', {}, { defaultValue: 'Copied to clipboard' })
                    : ''}
                </span>
              </div>

              <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2', cm.sp('mt', 5))}>
                <div>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.sp('mb', 1),
                      'uppercase tracking-widest text-on-surface-variant/70 font-mono block',
                    )}
                  >
                    {t('clips.metaCreated', {}, { defaultValue: 'Created' })}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface')}>
                    {active.createdAt}
                  </span>
                </div>
                <div>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.sp('mb', 1),
                      'uppercase tracking-widest text-on-surface-variant/70 font-mono block',
                    )}
                  >
                    {t('clips.metaCharacters', {}, { defaultValue: 'Characters' })}
                  </span>
                  <span
                    data-mol-id="clip-char-count"
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface font-mono')}
                  >
                    {active.characters}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'md' }),
              cm.flex1,
              cm.textCenter,
              cm.sp('p', 8),
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant/40')}
            >
              inbox
            </span>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'clips.detailEmpty',
                {},
                { defaultValue: 'Pick a clip on the left to see it here.' },
              )}
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}

// Touch the categories endpoint type so future enhancements can reference it.
export type { ApiCategoryRow }

export default Clips
export { Clips as ClipsPage }
