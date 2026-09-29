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

/** Chip tone for a stay's status — same grammar as the ledger. */
function stayChipClass(status: string): string {
  if (status === 'confirmed') {
    return 'bg-tertiary-fixed/40 border border-tertiary-fixed text-on-tertiary-fixed-variant'
  }
  if (status === 'checked_in' || status === 'held') {
    return 'bg-secondary/10 border border-secondary/30 text-secondary'
  }
  if (status === 'cancelled' || status === 'no_show') {
    return 'bg-error/10 border border-error/30 text-error'
  }
  return 'bg-surface-container border border-outline-variant text-on-surface'
}

/** Up-to-two-letter initials for the guest avatar tile. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
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
      <div className={cm.cn(cm.maxW('4xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
        <p
          data-mol-id="guest-detail-error"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            'inline-block rounded-lg bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      </div>
    )
  }

  if (!guest) {
    return (
      <div className={cm.cn(cm.maxW('4xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
        <p
          data-mol-id="guest-detail-loading"
          className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  const rows: Array<{ label: string; value: string; icon?: string; mono?: boolean }> = [
    {
      label: t('guestDetail.email', {}, { defaultValue: 'Email' }),
      value: guest.email ?? '—',
      icon: 'mail',
      mono: true,
    },
    {
      label: t('guestDetail.phone', {}, { defaultValue: 'Phone' }),
      value: guest.phone ?? '—',
      icon: 'call',
      mono: true,
    },
    {
      label: t('guestDetail.preferredLanguage', {}, { defaultValue: 'Preferred language' }),
      value: languageLabel(guest.preferred_language),
      icon: 'translate',
    },
    {
      label: t('guestDetail.stayCount', {}, { defaultValue: 'Completed stays' }),
      value: String(guest.stay_count),
      icon: 'hotel_class',
    },
  ]

  return (
    <div className={cm.cn(cm.maxW('4xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      {/* Breadcrumb + dossier headline */}
      <div className="border-b border-outline-variant/60 pb-6">
        <p
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider text-on-surface-variant',
          )}
        >
          <Link
            to="/guests"
            data-mol-id="guest-detail-back"
            className="-my-2 inline-block py-2 hover:text-primary"
          >
            {t('guests.heading', {}, { defaultValue: 'Guests' })}
          </Link>
          <span className="sb-icon flex h-3 w-3 items-center justify-center" aria-hidden="true">
            <span className="material-symbols-outlined">chevron_right</span>
          </span>
          <span className="text-secondary">
            {t('guestDetail.eyebrow', {}, { defaultValue: 'Guest dossier' })}
          </span>
        </p>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), cm.sp('mt', 2))}
        >
          <span
            aria-hidden="true"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-12 w-12 shrink-0 rounded-lg bg-primary text-on-primary',
              'sb-serif text-lg',
            )}
          >
            {initials(guest.name)}
          </span>
          <div>
            <h1
              className={cm.cn('sb-serif text-3xl font-normal tracking-tight text-primary')}
              data-mol-id="guest-detail-heading"
            >
              {guest.name}
            </h1>
            <p
              className={cm.cn(
                cm.sp('mt', 0.5),
                cm.textSize('sm'),
                'font-mono text-on-surface-variant',
              )}
            >
              {guest.email ?? guest.phone ?? '—'}
            </p>
          </div>
        </div>
      </div>

      <div className={cm.cn('mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5')}>
        {/* LEFT: dossier + notes */}
        <div className={cm.cn('flex flex-col gap-6 lg:col-span-3')}>
          <section
            className="sb-card-shadow rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-5"
            aria-label={t('guestDetail.profileLabel', {}, { defaultValue: 'Guest profile' })}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('mb', 3),
                cm.sp('pb', 2),
                'border-b border-outline-variant/40',
              )}
            >
              <h2
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'sb-serif text-lg font-medium text-primary',
                )}
              >
                <span
                  className="sb-icon flex h-5 w-5 items-center justify-center text-secondary"
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">person</span>
                </span>
                {t('guestDetail.profile', {}, { defaultValue: 'Guest profile & contact' })}
              </h2>
            </div>
            <dl className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4">
                  <dt
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                    )}
                  >
                    <span
                      className="sb-icon flex h-4 w-4 items-center justify-center text-secondary"
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined">{row.icon ?? 'info'}</span>
                    </span>
                    {row.label}
                  </dt>
                  <dd
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'text-right text-primary',
                      row.mono && 'font-mono',
                    )}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {guest.notes ? (
            <section
              className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-5"
              aria-label={t('guestDetail.notesLabel', {}, { defaultValue: 'Guest notes' })}
            >
              <h2
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'sb-serif text-lg font-medium text-primary',
                )}
              >
                <span
                  className="sb-icon flex h-5 w-5 items-center justify-center text-secondary"
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">sticky_note_2</span>
                </span>
                {t('guestDetail.notes', {}, { defaultValue: 'Directives & preferences' })}
              </h2>
              <p
                data-mol-id="guest-detail-notes"
                className={cm.cn(
                  cm.sp('mt', 3),
                  cm.textSize('sm'),
                  'leading-relaxed text-on-surface',
                )}
              >
                {guest.notes}
              </p>
            </section>
          ) : null}
        </div>

        {/* RIGHT: stay ledger */}
        <section
          className={cm.cn('flex flex-col gap-3 lg:col-span-2')}
          aria-label={t('guestDetail.stayHistoryLabel', {}, { defaultValue: 'Stay history' })}
        >
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              'sb-serif text-lg font-medium text-primary',
            )}
          >
            <span
              className="sb-icon flex h-5 w-5 items-center justify-center text-secondary"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">history</span>
            </span>
            {t('guestDetail.stayHistory', {}, { defaultValue: 'Stay history' })}
          </h2>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {(guest.stays ?? []).length === 0 ? (
              <li
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.textSize('sm'),
                  'rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant',
                )}
              >
                {t(
                  'guestDetail.noStays',
                  {},
                  { defaultValue: 'No reservations linked to this guest yet.' },
                )}
              </li>
            ) : (
              (guest.stays ?? []).map((stay) => (
                <li
                  key={stay.id}
                  className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4"
                >
                  <div
                    className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}
                  >
                    <Link
                      to={'/reservations/' + stay.id}
                      data-mol-id={'guest-stay-' + stay.confirmation_code}
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        '-my-2 inline-block py-2 text-primary hover:text-secondary hover:underline',
                      )}
                    >
                      {formatDate(stay.check_in)} → {formatDate(stay.check_out)}
                    </Link>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 0.5),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'whitespace-nowrap rounded border',
                        stayChipClass(stay.status),
                      )}
                    >
                      {t(
                        'reservationStatus.' + stay.status,
                        {},
                        { defaultValue: stay.status.replace(/_/g, ' ') },
                      )}
                    </span>
                  </div>
                  <div
                    className={cm.cn(
                      cm.sp('mt', 2),
                      cm.sp('pt', 2),
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.textSize('xs'),
                      'border-t border-outline-variant/30 text-on-surface-variant',
                    )}
                  >
                    <span className="font-mono">{stay.confirmation_code}</span>
                    <span className={cm.fontWeight('semibold') + ' text-primary'}>
                      {formatCents(stay.total_cents)}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
