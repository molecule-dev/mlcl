import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'
import type { Donor } from '../types.js'

const TAGS = ['monthly-donor', 'major-donor', 'volunteer', 'board-member', 'lapsed', 'new'] as const

export function Donors() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Donor[]>([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/donors')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Donor>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('donors.loadError', {}, { defaultValue: 'Failed to load donors.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((d) => {
      if (tagFilter && !d.tags.includes(tagFilter)) return false
      if (!q) return true
      return d.name.toLowerCase().includes(q) || (d.email ?? '').toLowerCase().includes(q)
    })
  }, [list, search, tagFilter])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('donors.heading', {}, { defaultValue: 'Donors' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'donors.subheading',
              { count: visible.length, total: list.length },
              { defaultValue: '{{count}} of {{total}} donors' },
            )}
          </p>
        </div>
        <Link
          to="/donors/new"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          + {t('donors.addLabel', {}, { defaultValue: 'New donor' })}
        </Link>
      </header>

      <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('donors.searchPlaceholder', {}, { defaultValue: 'Name or email…' })}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'border border-outline-variant rounded-md w-full sm:w-auto sm:min-w-64',
            cm.textSize('sm'),
          )}
        />
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          aria-label={t('donors.filterByTag', {}, { defaultValue: 'Filter by tag' })}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'border border-outline-variant rounded-md',
            cm.textSize('sm'),
          )}
        >
          <option value="">{t('donors.allTags', {}, { defaultValue: 'All tags' })}</option>
          {TAGS.map((tg) => (
            <option key={tg} value={tg}>
              {t(`donors.tag.${tg}`, {}, { defaultValue: tg.replace(/-/g, ' ') })}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-lg bg-error-container text-on-error-container flex items-center justify-between gap-3 flex-wrap',
          )}
          role="alert"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null)
              setLoading(true)
              http
                .get('/donors')
                .then((res) => setList(unwrapList<Donor>(res)))
                .catch(() =>
                  setError(t('donors.loadError', {}, { defaultValue: 'Failed to load donors.' })),
                )
                .finally(() => setLoading(false))
            }}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'border border-current rounded-md',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : list.length === 0 ? (
        <div className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, cm.stack(3))}>
          <p className="text-on-surface-variant">
            {t('donors.emptyNoDonors', {}, { defaultValue: 'No donors on file yet.' })}
          </p>
          <Link
            to="/donors/new"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md self-center',
            )}
          >
            + {t('donors.addLabel', {}, { defaultValue: 'New donor' })}
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('donors.empty', {}, { defaultValue: 'No donors match.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
          <table className={'w-full text-left text-sm'}>
            <thead>
              <tr className={'border-b border-outline-variant'}>
                <Th>{t('donors.col.donor', {}, { defaultValue: 'Donor' })}</Th>
                <Th>{t('donors.col.contact', {}, { defaultValue: 'Contact' })}</Th>
                <Th>{t('donors.col.tags', {}, { defaultValue: 'Tags' })}</Th>
                <Th>{t('donors.col.lifetime', {}, { defaultValue: 'Lifetime giving' })}</Th>
                <Th>{t('donors.col.lastGift', {}, { defaultValue: 'Last gift' })}</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => (
                <tr
                  key={d.id}
                  className={'border-b border-outline-variant hover:bg-surface-container'}
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('medium'))}>
                    <Link to={`/donors/${d.id}`} className={cm.cn('inline-block', cm.sp('py', 1))}>
                      {d.name}
                    </Link>
                    {d.is_organization ? (
                      <span
                        className={cm.cn(
                          cm.sp('ml', 2),
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                        )}
                      >
                        {t('donors.organizationLabel', {}, { defaultValue: '· organization' })}
                      </span>
                    ) : null}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {d.email ?? '—'}
                    {d.phone ? ` · ${d.phone}` : ''}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <span className={'flex flex-wrap gap-1'}>
                      {d.tags.map((tg) => (
                        <span
                          key={tg}
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.sp('py', 1),
                            cm.textSize('xs'),
                            'rounded-full bg-surface-container text-on-surface-variant',
                          )}
                        >
                          {t(`donors.tag.${tg}`, {}, { defaultValue: tg.replace(/-/g, ' ') })}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('semibold'))}>
                    {formatMoney(d.lifetime_cents)}
                    <span
                      className={cm.cn(
                        cm.sp('ml', 1),
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                      )}
                    >
                      {t(
                        'donors.giftCount',
                        { count: d.gift_count },
                        { defaultValue: '({{count}} gifts)' },
                      )}
                    </span>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {d.last_gift_at ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <th
      className={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        'text-on-surface-variant',
        'uppercase tracking-wider',
      )}
    >
      {children}
    </th>
  )
}
