import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ApiAnnouncement, timeAgo } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

/**
 * Compact announcements feed — author chip, title + body, and a relative
 * timestamp. Pulls live data from `/api/announcements`. While the request
 * is in flight a friendly placeholder is shown so the layout doesn't
 * jump.
 */
export type AnnouncementTone = 'info' | 'success' | 'warning' | 'error'

export interface AnnouncementItem {
  id: string
  icon: string
  title: string
  body: string
  timeLabel: string
  tone?: AnnouncementTone
  category?: string
}

export interface AnnouncementsFeedProps {
  items?: readonly AnnouncementItem[]
  title?: string
}

const TONE_BG: Record<AnnouncementTone, string> = {
  info: 'bg-primary/10 text-primary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  error: 'bg-rose-100 text-error',
}

function categoryFor(audience: ApiAnnouncement['audience']): {
  tone: AnnouncementTone
  label: string
} {
  if (audience === 'school') return { tone: 'info', label: 'School news' }
  if (audience === 'class') return { tone: 'success', label: 'Class update' }
  return { tone: 'warning', label: 'Personal' }
}

export function AnnouncementsFeed({ items, title }: AnnouncementsFeedProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [fetched, setFetched] = useState<AnnouncementItem[] | null>(null)
  const [loading, setLoading] = useState(items ? false : true)

  useEffect(() => {
    if (items) return
    let cancelled = false
    setLoading(true)
    http
      .get('/api/announcements')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<ApiAnnouncement>(res).map((a) => {
          const cat = categoryFor(a.audience)
          return {
            id: a.id,
            icon: a.icon ?? 'campaign',
            title: a.title,
            body: a.body ?? '',
            timeLabel: timeAgo(a.created_at),
            tone: cat.tone,
            category: cat.label,
          }
        })
        setFetched(list)
      })
      .catch(() => setFetched([]))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, items])

  const data: readonly AnnouncementItem[] = items ?? fetched ?? []

  return (
    <section
      data-mol-id="announcements-feed"
      className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
    >
      <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
          {title ?? t('announcementsFeed.title', {}, { defaultValue: 'Latest announcements' })}
        </h2>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'font-bold uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t(
            'announcementsFeed.eyebrow',
            { count: data.length },
            { defaultValue: '{{count}} updates' },
          )}
        </span>
      </header>
      {loading ? (
        <p
          className={cm.cn(
            cm.sp('py', 6),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : data.length === 0 ? (
        <p
          className={cm.cn(
            cm.sp('py', 6),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          {t('announcementsFeed.empty', {}, { defaultValue: 'No announcements yet.' })}
        </p>
      ) : (
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          {data.map((item) => {
            const tone = item.tone ?? 'info'
            return (
              <li
                key={item.id}
                data-mol-id={`announcement-${item.id}`}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'md' }),
                  cm.sp('py', 3),
                  'border-b border-outline-variant/30 last:border-b-0',
                )}
              >
                <span
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    'shrink-0',
                    TONE_BG[tone],
                  )}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined')}>{item.icon}</span>
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <div
                    className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}
                  >
                    <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface truncate')}>
                      {item.title}
                    </p>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'shrink-0 text-on-surface-variant tabular-nums',
                      )}
                    >
                      {item.timeLabel}
                    </span>
                  </div>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.sp('mt', 1),
                      'text-on-surface-variant leading-relaxed',
                    )}
                  >
                    {item.body}
                  </p>
                  {item.category && (
                    <span
                      className={cm.cn(
                        cm.sp('mt', 2),
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.roundedFull,
                        'inline-block text-[10px] font-black uppercase tracking-widest bg-surface-container text-on-surface-variant',
                      )}
                    >
                      {item.category}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default AnnouncementsFeed
