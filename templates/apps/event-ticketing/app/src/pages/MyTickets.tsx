import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TicketStub } from '../components/TicketStub.js'

interface TicketRow {
  id: string
  ref_code: string
  qr_payload?: string
  status: 'issued' | 'checked_in' | 'transferred' | 'refunded' | string
  event_id: string
  tier_id?: string | null
  transferable?: boolean
  created_at: string
}

interface EventRow {
  id: string
  title: string
  start_date: string
  start_time?: string | null
  venue?: string | null
  venue_address?: string | null
  city?: string | null
  status?: string | null
}

interface TierRow {
  id: string
  name: string
}

type FilterKey = 'upcoming' | 'past' | 'transferred' | 'refunded'

function fmtWhen(iso: string, time?: string | null): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const wk = d.toLocaleDateString(undefined, { weekday: 'short' })
  const dt = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${wk} · ${dt}${time ? ` · ${time}` : ''}`
}

type TicketTone = 'active' | 'used' | 'transferred' | 'refunded'

function statusToTone(status: string, startIso?: string): TicketTone {
  if (status === 'transferred') return 'transferred'
  if (status === 'refunded') return 'refunded'
  if (status === 'checked_in') return 'used'
  if (startIso && new Date(startIso).getTime() < Date.now() - 86400e3) return 'used'
  return 'active'
}

export function MyTickets() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [eventById, setEventById] = useState<Record<string, EventRow>>({})
  const [tierById, setTierById] = useState<Record<string, TierRow>>({})
  const [profileName, setProfileName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('upcoming')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [ticketsRes, profileRes] = await Promise.all([
          http.get('/api/tickets'),
          http.get('/api/profile/me').catch(() => ({ data: null })),
        ])
        if (cancelled) return
        const items = (ticketsRes.data as TicketRow[]) ?? []
        setTickets(items)
        const profile = profileRes.data as {
          displayName?: string
          firstName?: string
          lastName?: string
        } | null
        if (profile) {
          setProfileName(
            profile.displayName?.trim() ||
              [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
              '',
          )
        }
        const eventIds = Array.from(new Set(items.map((tk) => tk.event_id)))
        const tierIds = Array.from(
          new Set(items.map((tk) => tk.tier_id).filter(Boolean) as string[]),
        )
        const [events, tiers] = await Promise.all([
          Promise.all(
            eventIds.map(async (eid) => {
              try {
                return (await http.get(`/api/events/${eid}`)).data as EventRow
              } catch (_error) {
                // best-effort; missing events are filtered out below
                return null
              }
            }),
          ),
          Promise.all(
            tierIds.map(async (tid) => {
              try {
                return (await http.get(`/api/ticket-tiers/${tid}`)).data as TierRow
              } catch (_error) {
                // best-effort; missing tiers are filtered out below
                return null
              }
            }),
          ),
        ])
        if (cancelled) return
        setEventById(
          Object.fromEntries(
            events.filter(Boolean).map((e) => [(e as EventRow).id, e as EventRow]),
          ),
        )
        setTierById(
          Object.fromEntries(
            tiers.filter(Boolean).map((tier) => [(tier as TierRow).id, tier as TierRow]),
          ),
        )
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load tickets')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const filtered = useMemo(() => {
    return tickets.filter((tk) => {
      const event = eventById[tk.event_id]
      const startIso = event?.start_date ?? null
      const tone = statusToTone(tk.status, startIso ?? undefined)
      if (filter === 'upcoming') return tone === 'active'
      if (filter === 'past') return tone === 'used'
      if (filter === 'transferred') return tone === 'transferred'
      if (filter === 'refunded') return tone === 'refunded'
      return true
    })
  }, [tickets, eventById, filter])

  const statusLabels: Record<TicketTone, string> = {
    active: t('myTickets.status.active', {}, { defaultValue: 'Active' }),
    used: t('myTickets.status.used', {}, { defaultValue: 'Used' }),
    transferred: t('myTickets.status.transferred', {}, { defaultValue: 'Transferred' }),
    refunded: t('myTickets.status.refunded', {}, { defaultValue: 'Refunded' }),
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(8), 'max-w-5xl w-full mx-auto')}
      data-mol-id="page-my-tickets"
    >
      <header className={cm.stack(2)}>
        <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
          {t('nav.yourLibrary', {}, { defaultValue: 'Your library' })}
        </p>
        <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
          {t('myTickets.heading', {}, { defaultValue: 'My tickets' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
          {t(
            'myTickets.subtitle',
            {},
            {
              defaultValue:
                'Open a ticket to scan, transfer, or download. Apple/Google Wallet links live inside each pass.',
            },
          )}
        </p>
      </header>

      <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
        {(['upcoming', 'past', 'transferred', 'refunded'] as FilterKey[]).map((f) => {
          const active = filter === f
          const labels: Record<FilterKey, string> = {
            upcoming: t('myTickets.filter.upcoming', {}, { defaultValue: 'Upcoming' }),
            past: t('myTickets.filter.past', {}, { defaultValue: 'Past' }),
            transferred: t('myTickets.filter.transferred', {}, { defaultValue: 'Transferred' }),
            refunded: t('myTickets.filter.refunded', {}, { defaultValue: 'Refunded' }),
          }
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              data-mol-id={`filter-${f}`}
              className={cm.cn(
                'px-4 py-2 rounded-full text-sm font-bold border transition-colors',
                active
                  ? 'border-transparent text-white shadow-md shadow-primary/30'
                  : 'border-outline-variant text-on-surface-variant hover:text-on-surface',
              )}
              style={
                active
                  ? {
                      background:
                        'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    }
                  : undefined
              }
            >
              {labels[f]}
            </button>
          )
        })}
      </div>

      {error ? (
        <div
          role="alert"
          className={cm.cn('p-3 rounded-xl bg-error/10 text-error text-sm font-bold')}
        >
          {error}
        </div>
      ) : null}
      {loading ? (
        <p className={cm.cn(cm.textCenter, cm.sp('py', 12), cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : null}

      <div className={cm.cn(cm.stack(4))}>
        {!loading &&
          filtered.map((tk) => {
            const event = eventById[tk.event_id]
            const tier = tk.tier_id ? tierById[tk.tier_id] : null
            const startIso = event?.start_date ?? null
            const tone = statusToTone(tk.status, startIso ?? undefined)
            return (
              <Link
                key={tk.id}
                to={`/tickets/${tk.id}`}
                data-mol-id="ticket-link"
                className={cm.cn('block hover:-translate-y-0.5 transition-transform')}
              >
                <TicketStub
                  eventName={
                    event?.title ?? t('ticket.eventFallback', {}, { defaultValue: 'Event' })
                  }
                  tier={tier?.name ?? '—'}
                  holderName={
                    profileName || t('ticket.holderFallback', {}, { defaultValue: 'Ticket holder' })
                  }
                  whenLabel={startIso ? fmtWhen(startIso, event?.start_time) : '—'}
                  venueName={event?.venue ?? '—'}
                  venueAddress={event?.venue_address ?? ''}
                  refCode={tk.ref_code}
                  qrSlug={tk.ref_code}
                  status={{ label: statusLabels[tone], tone }}
                />
              </Link>
            )
          })}
        {!loading && filtered.length === 0 ? (
          <div
            className={cm.cn(
              cm.textCenter,
              cm.sp('py', 12),
              'rounded-2xl border border-dashed border-outline-variant/60',
            )}
            data-mol-id="my-tickets-empty"
          >
            <span
              className={cm.cn('material-symbols-outlined text-5xl text-primary/40')}
              aria-hidden="true"
            >
              confirmation_number
            </span>
            <p className={cm.cn(cm.sp('mt', 3), cm.textSize('sm'), cm.textMuted)}>
              {tickets.length === 0
                ? t(
                    'myTickets.empty',
                    {},
                    {
                      defaultValue:
                        'Nothing here yet — discover an event and your tickets will appear automatically.',
                    },
                  )
                : t('myTickets.emptyFilter', {}, { defaultValue: 'No tickets match this filter.' })}
            </p>
            <Link
              to="/events"
              className={cm.cn(
                'inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full text-white font-bold shadow-md shadow-primary/30',
              )}
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                explore
              </span>
              {t('myTickets.browse', {}, { defaultValue: 'Browse events' })}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default MyTickets
