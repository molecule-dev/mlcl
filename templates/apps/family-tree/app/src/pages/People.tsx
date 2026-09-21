import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PersonCard } from '../components/PersonCard.js'
import type { Person } from '../lib/people.js'
import { unwrapList } from '../lib/unwrap.js'

export function People() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
    http
      .get(`/api/people${qs}`)
      .then((res) => {
        if (cancelled) return
        setPeople(unwrapList<Person>(res) ?? [])
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('people.loadError', {}, { defaultValue: 'Failed to load people.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, reload])

  const livingCount = useMemo(() => people.filter((p) => !p.death_date).length, [people])

  return (
    <div className={cm.cn(cm.sp('p', 6), 'lg:p-8')} data-mol-id="page-people">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('people.title', {}, { defaultValue: 'People' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'people.subtitle',
              { total: people.length, living: livingCount },
              { defaultValue: '{{total}} people · {{living}} living' },
            )}
          </p>
        </div>
        <Link
          to="/people/new"
          data-mol-id="people-add"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            'text-white rounded-lg hover:shadow-lg transition-all',
          )}
          style={{ background: 'linear-gradient(135deg, #15803d, #65a30d)' }}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            person_add
          </span>
          {t('people.addPerson', {}, { defaultValue: 'Add person' })}
        </Link>
      </div>

      <div className={cm.cn(cm.maxW('md'), cm.sp('mb', 6))}>
        <label htmlFor="people-search" className="sr-only">
          {t('people.searchLabel', {}, { defaultValue: 'Search people' })}
        </label>
        <div className={cm.cn('relative')}>
          <span
            className={cm.cn(
              'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline',
            )}
            aria-hidden="true"
          >
            search
          </span>
          <input
            id="people-search"
            type="search"
            data-mol-id="people-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('people.searchPlaceholder', {}, { defaultValue: 'Search by name…' })}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.sp('pl', 12),
              cm.sp('pr', 5),
              cm.textSize('sm'),
              'bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
            )}
          />
        </div>
      </div>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : error ? (
        <div
          className={cm.cn(
            cm.sp('py', 8),
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          )}
        >
          <p className="text-error font-bold">{error}</p>
          <button
            type="button"
            data-mol-id="people-retry"
            onClick={() => setReload((n) => n + 1)}
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-lg border border-outline-variant/50 bg-surface-container-lowest hover:bg-surface-container transition-colors',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Try again' })}
          </button>
        </div>
      ) : people.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 10),
            'rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/60 text-center',
          )}
        >
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
            {query
              ? t(
                  'people.noMatches',
                  {},
                  {
                    defaultValue:
                      'No one matches that search — try another spelling or maiden name.',
                  },
                )
              : t(
                  'people.empty',
                  {},
                  { defaultValue: 'No people yet — add the first person to start the tree.' },
                )}
          </p>
        </div>
      ) : (
        <div
          className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3')}
          data-mol-id="people-list"
        >
          {people.map((p) => (
            <PersonCard key={p.id} person={p} variant="list" />
          ))}
        </div>
      )}
    </div>
  )
}

export default People
