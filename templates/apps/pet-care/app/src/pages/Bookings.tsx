import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  type BookingStatus,
  BookingTimelineEntry,
  type BookingType,
} from '../components/BookingTimelineEntry.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiBooking {
  id: string
  service?: string
  status?: string
  start_date?: string
  end_date?: string
  sitter_name?: string
  pet_name?: string
  notes?: string
  type?: string
}

function statusOf(s: string | undefined): BookingStatus {
  if (
    s === 'confirmed' ||
    s === 'upcoming' ||
    s === 'in_progress' ||
    s === 'completed' ||
    s === 'cancelled' ||
    s === 'pending'
  )
    return s
  return 'upcoming'
}

function typeOf(s: string | undefined, service?: string): BookingType {
  const v = (s || service || '').toLowerCase()
  if (v.includes('walk')) return 'walk'
  if (v.includes('sit')) return 'sitting'
  if (v.includes('board')) return 'boarding'
  if (v.includes('groom')) return 'grooming'
  if (v.includes('vet')) return 'vet'
  if (v.includes('train')) return 'training'
  return 'other'
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function Bookings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [bookings, setBookings] = useState<ApiBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past' | 'all'>('upcoming')

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
        console.error('[Bookings] failed to load', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const fallbackService = t('bookings.fallbackService', {}, { defaultValue: 'Booking' })
  const fallbackSitter = t('messages.sitterFallback', {}, { defaultValue: 'Sitter' })
  const data = useMemo(
    () =>
      bookings.map((b) => ({
        id: b.id,
        dateLabel: b.start_date ? fmtDate(b.start_date) : '—',
        timeLabel: b.start_date ? fmtTime(b.start_date) : undefined,
        type: typeOf(b.type, b.service),
        status: statusOf(b.status),
        title: `${b.service || fallbackService}${b.pet_name ? ' · ' + b.pet_name : ''}`,
        providerName: b.sitter_name || fallbackSitter,
        petsLabel: b.pet_name,
        summary: b.notes,
      })),
    [bookings, fallbackService, fallbackSitter],
  )

  const filtered = useMemo(() => {
    const upcomingStatuses: BookingStatus[] = ['confirmed', 'upcoming', 'pending', 'in_progress']
    if (tab === 'upcoming') return data.filter((b) => upcomingStatuses.includes(b.status))
    if (tab === 'past')
      return data.filter((b) => b.status === 'completed' || b.status === 'cancelled')
    return data
  }, [data, tab])

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-bookings">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-widest text-primary-dark dark:text-primary mb-1',
            )}
          >
            {t('bookings.eyebrow', {}, { defaultValue: 'Calendar' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('bookings.title', {}, { defaultValue: 'Bookings' })}
          </h1>
        </div>
        <Link
          to="/sitters"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-xl text-white hover:shadow-lg active:scale-95 transition-all',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
          }}
          data-mol-id="bookings-new"
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>add</span>
          {t('bookings.newCta', {}, { defaultValue: 'New booking' })}
        </Link>
      </div>

      <div
        className={cm.cn(
          cm.flex({ gap: 'xs' }),
          cm.sp('mb', 6),
          'border-b border-outline-variant/30',
        )}
      >
        {(['upcoming', 'past', 'all'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'transition-colors border-b-2',
              tab === k
                ? 'text-primary border-primary'
                : 'text-on-surface-variant border-transparent hover:text-on-surface',
            )}
          >
            {t(`bookings.tab.${k}`, {}, { defaultValue: k.charAt(0).toUpperCase() + k.slice(1) })}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('bookings.loading', {}, { defaultValue: 'Loading bookings…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div
          className={cm.cn(cm.textCenter, cm.sp('py', 12), 'rounded-xl bg-surface-container-low')}
          data-mol-id="bookings-empty"
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-6xl text-primary mb-2 block opacity-50',
            )}
          >
            event_available
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {t('bookings.empty.title', {}, { defaultValue: 'Nothing booked' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'bookings.empty.body',
              {},
              { defaultValue: 'Find a sitter to book your first walk or visit.' },
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
            {t('bookings.findSitter', {}, { defaultValue: 'Find a sitter' })}
          </Link>
        </div>
      ) : (
        <div>
          {filtered.map((b, i) => (
            <BookingTimelineEntry
              key={b.id}
              id={b.id}
              dateLabel={b.dateLabel}
              timeLabel={b.timeLabel}
              type={b.type}
              status={b.status}
              title={b.title}
              providerName={b.providerName}
              petsLabel={b.petsLabel}
              summary={b.summary}
              isLast={i === filtered.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
