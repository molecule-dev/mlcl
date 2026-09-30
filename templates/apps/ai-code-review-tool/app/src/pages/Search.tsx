import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface PullRequestRow {
  id: string
  title: string
  repository_id: string | null
  head_ref: string | null
  state: string
  author_login: string | null
}

interface RepositoryRow {
  id: string
  full_name: string
  provider: string
}

interface CustomRuleRow {
  id: string
  name: string
  description: string | null
  pattern: string
  severity: string
  enabled: boolean
}

type SearchHit = {
  id: string
  type: 'pr' | 'repo' | 'rule'
  title: string
  excerpt: string
  href: string
  meta?: string
}

const TYPE_TINT: Record<
  SearchHit['type'],
  { bg: string; fg: string; label: string; icon: string }
> = {
  pr: { bg: 'bg-violet-500/15', fg: 'text-violet-600', label: 'PR', icon: 'merge' },
  repo: { bg: 'bg-cyan-500/15', fg: 'text-cyan-600', label: 'Repository', icon: 'storage' },
  rule: { bg: 'bg-emerald-500/15', fg: 'text-success', label: 'Rule', icon: 'gavel' },
}

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | SearchHit['type']>('all')
  const [prs, setPrs] = useState<PullRequestRow[]>([])
  const [repos, setRepos] = useState<RepositoryRow[]>([])
  const [rules, setRules] = useState<CustomRuleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Back the visible ⌘K hint with a real shortcut: Cmd/Ctrl+K focuses the query input.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/pull-requests').catch(() => null),
      http.get('/api/repositories').catch(() => null),
      http.get('/api/custom-rules').catch(() => null),
    ])
      .then(([prRes, repoRes, ruleRes]) => {
        if (cancelled) return
        setPrs(unwrapList<PullRequestRow>(prRes))
        setRepos(unwrapList<RepositoryRow>(repoRes))
        setRules(unwrapList<CustomRuleRow>(ruleRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('search.loadError', {}, { defaultValue: 'Failed to load search index.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const repoNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of repos) map.set(r.id, r.full_name)
    return map
  }, [repos])

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const all: SearchHit[] = []
    for (const pr of prs) {
      const repoName = pr.repository_id ? (repoNameById.get(pr.repository_id) ?? '') : ''
      const hay =
        `${pr.title} ${pr.head_ref ?? ''} ${pr.author_login ?? ''} ${repoName}`.toLowerCase()
      if (!needle || hay.includes(needle)) {
        all.push({
          id: `pr-${pr.id}`,
          type: 'pr',
          title: pr.title,
          excerpt: `${repoName}${pr.head_ref ? ` · ${pr.head_ref}` : ''}`,
          href: `/prs/${pr.id}`,
          meta: pr.author_login ?? undefined,
        })
      }
    }
    for (const repo of repos) {
      const hay = `${repo.full_name} ${repo.provider}`.toLowerCase()
      if (!needle || hay.includes(needle)) {
        all.push({
          id: `repo-${repo.id}`,
          type: 'repo',
          title: repo.full_name,
          excerpt: repo.provider,
          href: `/repos/${repo.id}`,
        })
      }
    }
    for (const rule of rules) {
      const hay = `${rule.name} ${rule.description ?? ''} ${rule.pattern}`.toLowerCase()
      if (!needle || hay.includes(needle)) {
        all.push({
          id: `rule-${rule.id}`,
          type: 'rule',
          title: rule.name,
          excerpt: rule.description ?? rule.pattern,
          href: '/rules',
          meta: `${rule.severity} · ${rule.enabled ? 'enabled' : 'disabled'}`,
        })
      }
    }
    return all
  }, [q, prs, repos, repoNameById, rules])

  const grouped = useMemo(() => {
    return (['pr', 'repo', 'rule'] as const).map((type) => ({
      type,
      items: hits.filter((h) => h.type === type),
    }))
  }, [hits])

  const visibleGrouped = useMemo(
    () => (typeFilter === 'all' ? grouped : grouped.filter((g) => g.type === typeFilter)),
    [grouped, typeFilter],
  )

  const typeCounts = useMemo(
    () => ({
      all: hits.length,
      pr: hits.filter((h) => h.type === 'pr').length,
      repo: hits.filter((h) => h.type === 'repo').length,
      rule: hits.filter((h) => h.type === 'rule').length,
    }),
    [hits],
  )

  const FILTER_CHIPS = [
    { key: 'all' as const, label: 'All' },
    { key: 'pr' as const, label: 'Pull requests' },
    { key: 'repo' as const, label: 'Repositories' },
    { key: 'rule' as const, label: 'Rules' },
  ]

  return (
    <div className={cm.cn(cm.flex1, cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary font-mono',
          )}
        >
          {t(
            'search.eyebrow',
            { appName: APP_NAME },
            { defaultValue: '{{appName}} · global search' },
          )}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 1),
            'tracking-tight',
          )}
        >
          {t('common.search', {}, { defaultValue: 'Search' })}
        </h1>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('p', 4),
          'rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm',
        )}
      >
        <span
          className="material-symbols-outlined text-on-surface-variant text-[20px]"
          aria-hidden="true"
        >
          search
        </span>
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t(
            'search.placeholder',
            {},
            { defaultValue: 'Search PRs, repositories, rules…' },
          )}
          className={cm.cn(
            'flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm font-mono text-on-surface placeholder:text-on-surface-variant',
          )}
        />
        <span
          className={cm.cn(
            cm.sp('px', 2),
            cm.sp('py', 1),
            'text-[10px] font-mono uppercase tracking-widest text-on-surface-variant rounded bg-surface-container',
          )}
        >
          {t('search.kbd', {}, { defaultValue: '⌘K' })}
        </span>
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <>
          <section
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm',
            )}
            aria-labelledby="search-result-type-heading"
            data-mol-id="search-result-type"
          >
            <h3
              id="search-result-type-heading"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 3),
                'uppercase tracking-widest text-on-surface-variant font-mono',
              )}
            >
              {t('search.resultTypeHeading', {}, { defaultValue: 'Result type' })}
            </h3>
            <div className={cm.cn(cm.flex({ gap: 'xs', wrap: 'wrap' }))} role="group">
              {FILTER_CHIPS.map((chip) => {
                const active = typeFilter === chip.key
                const count = typeCounts[chip.key]
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setTypeFilter(chip.key)}
                    aria-pressed={active}
                    disabled={chip.key !== 'all' && count === 0}
                    data-mol-id={`search-filter-${chip.key}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 3),
                      'min-h-[36px] text-[10px] font-extrabold uppercase tracking-widest font-mono rounded-md transition-colors disabled:opacity-40',
                      active
                        ? 'bg-primary text-white'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                    )}
                  >
                    {t(`search.filter.${chip.key}`, {}, { defaultValue: chip.label })}
                    <span
                      className={cm.cn(
                        'px-1.5 py-0.5 rounded tabular-nums',
                        active ? 'bg-white/20' : 'bg-surface-container',
                      )}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {hits.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
              {q
                ? t('search.empty', {}, { defaultValue: 'No results match your query.' })
                : t(
                    'search.indexEmpty',
                    {},
                    { defaultValue: 'Connect a repository or add custom rules to start indexing.' },
                  )}
            </p>
          ) : visibleGrouped.every((group) => group.items.length === 0) ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
              {t('search.empty', {}, { defaultValue: 'No results match your query.' })}
            </p>
          ) : (
            visibleGrouped.map((group) => {
              const tint = TYPE_TINT[group.type]
              if (group.items.length === 0) return null
              return (
                <section key={group.type} className={cm.stack(3)}>
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <h2
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-widest text-on-surface-variant font-mono',
                      )}
                    >
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                        {tint.icon}
                      </span>
                      {t(`search.group.${group.type}`, {}, { defaultValue: tint.label })}
                    </h2>
                    <span
                      className={cm.cn(
                        'text-[10px] font-mono tabular-nums text-on-surface-variant',
                      )}
                      data-mol-id={`search-count-${group.type}`}
                    >
                      {t(
                        'search.groupCount',
                        { count: group.items.length },
                        { defaultValue: '({{count}})' },
                      )}
                    </span>
                  </div>
                  <ul
                    className={cm.cn(
                      'divide-y divide-outline-variant/30 bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/30',
                    )}
                  >
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <Link
                          to={item.href}
                          className={cm.cn(
                            cm.flex({ direction: 'col', gap: 'sm' }),
                            cm.sp('px', 5),
                            cm.sp('py', 4),
                            'group hover:bg-surface-container-low transition-colors',
                          )}
                        >
                          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                            <span
                              className={cm.cn(
                                'px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest font-mono',
                                tint.bg,
                                tint.fg,
                              )}
                            >
                              {t(`search.type.${item.type}`, {}, { defaultValue: tint.label })}
                            </span>
                            <span
                              className={cm.cn(
                                cm.textSize('sm'),
                                cm.fontWeight('bold'),
                                'group-hover:text-primary transition-colors text-on-surface truncate',
                              )}
                            >
                              {item.title}
                            </span>
                            {item.meta ? (
                              <span className="ml-auto text-[10px] font-mono text-on-surface-variant">
                                {item.meta}
                              </span>
                            ) : null}
                          </div>
                          <p
                            className={cm.cn(
                              cm.textSize('xs'),
                              'text-on-surface-variant leading-relaxed',
                            )}
                          >
                            {item.excerpt}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })
          )}
        </>
      )}
    </div>
  )
}
