import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type ReservationStatus = 'confirmed' | 'seated' | 'waitlist' | 'cancelled' | 'no_show'

interface ApiReservation {
  id: string
  scheduled_for: string
  party_size: number
  status: ReservationStatus
  notes?: string | null
  table_id?: string | null
}

const STATUS_TONE: Record<ReservationStatus, string> = {
  confirmed: 'bg-success/15 text-success',
  seated: 'bg-primary/15 text-primary',
  waitlist: 'bg-warning/15 text-warning',
  cancelled: 'bg-error/15 text-error',
  no_show: 'bg-error/15 text-error',
}

const STATUS_OPTIONS: ReservationStatus[] = [
  'confirmed',
  'seated',
  'waitlist',
  'cancelled',
  'no_show',
]

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } catch (_error) {
    // invalid ISO string — return raw value as fallback
    return iso
  }
}

function partyNameFromNotes(notes?: string | null): string {
  if (!notes) return ''
  const dash = notes.indexOf(' — ')
  return dash >= 0 ? notes.slice(0, dash) : notes
}

function detailsFromNotes(notes?: string | null): string {
  if (!notes) return ''
  const dash = notes.indexOf(' — ')
  return dash >= 0 ? notes.slice(dash + 3) : ''
}

export function Reservations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [filter, setFilter] = useState<'all' | ReservationStatus>('all')
  const [reservations, setReservations] = useState<ReadonlyArray<ApiReservation>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = filter === 'all' ? '/api/reservations' : `/api/reservations?status=${filter}`
      const res = await http.get(url)
      setReservations(unwrapList<ApiReservation>(res))
    } catch (error) {
      logError('reservations.load', error)
      setError(t('reservations.loadError', {}, { defaultValue: 'Could not load reservations.' }))
    } finally {
      setLoading(false)
    }
  }, [filter, http, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleAdd = useCallback(async () => {
    const partyName = window.prompt(
      t('reservations.namePrompt', {}, { defaultValue: 'Party name' }),
    )
    if (!partyName) return
    const partySize = Number(
      window.prompt(t('reservations.partyPrompt', {}, { defaultValue: 'Party size' })) || '2',
    )
    if (!Number.isFinite(partySize) || partySize <= 0) return
    const when = window.prompt(
      t('reservations.whenPrompt', {}, { defaultValue: 'When? (e.g. 2026-05-10 19:00)' }),
    )
    const scheduled = when ? new Date(when) : new Date()
    if (Number.isNaN(scheduled.getTime())) return
    setBusy(true)
    setError(null)
    try {
      await http.post('/api/reservations', {
        party_name: partyName,
        party_size: partySize,
        scheduled_for: scheduled.toISOString(),
      })
      void track({ name: 'reservation.created', properties: { partySize } })
      await reload()
    } catch (error) {
      logError('reservations.add', error)
      setError(t('reservations.addError', {}, { defaultValue: 'Could not create reservation.' }))
    } finally {
      setBusy(false)
    }
  }, [http, reload, t])

  const handleStatus = useCallback(
    async (id: string, status: ReservationStatus) => {
      setBusy(true)
      setError(null)
      try {
        await http.put(`/api/reservations/${id}/status`, { status })
        void track({
          name: 'reservation.status_updated',
          properties: { reservationId: id, status },
        })
        await reload()
      } catch (error) {
        logError('reservations.updateStatus', error)
        setError(t('reservations.statusError', {}, { defaultValue: 'Could not update status.' }))
      } finally {
        setBusy(false)
      }
    },
    [http, reload, t],
  )

  const counts = useMemo(
    () => ({
      confirmed: reservations.filter((r) => r.status === 'confirmed').length,
      seated: reservations.filter((r) => r.status === 'seated').length,
      waitlist: reservations.filter((r) => r.status === 'waitlist').length,
    }),
    [reservations],
  )

  const sorted = [...reservations].sort((a, b) =>
    (a.scheduled_for ?? '').localeCompare(b.scheduled_for ?? ''),
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('reservations.eyebrow', {}, { defaultValue: 'Bookings' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight font-display')}>
            {t('reservations.heading', {}, { defaultValue: 'Reservations' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'reservations.subheading',
              {},
              {
                defaultValue:
                  'Track confirmed and waitlisted bookings — change status as guests arrive.',
              },
            )}
          </p>
        </div>
        <button
          onClick={handleAdd}
          disabled={busy}
          type="button"
          data-testid="reservations-add"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors inline-flex items-center gap-2 disabled:opacity-50',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add
          </span>
          {t('reservations.addBooking', {}, { defaultValue: 'New booking' })}
        </button>
      </header>

      {error ? (
        <p
          data-testid="reservations-error"
          className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')}
        >
          {error}
        </p>
      ) : null}

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-3')}>
        <Stat
          tint="success"
          icon="check_circle"
          label={t('reservations.confirmedLabel', {}, { defaultValue: 'Confirmed' })}
          value={String(counts.confirmed)}
        />
        <Stat
          tint="primary"
          icon="event_seat"
          label={t('reservations.seatedLabel', {}, { defaultValue: 'Seated' })}
          value={String(counts.seated)}
        />
        <Stat
          tint="warning"
          icon="hourglass_empty"
          label={t('reservations.waitlistLabel', {}, { defaultValue: 'Waitlist' })}
          value={String(counts.waitlist)}
        />
      </section>

      <nav className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
        {(['all', ...STATUS_OPTIONS] as const).map((s) => {
          const active = filter === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.roundedFull,
                'transition-colors',
                active
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
            >
              {t(
                `reservations.filter.${s}`,
                {},
                { defaultValue: s.replace(/^./, (c) => c.toUpperCase()) },
              )}
            </button>
          )
        })}
      </nav>

      {loading && reservations.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('reservations.loading', {}, { defaultValue: 'Loading reservations…' })}
        </p>
      ) : reservations.length === 0 ? (
        <p
          data-testid="reservations-empty"
          className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('reservations.empty', {}, { defaultValue: 'No reservations match this filter.' })}
        </p>
      ) : (
        <div
          className={cm.cn(
            cm.stack(2),
            'rounded-2xl bg-surface-container-lowest shadow-sm overflow-hidden',
          )}
        >
          {sorted.map((r) => (
            <article
              key={r.id}
              data-testid={`reservations-row-${r.id}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                cm.sp('px', 6),
                cm.sp('py', 4),
                'border-b border-outline-variant/40 last:border-0 hover:bg-surface-container-low transition-colors',
              )}
            >
              <div
                className={cm.cn(
                  cm.w(20),
                  cm.flex({ direction: 'col', align: 'center' }),
                  'text-primary',
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('2xl'),
                    'font-extrabold tabular-nums font-display tracking-tight',
                  )}
                >
                  {fmtTime(r.scheduled_for)}
                </span>
              </div>
              <div className={cm.flex1}>
                <p
                  className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'font-display')}
                >
                  {partyNameFromNotes(r.notes)} · {r.party_size}
                </p>
                {detailsFromNotes(r.notes) && (
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}>
                    {detailsFromNotes(r.notes)}
                  </p>
                )}
              </div>
              <div className={cm.flex({ align: 'center', gap: 'xs' })}>
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatus(r.id, s)}
                    disabled={busy || r.status === s}
                    data-testid={`reservations-${r.id}-${s}`}
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                      r.status === s
                        ? STATUS_TONE[s]
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                    )}
                  >
                    {t(`reservations.status.${s}`, {}, { defaultValue: s.replace(/_/g, ' ') })}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({
  tint,
  icon,
  label,
  value,
}: {
  tint: 'success' | 'primary' | 'warning'
  icon: string
  label: string
  value: string
}) {
  const cm = getClassMap()
  const tintClass =
    tint === 'success' ? 'text-success' : tint === 'primary' ? 'text-primary' : 'text-warning'
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl hover:shadow-md transition-shadow',
      )}
    >
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <div className={cm.cn(cm.sp('p', 3), 'bg-surface rounded-xl shadow-sm', tintClass)}>
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            {icon}
          </span>
        </div>
      </div>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          cm.sp('mt', 4),
          cm.sp('mb', 1),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </p>
      <p className={cm.cn(cm.textSize('3xl'), 'font-extrabold tabular-nums font-display')}>
        {value}
      </p>
    </div>
  )
}
