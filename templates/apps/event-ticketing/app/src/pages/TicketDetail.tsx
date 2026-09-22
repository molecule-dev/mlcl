import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TicketStub } from '../components/TicketStub.js'

interface TicketRow {
  id: string
  ref_code: string
  qr_payload?: string
  status: string
  event_id: string
  tier_id?: string | null
  order_id: string
  transferable?: boolean
}

interface EventRow {
  id: string
  title: string
  start_date: string
  start_time?: string | null
  venue?: string | null
  venue_address?: string | null
  city?: string | null
}

interface TierRow {
  id: string
  name: string
}

function fmtWhen(iso: string, time?: string | null): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const wk = d.toLocaleDateString(undefined, { weekday: 'short' })
  const dt = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${wk} · ${dt}${time ? ` · ${time}` : ''}`
}

export function TicketDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<TicketRow | null>(null)
  const [event, setEvent] = useState<EventRow | null>(null)
  const [tier, setTier] = useState<TierRow | null>(null)
  const [profileName, setProfileName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Transfer modal state
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferEmail, setTransferEmail] = useState('')
  const [transferBusy, setTransferBusy] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null)

  // Refund modal state
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [refundBusy, setRefundBusy] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const ticketRes = await http.get(`/api/tickets/${id}`)
        if (cancelled) return
        const tk = ticketRes.data as TicketRow
        setTicket(tk)
        const [evtRes, profileRes, tierRes] = await Promise.all([
          http.get(`/api/events/${tk.event_id}`).catch(() => ({ data: null })),
          http.get('/api/profile/me').catch(() => ({ data: null })),
          tk.tier_id
            ? http.get(`/api/ticket-tiers/${tk.tier_id}`).catch(() => ({ data: null }))
            : Promise.resolve({ data: null }),
        ])
        if (cancelled) return
        setEvent(evtRes.data as EventRow | null)
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
        setTier(tierRes.data as TierRow | null)
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load ticket')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, id])

  async function submitTransfer() {
    if (!ticket) return
    setTransferBusy(true)
    setTransferError(null)
    setTransferSuccess(null)
    try {
      await http.post(`/api/transfers/${ticket.id}`, { to_email: transferEmail.trim() })
      void track({
        name: 'ticket.transferred',
        properties: { ticket_id: ticket.id, order_id: ticket.order_id },
      })
      setTransferSuccess(
        t(
          'ticketDetail.transferSuccess',
          { email: transferEmail.trim() },
          { defaultValue: 'Transferred to {{email}}.' },
        ),
      )
      setTransferEmail('')
      // Refetch ticket so the new status reflects immediately
      const refreshed = await http.get(`/api/tickets/${ticket.id}`).catch(() => null)
      if (refreshed) setTicket(refreshed.data as TicketRow)
    } catch (err) {
      setTransferError((err as Error).message ?? 'Transfer failed')
    } finally {
      setTransferBusy(false)
    }
  }

  async function submitRefund() {
    if (!ticket) return
    setRefundBusy(true)
    setRefundError(null)
    setRefundSuccess(null)
    try {
      await http.post('/api/refunds', { order_id: ticket.order_id, reason: refundReason.trim() })
      void track({
        name: 'ticket.refund_requested',
        properties: { ticket_id: ticket.id, order_id: ticket.order_id },
      })
      setRefundSuccess(t('ticketDetail.refundSuccess', {}, { defaultValue: 'Refund requested.' }))
      setRefundReason('')
    } catch (err) {
      setRefundError((err as Error).message ?? 'Refund request failed')
    } finally {
      setRefundBusy(false)
    }
  }

  async function downloadWalletPass() {
    if (!ticket) return
    try {
      const res = await http.get(`/api/tickets/${ticket.id}/wallet-pass`)
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${ticket.ref_code}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setTransferError((err as Error).message ?? 'Could not download pass')
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('p', 8), cm.textCenter, cm.textMuted)}
        data-mol-id="page-ticket-detail"
      >
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }
  if (error || !ticket) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.textCenter)} data-mol-id="page-ticket-detail">
        <p role="alert" className={cm.cn('text-error font-bold')}>
          {error ?? t('ticketDetail.notFound', {}, { defaultValue: 'Ticket not found.' })}
        </p>
        <Link to="/my-tickets" className={cm.cn('inline-block mt-4 text-primary font-bold')}>
          {t('common.back', {}, { defaultValue: 'Back' })}
        </Link>
      </div>
    )
  }

  const tone: 'active' | 'used' | 'transferred' | 'refunded' =
    ticket.status === 'transferred'
      ? 'transferred'
      : ticket.status === 'refunded'
        ? 'refunded'
        : ticket.status === 'checked_in'
          ? 'used'
          : 'active'

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(8), 'max-w-4xl w-full mx-auto')}
      data-mol-id="page-ticket-detail"
    >
      <header className={cm.stack(2)}>
        <nav
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            'text-on-surface-variant',
          )}
          aria-label={t('ticketDetail.breadcrumbs', {}, { defaultValue: 'Breadcrumbs' })}
        >
          <Link to="/my-tickets" className={cm.cn('font-bold text-primary hover:underline')}>
            {t('ticketDetail.crumbLibrary', {}, { defaultValue: 'My tickets' })}
          </Link>
          <span aria-hidden="true">/</span>
          <span data-mol-id="ticket-ref">{ticket.ref_code}</span>
        </nav>
        <h1 className={cm.cn('text-3xl font-extrabold tracking-tight')}>
          {t('ticketDetail.heading', {}, { defaultValue: 'Ticket details' })}
        </h1>
      </header>

      <TicketStub
        eventName={event?.title ?? t('ticket.eventFallback', {}, { defaultValue: 'Event' })}
        tier={tier?.name ?? '—'}
        holderName={
          profileName || t('ticket.holderFallback', {}, { defaultValue: 'Ticket holder' })
        }
        whenLabel={event ? fmtWhen(event.start_date, event.start_time) : '—'}
        venueName={event?.venue ?? '—'}
        venueAddress={event?.venue_address ?? ''}
        refCode={ticket.ref_code}
        qrSlug={ticket.ref_code}
        status={{
          label:
            tone === 'active'
              ? t('ticketDetail.status.active', {}, { defaultValue: 'Active' })
              : tone === 'used'
                ? t('ticketDetail.status.used', {}, { defaultValue: 'Checked in' })
                : tone === 'transferred'
                  ? t('ticketDetail.status.transferred', {}, { defaultValue: 'Transferred' })
                  : t('ticketDetail.status.refunded', {}, { defaultValue: 'Refunded' }),
          tone,
        }}
      />

      {/* Action row */}
      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
        <button
          type="button"
          onClick={downloadWalletPass}
          data-mol-id="ticket-download-pass"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 4),
            'rounded-2xl bg-foreground text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-md',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            wallet
          </span>
          {t('ticketDetail.walletPass', {}, { defaultValue: 'Download wallet pass' })}
        </button>
        <button
          type="button"
          onClick={() => navigate(`/orders/${ticket.order_id}/confirmation`)}
          data-mol-id="ticket-view-order"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 4),
            'rounded-2xl bg-surface text-on-surface text-sm font-bold inline-flex items-center justify-center gap-2 border border-outline-variant',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            receipt_long
          </span>
          {t('ticketDetail.viewOrder', {}, { defaultValue: 'View order' })}
        </button>
      </section>

      {/* Secondary actions */}
      <section
        className={cm.cn(
          'p-6 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm stack-y space-y-4',
        )}
      >
        <header className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
            {t('ticketDetail.secondaryHeading', {}, { defaultValue: 'Send or refund' })}
          </h2>
        </header>
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
          <div
            className={cm.cn('p-5 rounded-xl border')}
            style={{
              borderStyle: 'dashed',
              borderColor: 'var(--color-border-secondary)',
              background: 'var(--color-background)',
            }}
          >
            <span
              className={cm.cn('material-symbols-outlined text-2xl text-primary')}
              aria-hidden="true"
            >
              swap_horiz
            </span>
            <p className={cm.cn('mt-2 font-bold text-on-surface')}>
              {t('ticketDetail.transferTitle', {}, { defaultValue: 'Transfer ticket' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'mt-1 text-on-surface-variant')}>
              {t(
                'ticketDetail.transferBody',
                {},
                { defaultValue: 'Send this pass to a friend by email.' },
              )}
            </p>
            {transferOpen ? (
              <div className={cm.cn('mt-4 stack-y space-y-2')}>
                <input
                  type="email"
                  data-mol-id="transfer-email"
                  placeholder={t(
                    'ticketDetail.transferEmailPlaceholder',
                    {},
                    { defaultValue: 'friend@example.com' },
                  )}
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  className={cm.cn(
                    'w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant text-sm',
                  )}
                />
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <button
                    type="button"
                    disabled={transferBusy || !transferEmail.trim()}
                    onClick={submitTransfer}
                    data-mol-id="transfer-submit"
                    className={cm.cn(
                      'px-4 py-2 rounded-full bg-primary text-white text-xs font-bold disabled:opacity-50',
                    )}
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    }}
                  >
                    {transferBusy
                      ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                      : t('ticketDetail.transferSubmit', {}, { defaultValue: 'Send transfer' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferOpen(false)}
                    className={cm.cn(
                      'px-4 py-2 rounded-full border border-outline-variant text-xs font-bold',
                    )}
                  >
                    {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                  </button>
                </div>
                {transferError ? (
                  <p role="alert" className={cm.cn('text-xs font-bold text-error')}>
                    {transferError}
                  </p>
                ) : null}
                {transferSuccess ? (
                  <p
                    role="status"
                    className={cm.cn('text-xs font-bold text-success')}
                    data-mol-id="transfer-success"
                  >
                    {transferSuccess}
                  </p>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                disabled={ticket.status !== 'issued'}
                onClick={() => setTransferOpen(true)}
                data-mol-id="transfer-open"
                className={cm.cn(
                  'mt-4 px-4 py-2 rounded-full border border-primary text-primary text-xs font-bold hover:bg-primary/10 disabled:opacity-50',
                )}
              >
                {t('ticketDetail.transferCta', {}, { defaultValue: 'Transfer ticket' })}
              </button>
            )}
          </div>
          <div className={cm.cn('p-5 rounded-xl border border-outline-variant')}>
            <span
              className={cm.cn('material-symbols-outlined text-2xl')}
              style={{ color: 'var(--color-warning)' }}
              aria-hidden="true"
            >
              undo
            </span>
            <p className={cm.cn('mt-2 font-bold text-on-surface')}>
              {t('ticketDetail.refundTitle', {}, { defaultValue: 'Request refund' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'mt-1 text-on-surface-variant')}>
              {t(
                'ticketDetail.refundBody',
                {},
                { defaultValue: 'We forward refund requests to the organizer for review.' },
              )}
            </p>
            {refundOpen ? (
              <div className={cm.cn('mt-4 stack-y space-y-2')}>
                <textarea
                  rows={3}
                  data-mol-id="refund-reason"
                  placeholder={t(
                    'ticketDetail.refundReasonPlaceholder',
                    {},
                    { defaultValue: 'Why are you requesting a refund?' },
                  )}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className={cm.cn(
                    'w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant text-sm',
                  )}
                />
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <button
                    type="button"
                    disabled={refundBusy || !refundReason.trim()}
                    onClick={submitRefund}
                    data-mol-id="refund-submit"
                    className={cm.cn(
                      'px-4 py-2 rounded-full text-white text-xs font-bold disabled:opacity-50',
                    )}
                    style={{ background: 'var(--color-warning)' }}
                  >
                    {refundBusy
                      ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                      : t('ticketDetail.refundSubmit', {}, { defaultValue: 'Submit request' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundOpen(false)}
                    className={cm.cn(
                      'px-4 py-2 rounded-full border border-outline-variant text-xs font-bold',
                    )}
                  >
                    {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                  </button>
                </div>
                {refundError ? (
                  <p role="alert" className={cm.cn('text-xs font-bold text-error')}>
                    {refundError}
                  </p>
                ) : null}
                {refundSuccess ? (
                  <p
                    role="status"
                    className={cm.cn('text-xs font-bold text-success')}
                    data-mol-id="refund-success"
                  >
                    {refundSuccess}
                  </p>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRefundOpen(true)}
                data-mol-id="refund-open"
                className={cm.cn(
                  'mt-4 text-xs font-bold text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1',
                )}
              >
                {t('ticketDetail.refundCta', {}, { defaultValue: 'Request refund' })}
                <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default TicketDetail
