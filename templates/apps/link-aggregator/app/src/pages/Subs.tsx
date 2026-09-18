import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CairnHeroCard } from '../components/CairnHeroCard.js'
import { SubBadge, type SubSummary } from '../components/SubBadge.js'

export function Subs() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [subs, setSubs] = useState<SubSummary[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    http
      .get<{ data?: unknown }>('/api/subs')
      .then((res) => {
        if (!active) return
        const envelope = (res as { data?: unknown }).data
        const inner =
          envelope && typeof envelope === 'object' && 'data' in (envelope as object)
            ? (envelope as { data: unknown }).data
            : envelope
        setSubs(normalize(inner))
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof Error
            ? err.message
            : t('subs.loadError', {}, { defaultValue: 'Failed to load subs.' }),
        )
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [http, t])

  const filtered = subs.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))

  const join = async (slug: string) => {
    const target = subs.find((s) => s.slug === slug)
    const wasJoined = !!target?.joined
    setSubs((prev) =>
      prev.map((s) =>
        s.slug === slug
          ? {
              ...s,
              joined: !wasJoined,
              member_count: (s.member_count ?? 0) + (wasJoined ? -1 : 1),
            }
          : s,
      ),
    )
    try {
      const res = await http.post<{ joined: boolean; member_count: number }>(
        `/api/subs/${slug}/${wasJoined ? 'leave' : 'join'}`,
      )
      const data = (res as { data?: { joined?: boolean; member_count?: number } })?.data
      if (data) {
        setSubs((prev) =>
          prev.map((s) =>
            s.slug === slug
              ? {
                  ...s,
                  joined: typeof data.joined === 'boolean' ? data.joined : !wasJoined,
                  member_count:
                    typeof data.member_count === 'number' ? data.member_count : s.member_count,
                }
              : s,
          ),
        )
      }
    } catch (_error) {
      // Optimistic revert — server rejected the join/leave; restore prior membership state.
      setSubs((prev) =>
        prev.map((s) =>
          s.slug === slug
            ? {
                ...s,
                joined: wasJoined,
                member_count: (s.member_count ?? 0) + (wasJoined ? 1 : -1),
              }
            : s,
        ),
      )
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <CairnHeroCard
        eyebrowKey="eyebrow"
        eyebrowDefault={t('subs.heroEyebrow', {}, { defaultValue: 'Sub-communities' })}
        headlineKey="headline"
        headlineDefault={t(
          'subs.heroHeadline',
          {},
          { defaultValue: 'Choose your stones. Build your cairn.' },
        )}
        bodyKey="body"
        bodyDefault={t(
          'subs.heroBody',
          {},
          {
            defaultValue:
              'Each sub is a small, focused community. Join a few \u2014 your feed only shows what you opt into.',
          },
        )}
        pillKey="pill"
        pillIcon="group"
        pillDefault={t(
          'subs.heroPill',
          { count: subs.length },
          { defaultValue: '{{count}} active subs' },
        )}
      />

      <section
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 4),
          cm.roundedFull,
          'bg-surface-container-low border border-outline-variant/30 focus-within:border-primary',
        )}
      >
        <span className={'material-symbols-outlined text-base text-on-surface-variant'}>
          search
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('subs.searchPlaceholder', {}, { defaultValue: 'Search subs\u2026' })}
          className={cm.cn(
            cm.sp('py', 2),
            cm.textSize('sm'),
            'flex-1 bg-transparent outline-none text-on-surface',
          )}
        />
      </section>

      <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2 lg:grid-cols-3')}>
        {loading && filtered.length === 0 ? (
          <p className={cm.cn(cm.textCenter, cm.sp('py', 8), 'text-on-surface-variant')}>
            {t('subs.loading', {}, { defaultValue: 'Gathering subs\u2026' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.textCenter, cm.sp('py', 8), 'text-error')} role="alert">
            {error}
          </p>
        ) : filtered.length === 0 ? (
          <p className={cm.cn(cm.textCenter, cm.sp('py', 8), 'text-on-surface-variant')}>
            {t('subs.empty', {}, { defaultValue: 'No subs yet \u2014 be the first to start one.' })}
          </p>
        ) : (
          filtered.map((s) => <SubBadge key={s.slug} sub={s} onJoin={join} />)
        )}
      </div>
    </div>
  )
}

function normalize(raw: unknown): SubSummary[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row) => {
    const r = row as Record<string, unknown>
    return {
      slug: String(r.slug ?? ''),
      name: String(r.name ?? r.slug ?? ''),
      description: typeof r.description === 'string' ? r.description : undefined,
      member_count: Number(r.member_count ?? r.memberCount ?? 0),
      post_count: typeof r.post_count === 'number' ? r.post_count : undefined,
      joined: Boolean(r.joined),
    }
  })
}

export default Subs
