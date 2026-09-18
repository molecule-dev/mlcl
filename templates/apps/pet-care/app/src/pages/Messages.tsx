import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface ApiBooking {
  id: string
  service?: string
  status?: string
  start_date?: string
  starts_at?: string
  sitter_name?: string
  pet_name?: string
}

/**
 * Messaging is per-booking — each booking has its own thread between
 * owner and sitter. This page lists every booking the user has and
 * routes to the booking detail page (which renders the thread + send
 * form). Bookings are sorted with active/upcoming first.
 */
export function Messages() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [bookings, setBookings] = useState<ApiBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/bookings?limit=100')
      .then((res) => {
        if (cancelled) return
        setBookings(unwrapList<ApiBooking>(res))
      })
      .catch((err: unknown) => {
        console.error('[Messages] failed to load bookings', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const sorted = [...bookings].sort((a, b) => {
    const sa = a.status === 'completed' || a.status === 'cancelled' ? 1 : 0
    const sb = b.status === 'completed' || b.status === 'cancelled' ? 1 : 0
    if (sa !== sb) return sa - sb
    const ta = new Date(a.start_date || a.starts_at || 0).getTime()
    const tb = new Date(b.start_date || b.starts_at || 0).getTime()
    return tb - ta
  })

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-messages">
      <div className={cm.cn(cm.sp('mb', 6))}>
        <p
          className={cm.cn(
            'text-[10px] font-bold uppercase tracking-widest text-primary-dark dark:text-primary mb-1',
          )}
        >
          {t('nav.inbox', {}, { defaultValue: 'Inbox' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.messages', {}, { defaultValue: 'Messages' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'messages.subtitle',
            {},
            {
              defaultValue:
                'Each booking has its own thread. Pick a booking to chat with the sitter.',
            },
          )}
        </p>
      </div>

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : sorted.length === 0 ? (
        <div
          className={cm.cn(cm.textCenter, cm.sp('py', 12), 'rounded-xl bg-surface-container-low')}
          data-mol-id="messages-empty"
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-6xl text-primary mb-2 block opacity-50',
            )}
          >
            chat
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {t('messages.empty.title', {}, { defaultValue: 'No conversations yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'messages.empty.body',
              {},
              { defaultValue: 'Book a sitter to start a conversation.' },
            )}
          </p>
          <Link
            to="/sitters"
            className={cm.cn(
              cm.sp('mt', 4),
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-xl text-white inline-flex',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
            }}
          >
            {t('messages.findSitter', {}, { defaultValue: 'Find a sitter' })}
          </Link>
        </div>
      ) : (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          {sorted.map((b) => {
            const initials = (b.sitter_name || 'S')
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()
            const startsAt = b.start_date || b.starts_at
            const dateLabel = startsAt
              ? new Date(startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : ''
            return (
              <Link
                key={b.id}
                to={`/bookings/${b.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('p', 4),
                  'rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors',
                )}
                data-mol-id={`message-thread-${b.id}`}
              >
                <span
                  className={cm.cn(
                    cm.shrink0,
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    'w-10 h-10 text-white text-xs font-bold',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
                  }}
                  aria-hidden="true"
                >
                  {initials}
                </span>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'truncate')}>
                    {b.sitter_name || t('messages.sitterFallback', {}, { defaultValue: 'Sitter' })}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                    {[b.service, b.pet_name].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div
                  className={cm.cn(
                    cm.shrink0,
                    cm.flex({ direction: 'col', align: 'end', gap: 'xs' }),
                  )}
                >
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {dateLabel}
                  </span>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'px-2 py-0.5 text-[10px] uppercase tracking-widest rounded-full bg-surface-container-high text-on-surface-variant',
                    )}
                  >
                    {t(
                      `bookingTimelineEntry.status.${b.status || 'pending'}`,
                      {},
                      { defaultValue: (b.status || 'pending').replace('_', ' ') },
                    )}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
