import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface AgentRow {
  id: string
  name: string
  system_prompt: string
  voice_id: string | null
}

interface ConversationRow {
  id: string
  title: string
  updated_at: string
  total_seconds_spoken: number
  message_count: number
}

type Group = 'transcripts' | 'agents' | 'settings'

interface SearchResult {
  id: string
  group: Group
  title: string
  preview: string
  to: string
  meta?: string
}

const GROUP_DEFS: ReadonlyArray<{ key: Group; defaultLabel: string; icon: string }> = [
  { key: 'transcripts', defaultLabel: 'Transcripts', icon: 'forum' },
  { key: 'agents', defaultLabel: 'Agents', icon: 'smart_toy' },
  { key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
]

function formatMeta(c: ConversationRow): string {
  const m = Math.floor((c.total_seconds_spoken ?? 0) / 60)
  const s = (c.total_seconds_spoken ?? 0) % 60
  const dur = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${dur} · ${c.message_count ?? 0} msg`
}

function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [conversations, setConversations] = useState<ConversationRow[] | null>(null)
  const [agents, setAgents] = useState<AgentRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Honor the ⌘K / Ctrl+K hint shown inside the search field.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [convs, ags] = await Promise.all([
          http.get<ConversationRow[]>('/conversations'),
          http.get<AgentRow[]>('/agents'),
        ])
        if (cancelled) return
        setConversations(Array.isArray(convs.data) ? convs.data : [])
        setAgents(Array.isArray(ags.data) ? ags.data : [])
      } catch (e) {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('search.fetchError', {}, { defaultValue: 'Could not load search index.' }),
        )
        setConversations([])
        setAgents([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  const allResults = useMemo<ReadonlyArray<SearchResult>>(() => {
    const transcripts: SearchResult[] = (conversations ?? []).map((c) => ({
      id: `conv:${c.id}`,
      group: 'transcripts',
      title: c.title || t('status.untitled', {}, { defaultValue: 'Untitled' }),
      preview: t('search.transcriptPreview', {}, { defaultValue: 'Open transcript' }),
      to: `/history/${c.id}`,
      meta: formatMeta(c),
    }))
    const personas: SearchResult[] = (agents ?? []).map((a) => ({
      id: `agent:${a.id}`,
      group: 'agents',
      title: a.name,
      preview: a.system_prompt
        ? a.system_prompt.slice(0, 80)
        : t('search.agentPreview', {}, { defaultValue: 'No description' }),
      to: `/agents/${a.id}`,
    }))
    const staticSettings: SearchResult[] = [
      {
        id: 'settings.voice',
        group: 'settings',
        title: t('search.static.voice.title', {}, { defaultValue: 'Voice' }),
        preview: t(
          'search.static.voice.preview',
          {},
          { defaultValue: 'Default voice & language preferences' },
        ),
        to: '/settings',
      },
      {
        id: 'settings.billing',
        group: 'settings',
        title: t('search.static.billing.title', {}, { defaultValue: 'Billing' }),
        preview: t(
          'search.static.billing.preview',
          {},
          { defaultValue: 'Plans, payment method, and invoices' },
        ),
        to: '/settings/billing',
      },
      {
        id: 'settings.profile',
        group: 'settings',
        title: t('search.static.profile.title', {}, { defaultValue: 'Profile' }),
        preview: t(
          'search.static.profile.preview',
          {},
          { defaultValue: 'Display name, handle, bio' },
        ),
        to: '/profile',
      },
    ]
    return [...transcripts, ...personas, ...staticSettings]
  }, [conversations, agents, t])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allResults
    return allResults.filter(
      (r) => r.title.toLowerCase().includes(q) || r.preview.toLowerCase().includes(q),
    )
  }, [allResults, query])

  const loading = conversations === null || agents === null

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-foreground',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('px', 6),
          cm.sp('py', 6),
          'border-b border-border',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.textMuted,
            'uppercase tracking-widest font-semibold',
          )}
        >
          {t('search.eyebrow', {}, { defaultValue: 'Command palette' })}
        </span>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('search.title', { appName: APP_NAME }, { defaultValue: 'Search {{appName}}' })}
        </h1>
      </header>

      <main
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.stack(6),
          cm.sp('px', 6),
          cm.sp('py', 8),
          cm.mxAuto,
          cm.w('full'),
          'max-w-[860px]',
        )}
      >
        <label className={cm.cn(cm.position('relative'))}>
          <span className="sr-only">{t('common.search', {}, { defaultValue: 'Search' })}</span>
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-foreground-tertiary">
            search
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'search.placeholder',
              {},
              { defaultValue: 'Search transcripts, agents, settings…' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 4),
              cm.textSize('lg'),
              'rounded-2xl bg-surface border border-border pl-12 pr-4 text-foreground placeholder-foreground-tertiary focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-all',
            )}
          />
          <span
            aria-hidden="true"
            className={cm.cn(
              cm.position('absolute'),
              cm.fontWeight('bold'),
              'right-4 top-1/2 -translate-y-1/2 text-[11px] tracking-widest text-foreground-tertiary border border-border rounded px-2 py-0.5',
            )}
          >
            ⌘ K
          </span>
        </label>

        {loading ? (
          <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : (
          GROUP_DEFS.map((group) => {
            const items = filtered.filter((r) => r.group === group.key)
            if (items.length === 0) return null
            return (
              <section
                key={group.key}
                className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}
              >
                <h2
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.textMuted,
                    cm.sp('px', 2),
                    'uppercase tracking-widest',
                  )}
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    {group.icon}
                  </span>
                  {t(`search.group.${group.key}`, {}, { defaultValue: group.defaultLabel })}
                </h2>
                <ul
                  className={cm.cn('rounded-2xl bg-surface border border-border overflow-hidden')}
                >
                  {items.map((item) => (
                    <li key={item.id} className={cm.cn('border-b border-border last:border-b-0')}>
                      <Link
                        to={item.to}
                        className={cm.cn(
                          cm.flex({ direction: 'col' }),
                          cm.sp('px', 5),
                          cm.sp('py', 3),
                          'hover:bg-surface-secondary transition-colors',
                        )}
                      >
                        <span className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                          <span className={cm.cn(cm.fontWeight('semibold'))}>{item.title}</span>
                          {item.meta ? (
                            <span
                              className={cm.cn(cm.textSize('xs'), cm.textSubtle, 'tabular-nums')}
                            >
                              {item.meta}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.textMuted,
                            cm.sp('mt', 1),
                            'truncate',
                          )}
                        >
                          {item.preview}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })
        )}

        {!loading && filtered.length === 0 ? (
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              cm.sp('py', 16),
              cm.textCenter,
            )}
          >
            <span
              className={cm.cn(
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'h-16 w-16 bg-surface border border-border text-foreground-tertiary',
              )}
            >
              <span className="material-symbols-outlined text-[28px]">manage_search</span>
            </span>
            <p className={cm.cn(cm.fontWeight('semibold'))}>
              {t('search.emptyTitle', {}, { defaultValue: 'No matches' })}
            </p>
            <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
              {t(
                'search.emptyBody',
                {},
                { defaultValue: 'Try a different keyword or speak it out loud.' },
              )}
            </p>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 3),
              'rounded-xl bg-error/15 text-error border border-error/30',
            )}
          >
            {error}
          </p>
        ) : null}
      </main>
    </div>
  )
}

export default Search
export { Search, Search as SearchPage }
