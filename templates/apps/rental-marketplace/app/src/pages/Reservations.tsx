import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface Reservation {
  id: string
  listing_id: string
  listing_title: string
  thumbnail_url?: string | null
  guest_name: string | null
  guest_photo: string | null
  guest_country: string | null
  guest_trips_completed: number
  check_in_iso: string
  check_out_iso: string
  nights: number
  guests: number
  total_cents: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  instant_book: boolean
  expires_at?: string | null
}

const TABS = ['pending', 'confirmed', 'history'] as const
type Tab = (typeof TABS)[number]

const STATUS_THEME: Record<Reservation['status'], { className: string; label: string }> = {
  pending: { className: 'bg-warning-light text-warning', label: 'Awaiting reply' },
  confirmed: { className: 'bg-success-light text-success', label: 'Confirmed' },
  cancelled: { className: 'bg-rose-100 text-error', label: 'Cancelled' },
  completed: { className: 'bg-surface-secondary text-foreground-secondary', label: 'Completed' },
}

function fmtPrice(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`
}
function fmtRange(checkIn: string, checkOut: string) {
  const a = new Date(checkIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const b = new Date(checkOut).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${a} – ${b}`
}

export function Reservations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('pending')
  const [acting, setActing] = useState<string | null>(null)

  const refresh = async (): Promise<void> => {
    const res = await http.get('/api/reservations')
    setReservations(unwrapList<Reservation>(res.data))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/reservations')
      .then((res) => {
        if (!cancelled) setReservations(unwrapList<Reservation>(res.data))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const visible = useMemo(() => {
    if (tab === 'pending') return reservations.filter((r) => r.status === 'pending')
    if (tab === 'confirmed') return reservations.filter((r) => r.status === 'confirmed')
    return reservations.filter((r) => r.status === 'cancelled' || r.status === 'completed')
  }, [reservations, tab])

  const counts = {
    pending: reservations.filter((r) => r.status === 'pending').length,
    confirmed: reservations.filter((r) => r.status === 'confirmed').length,
    history: reservations.filter((r) => r.status === 'cancelled' || r.status === 'completed')
      .length,
  }

  const approve = async (id: string): Promise<void> => {
    setActing(id)
    try {
      await http.put(`/api/bookings/${id}/confirm`)
      await refresh()
    } catch (_error) {
      // Errors are visible in the network panel; surfacing a toast is
      // future work — the queue refresh will reveal whether the row
      // actually moved.
    } finally {
      setActing(null)
    }
  }

  const decline = async (id: string): Promise<void> => {
    setActing(id)
    try {
      await http.put(`/api/bookings/${id}/cancel`, { reason: 'host_declined' })
      await refresh()
    } catch (_error) {
      // see approve() — error is visible in network panel.
    } finally {
      setActing(null)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.cn(cm.sp('mb', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary-dark',
          )}
        >
          {t('reservations.eyebrow', {}, { defaultValue: 'Hosting · Reservations' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mt', 2),
            'leading-tight tracking-tight',
          )}
          style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
        >
          {t('reservations.heading', {}, { defaultValue: 'Reservation queue' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'reservations.subheading',
            { request: counts.pending },
            {
              defaultValue:
                '{{request}} pending requests · respond within 24h to keep your acceptance rate high',
            },
          )}
        </p>
      </header>

      <div
        className={cm.cn(cm.sp('mb', 6), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}
        role="tablist"
      >
        {TABS.map((tk) => (
          <button
            key={tk}
            type="button"
            role="tab"
            aria-selected={tab === tk}
            onClick={() => setTab(tk)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full transition-colors flex items-center gap-2',
              tab === tk
                ? 'bg-primary text-on-primary'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
            )}
          >
            {t(`reservations.tabs.${tk}`, {}, { defaultValue: tk[0].toUpperCase() + tk.slice(1) })}
            <span
              className={cm.cn(
                cm.sp('px', 2),
                'rounded-full bg-surface/20',
                tab === tk ? '' : 'bg-surface-container',
              )}
            >
              {counts[tk]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className={cm.cn('h-32 rounded-2xl bg-surface-container animate-pulse mb-3')}
          />
        ))
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('reservations.empty', {}, { defaultValue: 'Nothing in this queue.' })}
        </p>
      ) : (
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          {visible.map((r) => {
            const theme = STATUS_THEME[r.status]
            return (
              <li key={r.id}>
                <article
                  className={cm.cn(
                    cm.sp('p', 5),
                    cm.flex({ align: 'center', gap: 'md' }),
                    'bg-surface rounded-2xl shadow-sm border-l-4 border-accent',
                  )}
                >
                  {r.guest_photo ? (
                    <img
                      src={r.guest_photo}
                      alt=""
                      className={cm.cn(cm.roundedFull, 'w-14 h-14 object-cover')}
                    />
                  ) : (
                    <div
                      className={cm.cn(
                        cm.roundedFull,
                        'w-14 h-14 bg-surface-container flex items-center justify-center text-on-surface-variant',
                      )}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        person
                      </span>
                    </div>
                  )}
                  <div className={'flex-1 min-w-0 space-y-1'}>
                    <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
                      <p
                        className={cm.cn(cm.fontWeight('bold'))}
                        style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
                      >
                        {r.guest_name ??
                          t(
                            'reservations.unnamedGuest',
                            { appName: APP_NAME },
                            { defaultValue: '{{appName}} guest' },
                          )}
                      </p>
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'uppercase tracking-widest rounded-full',
                          theme.className,
                        )}
                      >
                        {t(`reservations.status.${r.status}`, {}, { defaultValue: theme.label })}
                      </span>
                      {r.instant_book ? (
                        <span
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            cm.flex({ align: 'center', gap: 'xs' }),
                            'uppercase tracking-widest rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
                          )}
                        >
                          <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                            bolt
                          </span>
                          {t('reservations.instantBook', {}, { defaultValue: 'Instant book' })}
                        </span>
                      ) : null}
                    </div>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant tabular-nums')}>
                      {r.listing_title} · {fmtRange(r.check_in_iso, r.check_out_iso)} · {r.nights}n
                      · {r.guests} guests
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'reservations.guestMeta',
                        { country: r.guest_country ?? '—', trips: r.guest_trips_completed },
                        { defaultValue: 'From {{country}} · {{trips}} prior trips' },
                      )}
                    </p>
                  </div>
                  <div className={'text-right shrink-0 space-y-2'}>
                    <p
                      className={cm.cn(
                        cm.textSize('xl'),
                        cm.fontWeight('extrabold'),
                        'tabular-nums',
                      )}
                    >
                      {fmtPrice(r.total_cents)}
                    </p>
                    {r.status === 'pending' ? (
                      <div className={cm.flex({ align: 'center', gap: 'xs' })}>
                        <button
                          type="button"
                          disabled={acting === r.id}
                          onClick={() => decline(r.id)}
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 2),
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'rounded-full border border-outline-variant text-on-surface-variant hover:border-rose-400 hover:text-error uppercase tracking-widest disabled:opacity-60',
                          )}
                        >
                          {acting === r.id
                            ? t('reservations.working', {}, { defaultValue: 'Working…' })
                            : t('reservations.decline', {}, { defaultValue: 'Decline' })}
                        </button>
                        <button
                          type="button"
                          disabled={acting === r.id}
                          onClick={() => approve(r.id)}
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 2),
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'rounded-full bg-primary text-on-primary hover:bg-primary-container uppercase tracking-widest disabled:opacity-60',
                          )}
                        >
                          {acting === r.id
                            ? t('reservations.working', {}, { defaultValue: 'Working…' })
                            : t('reservations.approve', {}, { defaultValue: 'Approve' })}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
