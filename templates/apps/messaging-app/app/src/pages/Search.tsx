import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface SearchHit {
  id: string
  type: 'message' | 'conversation' | 'contact'
  display_text: string
  context: string
  conversation_id: string
  conversation_name: string
  matched_at: string
}

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(true)

  // Debounce server-side search so each keystroke doesn't fire a request.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const handle = window.setTimeout(
      () => {
        const q = query.trim()
        const url = q ? `/api/search?q=${encodeURIComponent(q)}` : '/api/search'
        http
          .get(url)
          .then((res) => {
            if (!cancelled) setHits(unwrapList<SearchHit>(res))
          })
          .finally(() => {
            if (!cancelled) setLoading(false)
          })
      },
      query ? 200 : 0,
    )
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [http, query])

  const filtered = useMemo(() => {
    // Server already filters, but keep client filter to react instantly
    // while debounce settles.
    const q = query.trim().toLowerCase()
    if (!q) return hits
    return hits.filter(
      (h) =>
        h.display_text.toLowerCase().includes(q) ||
        h.context.toLowerCase().includes(q) ||
        h.conversation_name.toLowerCase().includes(q),
    )
  }, [query, hits])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('search.eyebrow', {}, { defaultValue: 'On-device search' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('common.search', {}, { defaultValue: 'Search' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-surface-variant',
            cm.sp('mt', 1),
            cm.flex({ align: 'center', gap: 'xs' }),
          )}
        >
          <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
            lock
          </span>
          {t(
            'search.note',
            {},
            {
              defaultValue:
                'All searches are encrypted and run on-device. Nothing leaves your machine.',
            },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'relative')}>
        <span
          className="material-symbols-outlined absolute left-4 text-on-surface-variant pointer-events-none"
          aria-hidden="true"
        >
          search
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'search.placeholder',
            {},
            { defaultValue: 'Search messages, contacts, groups…' },
          )}
          className={cm.cn(
            cm.sp('pl', 12),
            cm.sp('pr', 4),
            cm.sp('py', 3),
            cm.textSize('base'),
            'w-full border border-outline-variant rounded-md',
          )}
        />
      </div>

      {!loading && filtered.length > 0 ? (
        <p
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-surface-variant',
            cm.fontWeight('medium'),
            'uppercase tracking-wider',
          )}
        >
          {t(
            'search.resultCount',
            { count: filtered.length },
            { defaultValue: '{{count}} matches' },
          )}
        </p>
      ) : null}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('search.empty', {}, { defaultValue: 'No matches.' })}
        </p>
      ) : (
        <ul className={'space-y-2'}>
          {filtered.map((h) => (
            <li key={h.id}>
              <Link
                to={
                  h.type === 'contact' ? `/contacts/${h.id}` : `/conversations/${h.conversation_id}`
                }
                className={cm.cn(cm.card(), cm.sp('p', 4), 'block hover:bg-surface-container')}
              >
                <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                      'uppercase tracking-wider',
                    )}
                  >
                    {t(`search.type.${h.type}`, {}, { defaultValue: h.type })}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'ml-auto')}>
                    {new Date(h.matched_at).toLocaleString()}
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mt', 1))}>
                  {h.conversation_name}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant',
                    cm.sp('mt', 1),
                    'line-clamp-2',
                  )}
                >
                  {h.context}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
