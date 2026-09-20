import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatCents, formatDate, languageLabel } from '../lib/format.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface GuestDetailPayload {
  id: string
  name: string
  email: string | null
  phone: string | null
  preferred_language: string
  notes: string | null
  stay_count: number
  stays?: StayRow[]
}

interface StayRow {
  id: string
  check_in: string
  check_out: string
  guests: number
  total_cents: number
  status: string
  source: string
  confirmation_code: string
}

export function GuestDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [guest, setGuest] = useState<GuestDetailPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!id) return
    ;(async () => {
      try {
        const res = await http.get('/api/guests/' + id)
        if (cancelled) return
        setGuest(unwrapSingle<GuestDetailPayload>(res))
      } catch (_e) {
        if (!cancelled) {
          setError(t('guests.loadError', {}, { defaultValue: 'Failed to load guest.' }))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (error) {
    return (
      <p
        data-mol-id="guest-detail-error"
        className={cm.cn(
          cm.sp('mx', 6),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-xl bg-error/10 text-error border border-error/30 inline-block',
        )}
      >
        {error}
      </p>
    )
  }

  if (!guest) {
    return (
      <p
        data-mol-id="guest-detail-loading"
        className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}
      >
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  const rows: Array<{ label: string; value: string }> = [
    { label: t('guestDetail.email', {}, { defaultValue: 'Email' }), value: guest.email ?? '—' },
    { label: t('guestDetail.phone', {}, { defaultValue: 'Phone' }), value: guest.phone ?? '—' },
    {
      label: t('guestDetail.preferredLanguage', {}, { defaultValue: 'Preferred language' }),
      value: languageLabel(guest.preferred_language),
    },
    {
      label: t('guestDetail.stayCount', {}, { defaultValue: 'Completed stays' }),
      value: String(guest.stay_count),
    },
  ]

  return (
    <div className={cm.cn(cm.maxW('3xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <Link
        to="/guests"
        data-mol-id="guest-detail-back"
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'text-primary hover:underline',
        )}
      >
        ← {t('guests.heading', {}, { defaultValue: 'Guests' })}
      </Link>
      <h1
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}
        data-mol-id="guest-detail-heading"
      >
        {guest.name}
      </h1>

      <dl
        className={cm.cn(
          cm.sp('mt', 6),
          cm.flex({ direction: 'col', gap: 'sm' }),
          'rounded-2xl bg-surface border border-outline-variant',
          cm.sp('p', 6),
        )}
      >
        {rows.map((row) => (
          <div key={row.label} className={cm.flex({ align: 'center', justify: 'between' })}>
            <dt
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {row.label}
            </dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      {guest.notes ? (
        <p
          data-mol-id="guest-detail-notes"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('p', 4),
            'rounded-2xl bg-surface-container-low border border-outline-variant text-sm',
          )}
        >
          {guest.notes}
        </p>
      ) : null}

      {/* Stay history */}
      <section
        className={cm.cn(
          cm.sp('mt', 6),
          cm.sp('p', 6),
          'rounded-2xl bg-surface border border-outline-variant',
        )}
        aria-label={t('guestDetail.stayHistoryLabel', {}, { defaultValue: 'Stay history' })}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('guestDetail.stayHistory', {}, { defaultValue: 'Stay history' })}
        </h2>
        <ul className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col', gap: 'sm' }))}>
          {(guest.stays ?? []).length === 0 ? (
            <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'guestDetail.noStays',
                {},
                { defaultValue: 'No reservations linked to this guest yet.' },
              )}
            </li>
          ) : (
            (guest.stays ?? []).map((stay) => (
              <li key={stay.id} className={cm.flex({ align: 'center', justify: 'between' })}>
                <Link
                  to={'/reservations/' + stay.id}
                  data-mol-id={'guest-stay-' + stay.confirmation_code}
                  className="font-semibold text-primary hover:underline"
                >
                  {formatDate(stay.check_in)} → {formatDate(stay.check_out)}
                </Link>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {formatCents(stay.total_cents)} ·{' '}
                  {t(
                    'reservationStatus.' + stay.status,
                    {},
                    { defaultValue: stay.status.replace(/_/g, ' ') },
                  )}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
