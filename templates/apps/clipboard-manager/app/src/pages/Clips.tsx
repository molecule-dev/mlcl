import { useCallback, useMemo, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CategoryPill, type ClipCategory } from '../components/CategoryPill.js'
import { KbdBadge } from '../components/KbdBadge.js'
import { type SnippetItem, SnippetRow } from '../components/SnippetRow.js'
import { useFetchList } from '../lib/use-fetch.js'

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
  const [activeId, setActiveId] = useState<string>('')
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [draftContent, setDraftContent] = useState('')
  const [draftSensitive, setDraftSensitive] = useState(false)
  const [busy, setBusy] = useState(false)

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
  const active =
    clipsState.data.find((c) => c.id === activeId)?.detail ?? visible[0]?.detail ?? null

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
    } catch (_error) {
      /* clipboard may be blocked in test envs */
    }
  }, [active, http])

  const handleTogglePin = useCallback(async () => {
    if (!active || busy) return
    setBusy(true)
    try {
      await http.post(`/api/clips/${active.id}/pin`, {})
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
      await clipsState.refetch()
    } catch (_error) {
      /* surfaced via fetch state on the next refetch */
    } finally {
      setBusy(false)
    }
  }, [active, busy, http, clipsState])

  const handleDelete = useCallback(async () => {
    if (!active || busy) return
    setBusy(true)
    try {
      await http.delete(`/api/clips/${active.id}`)
      setActiveId('')
      await clipsState.refetch()
    } finally {
      setBusy(false)
    }
  }, [active, busy, http, clipsState])

  return (
    <div className={cm.cn(cm.flex(), cm.h('screen'), 'overflow-hidden')}>
      {/* Pane 1 — list */}
      <section
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'flex-1 max-w-[640px] min-w-[400px] border-r border-outline-variant/40 bg-surface-container-low',
        )}
      >
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'border-b border-outline-variant/40 bg-surface-container-low/95 backdrop-blur-sm sticky top-0 z-10',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-1')}>
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
              placeholder={t('clips.filterPlaceholder', {}, { defaultValue: 'Filter snippets…' })}
              className={cm.cn(
                cm.w('full'),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'bg-transparent border-none outline-none focus:ring-0 placeholder:text-on-surface-variant/60',
              )}
            />
          </div>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            aria-label={t('clips.newClip', {}, { defaultValue: 'New clip' })}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'rounded-md text-white hover:opacity-90 transition-opacity',
            )}
            style={{ background: 'var(--color-primary)' }}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              add
            </span>
            {t('clips.newClip', {}, { defaultValue: 'New clip' })}
          </button>
          <KbdBadge>⌘K</KbdBadge>
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
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <label
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
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
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'rounded-md text-white disabled:opacity-50',
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

        <div className={cm.cn('flex-1 overflow-y-auto', cm.sp('p', 3))}>
          {clipsState.loading && clipsState.data.length === 0 && (
            <p
              className={cm.cn(
                cm.textCenter,
                cm.sp('py', 8),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t('clips.loading', {}, { defaultValue: 'Loading clips…' })}
            </p>
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
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('mb', 4))}>
                {pinned.map((s) => (
                  <SnippetRow
                    key={s.id}
                    snippet={s}
                    active={s.id === activeId}
                    onSelect={setActiveId}
                  />
                ))}
              </div>
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
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                {others.map((s) => (
                  <SnippetRow
                    key={s.id}
                    snippet={s}
                    active={s.id === activeId}
                    onSelect={setActiveId}
                  />
                ))}
              </div>
            </>
          )}

          {!clipsState.loading && visible.length === 0 && (
            <p
              className={cm.cn(
                cm.textCenter,
                cm.sp('py', 16),
                cm.textSize('sm'),
                'text-on-surface-variant',
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
          )}
        </div>
      </section>

      {/* Pane 2 — detail */}
      <aside
        className={cm.cn(cm.flex({ direction: 'col' }), 'w-[420px] flex-shrink-0 bg-surface')}
        data-mol-id="clip-detail-pane"
      >
        {active ? (
          <>
            <header
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 5),
                cm.sp('py', 3),
                'border-b border-outline-variant/40',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <CategoryPill category={active.category} />
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('xs'),
                    'text-on-surface-variant',
                  )}
                >
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                    {active.source.icon}
                  </span>
                  {active.source.label}
                </span>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                <button
                  onClick={handleCopy}
                  type="button"
                  aria-label={t('clips.copyAction', {}, { defaultValue: 'Copy clip' })}
                  className={cm.cn(
                    'w-8 h-8 rounded-md hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                  >
                    content_copy
                  </span>
                </button>
                <button
                  onClick={handleTogglePin}
                  type="button"
                  aria-pressed={active.isPinned}
                  aria-label={t('clips.pinAction', {}, { defaultValue: 'Pin clip' })}
                  className={cm.cn(
                    'w-8 h-8 rounded-md hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors',
                  )}
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
                  onClick={handleToggleEncrypt}
                  type="button"
                  aria-pressed={active.isSensitive}
                  aria-label={t('clips.encryptAction', {}, { defaultValue: 'Encrypt clip' })}
                  className={cm.cn(
                    'w-8 h-8 rounded-md hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors',
                  )}
                  style={active.isSensitive ? { color: 'var(--color-icon-lock)' } : undefined}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                  >
                    lock
                  </span>
                </button>
                <button
                  onClick={handleDelete}
                  type="button"
                  aria-label={t('clips.deleteAction', {}, { defaultValue: 'Delete clip' })}
                  className={cm.cn(
                    'w-8 h-8 rounded-md hover:bg-error-container/30 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                  >
                    delete
                  </span>
                </button>
              </div>
            </header>

            <div className={cm.cn(cm.sp('p', 5), 'flex-1 overflow-y-auto')}>
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
                    'font-mono leading-relaxed text-on-surface whitespace-pre-wrap',
                  )}
                >
                  {active.body}
                </pre>
                <button
                  onClick={handleCopy}
                  type="button"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'absolute top-3 right-3 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity',
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
