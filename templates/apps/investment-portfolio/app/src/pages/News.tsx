import { useEffect, useState } from 'react'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface NewsItem {
  id: string
  title: string
  source: string
  url: string
  summary: string
  published_at: string
  related_symbols: string[]
}

function fmtAgo(iso: string, t: TranslateFunction): string {
  const date = new Date(iso)
  const now = new Date()
  const diffH = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return t('news.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24) return t('news.hoursAgo', { count: diffH }, { defaultValue: '{{count}}h ago' })
  return t('news.daysAgo', { count: Math.floor(diffH / 24) }, { defaultValue: '{{count}}d ago' })
}

export function News() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/news')
      .then((res) => {
        if (!cancelled) setItems(unwrapList<NewsItem>(res))
      })
      .catch(() => {
        if (!cancelled) setError(t('news.loadError', {}, { defaultValue: 'Failed to load news.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('news.heading', {}, { defaultValue: 'News' })}
      </h1>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('news.empty', {}, { defaultValue: 'No news.' })}
        </p>
      ) : (
        <ul className={cm.cn('space-y-3 max-w-4xl')}>
          {items.map((n) => (
            <li key={n.id} className={cm.cn(cm.card(), cm.sp('p', 5))}>
              <header
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('mb', 2),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                )}
              >
                <span className={cm.cn(cm.fontWeight('semibold'), 'uppercase tracking-wide')}>
                  {n.source}
                </span>
                <span>{fmtAgo(n.published_at, t)}</span>
              </header>
              <a
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('semibold'),
                  'hover:underline block',
                )}
              >
                {n.title}
              </a>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                {n.summary}
              </p>
              {n.related_symbols.length > 0 ? (
                <div className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('mt', 3))}>
                  {n.related_symbols.map((s) => (
                    <span
                      key={s}
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'rounded-full font-mono',
                        'bg-primary-container',
                        cm.textPrimary,
                      )}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
