/**
 * TeamDirectory — /people company-wide directory.
 *
 * Reads the live team roster from /api/team. Filtering by department is
 * preserved as best-effort (the v1 schema does not store department, so
 * the filter only renders when at least one teammate carries a role
 * string we can use as the bucket).
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface TeamMember {
  id: string
  name: string
  email: string | null
  username: string | null
  role: string | null
  isAdmin: boolean
  isMe: boolean
}

export function TeamDirectory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<TeamMember[]>('/team')
      .then((r) => {
        if (cancelled) return
        setTeam(Array.isArray(r.data) ? r.data : [])
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const departments = useMemo(() => {
    const set = new Set<string>()
    team.forEach((m) => {
      if (m.role && m.role.trim()) set.add(m.role.trim())
    })
    return ['all', ...Array.from(set).sort()]
  }, [team])

  const visible = useMemo(() => {
    return team.filter((m) => {
      if (department !== 'all' && (m.role ?? '') !== department) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        return [m.name, m.role ?? '', m.email ?? '', m.username ?? ''].some((v) =>
          v.toLowerCase().includes(q),
        )
      }
      return true
    })
  }, [query, department, team])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-primary',
          )}
        >
          {t('people.eyebrow', { company: APP_NAME }, { defaultValue: '{{company}} · directory' })}
        </span>
        <h1
          data-testid="people-title"
          className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}
        >
          {t(
            'people.title',
            { count: team.length },
            { defaultValue: '{{count}} teammates and counting' },
          )}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl leading-relaxed')}>
          {t(
            'people.subtitle',
            {},
            {
              defaultValue: 'Search by name, role, or email. Click anyone to see their profile.',
            },
          )}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-error/40 bg-error-container/40 text-on-error-container',
          )}
        >
          {error}
        </div>
      )}

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('p', 3),
          'rounded-2xl border border-outline-variant/40 bg-surface',
        )}
      >
        <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
          search
        </span>
        <input
          type="search"
          data-testid="people-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('people.searchPlaceholder', {}, { defaultValue: 'Search teammates…' })}
          className={cm.cn(
            cm.textSize('base'),
            'flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none',
          )}
        />
      </div>

      {departments.length > 1 && (
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          {departments.map((d) => {
            const isActive = department === d
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDepartment(d)}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  cm.sp('px', 3),
                  'py-1.5',
                  'rounded-full transition-colors',
                  isActive
                    ? 'bg-primary text-on-primary'
                    : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/60',
                )}
              >
                {d === 'all' ? t('people.deptAll', {}, { defaultValue: 'All roles' }) : d}
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('people.loading', {}, { defaultValue: 'Loading teammates…' })}
        </p>
      ) : visible.length === 0 ? (
        <div
          data-testid="people-empty"
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.sp('py', 16),
            'text-center text-on-surface-variant',
          )}
        >
          <span className="material-symbols-outlined text-5xl" aria-hidden="true">
            group
          </span>
          <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('people.empty', {}, { defaultValue: 'No teammates match this search.' })}
          </p>
        </div>
      ) : (
        <div
          data-testid="people-grid"
          className={cm.cn('grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
        >
          {visible.map((m) => (
            <Link
              key={m.id}
              to={m.isMe ? '/profile' : `/feed?author=${encodeURIComponent(m.id)}`}
              data-testid={`people-row-${m.id}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('p', 4),
                'rounded-xl border border-outline-variant/40 bg-surface group hover:-translate-y-0.5 hover:shadow-sm transition-all',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(12),
                  cm.h(12),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  'shrink-0 text-base',
                )}
                style={{
                  backgroundColor:
                    'var(--color-priority-normal-light, var(--color-priority-normal-light))',
                  color: 'var(--color-priority-normal, var(--color-priority-normal))',
                }}
                aria-hidden="true"
              >
                {m.name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0 flex-1')}>
                <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'text-on-surface group-hover:text-primary transition-colors truncate',
                    )}
                  >
                    {m.name}
                  </span>
                  {m.isAdmin && (
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'rounded-full px-1.5 py-0 text-[9px] uppercase tracking-widest',
                      )}
                      style={{
                        backgroundColor:
                          'var(--color-priority-pinned-light, var(--color-priority-pinned-light))',
                        color: 'var(--color-priority-pinned, var(--color-priority-pinned))',
                      }}
                    >
                      {t('people.adminBadge', {}, { defaultValue: 'Admin' })}
                    </span>
                  )}
                  {m.isMe && (
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'rounded-full px-1.5 py-0 text-[9px] uppercase tracking-widest text-primary bg-primary/10',
                      )}
                    >
                      {t('nav.you', {}, { defaultValue: 'You' })}
                    </span>
                  )}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                  {m.role ?? m.email ?? m.username ?? '—'}
                </span>
                {m.email && m.email !== m.role && (
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                    {m.email}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default TeamDirectory
