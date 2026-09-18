import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TeamMemberCard } from '../components/TeamMemberCard.js'

interface TeamMemberApi {
  id: string
  name: string
  role?: string | null
  department?: string | null
  email?: string | null
  slack_handle?: string | null
}

export function TeamDirectory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()
  const [members, setMembers] = useState<TeamMemberApi[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('All')
  // Seeded from ?q= so the app-shell search bar can deep-link into this page.
  const [query, setQuery] = useState(searchParams.get('q') ?? '')

  useEffect(() => {
    if (!http) return
    http
      .get<TeamMemberApi[]>('/api/team-members')
      .then((r) => setMembers(r.data ?? []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [http])

  const departments = useMemo(() => {
    const set = new Set<string>(['All'])
    for (const m of members) if (m.department) set.add(m.department)
    return Array.from(set)
  }, [members])

  const visible = useMemo(() => {
    return members
      .filter((m) => filter === 'All' || m.department === filter)
      .filter(
        (m) =>
          !query ||
          m.name.toLowerCase().includes(query.toLowerCase()) ||
          (m.role ?? '').toLowerCase().includes(query.toLowerCase()),
      )
  }, [members, filter, query])

  return (
    <div data-mol-id="page-team-directory" className={cm.flex({ direction: 'col', gap: 'lg' })}>
      <header>
        <p
          className="text-[11px] font-black uppercase tracking-[0.3em]"
          style={{ color: 'var(--mol-color-warning)' }}
        >
          {t('team.eyebrow', {}, { defaultValue: 'Onboarding · People' })}
        </p>
        <h1 className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 2), 'text-3xl tracking-tight')}>
          {t('team.title', {}, { defaultValue: 'Meet the humans on your team.' })}
        </h1>
        <p className={cm.cn(cm.textMuted, cm.sp('mt', 2), 'max-w-2xl')}>
          {t(
            'team.subtitle',
            {},
            {
              defaultValue:
                'Tap a card to see what someone works on, where they sit, and how to say hi.',
            },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap')}>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 4))}
          style={{
            flex: '1 1 320px',
            background: 'var(--color-surface, var(--mol-color-surface))',
            border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
            borderRadius: '999px',
            height: '44px',
          }}
        >
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: '20px' }}
          >
            search
          </span>
          <input
            type="search"
            placeholder={t(
              'team.searchPlaceholder',
              {},
              { defaultValue: 'Search by name or role…' },
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent outline-none"
            data-mol-id="team-search-input"
          />
        </div>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          {departments.map((d) => {
            const active = filter === d
            return (
              <button
                key={d}
                type="button"
                onClick={() => setFilter(d)}
                className={cm.cn(
                  'text-xs font-black uppercase tracking-[0.18em] transition-colors',
                )}
                style={{
                  padding: '8px 14px',
                  borderRadius: '999px',
                  background: active
                    ? 'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)'
                    : 'transparent',
                  color: active
                    ? 'var(--mol-color-surface)'
                    : 'var(--color-foreground-secondary, var(--mol-color-text-secondary))',
                  border: active
                    ? 'none'
                    : '1px solid var(--color-border, var(--mol-color-background-tertiary))',
                }}
              >
                {d === 'All' ? t('status.all', {}, { defaultValue: 'All' }) : d}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <p className={cm.textMuted}>
          {t('team.loading', {}, { defaultValue: 'Loading teammates…' })}
        </p>
      ) : visible.length === 0 ? (
        <div className={cm.cn(cm.emptyState, cm.sp('py', 12))}>
          <div className={cm.emptyStateIcon}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '40px', color: 'var(--mol-color-primary)' }}
            >
              group_off
            </span>
          </div>
          <p className={cm.emptyStateTitle}>
            {t('team.empty.title', {}, { defaultValue: 'No teammates match' })}
          </p>
          <p className={cm.emptyStateDescription}>
            {t(
              'team.empty.body',
              {},
              { defaultValue: 'Try a broader search or pick a different department.' },
            )}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '12px',
          }}
        >
          {visible.map((m) => (
            <TeamMemberCard
              key={m.id}
              id={m.id}
              name={m.name}
              role={m.role ?? ''}
              department={m.department ?? undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
