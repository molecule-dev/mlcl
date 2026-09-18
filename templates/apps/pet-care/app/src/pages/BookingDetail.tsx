import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ApiBooking {
  id: string
  service?: string
  status?: string
  start_date?: string
  end_date?: string
  starts_at?: string
  ends_at?: string
  sitter_name?: string
  pet_name?: string
  pet_id?: string
  pet_ids?: string[]
  sitter_id?: string
  notes?: string
  total?: number
  price_cents?: number
  owner_user_id?: string
}

interface ApiMessage {
  id: string
  sender_user_id: string
  body: string
  sent_at?: string
}

interface AuthUser {
  id?: string
  name?: string
  email?: string
}

const STATUS_COLOR: Record<string, string> = {
  confirmed: 'bg-info-container text-on-info-container',
  upcoming: 'bg-info-container text-on-info-container',
  in_progress: 'bg-warning-container text-on-warning-container',
  completed: 'bg-success-container text-on-success-container',
  cancelled: 'bg-error-container text-on-error-container',
  pending: 'bg-tertiary-container text-on-tertiary-container',
  requested: 'bg-tertiary-container text-on-tertiary-container',
}

function fmtDateTime(iso: string | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function fmtMessageTime(iso: string | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function BookingDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const { user } = useAuth<AuthUser>()
  const [booking, setBooking] = useState<ApiBooking | null>(null)
  const [messages, setMessages] = useState<ApiMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const loadAll = (bid: string) => {
    setLoading(true)
    Promise.allSettled([
      http.get(`/api/bookings/${bid}`),
      http.get(`/api/bookings/${bid}/messages`),
    ]).then(([b, m]) => {
      if (b.status === 'fulfilled') setBooking(unwrapSingle<ApiBooking>(b.value))
      else console.error('[BookingDetail] booking failed', b.reason)
      if (m.status === 'fulfilled') setMessages(unwrapList<ApiMessage>(m.value))
      else console.error('[BookingDetail] messages failed', m.reason)
      setLoading(false)
    })
  }

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    loadAll(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAll is stable within the render; adding it would cause infinite re-fetches
  }, [http, id])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || !id) return
    setSending(true)
    try {
      const res = await http.post(`/api/bookings/${id}/messages`, { body: draft.trim() })
      const created = unwrapSingle<ApiMessage>(res)
      if (created) {
        setMessages((prev) => [...prev, created])
      }
      setDraft('')
    } catch (err: unknown) {
      console.error('[BookingDetail] send failed', err)
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  const cancelBooking = async () => {
    if (!id) return
    setActionError(null)
    try {
      await http.post(`/api/bookings/${id}/cancel`, {})
      loadAll(id)
      setConfirmCancel(false)
    } catch (err: unknown) {
      console.error('[BookingDetail] cancel failed', err)
      setActionError(err instanceof Error ? err.message : String(err))
    }
  }

  if (loading && !booking) {
    return (
      <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('bookingDetail.loading', {}, { defaultValue: 'Loading booking…' })}
        </p>
      </div>
    )
  }
  if (!booking) {
    return (
      <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('bookingDetail.notFound', {}, { defaultValue: 'Booking not found.' })}
        </p>
        <Link to="/bookings" className={cm.cn(cm.sp('mt', 4), 'text-primary')}>
          {t('bookingDetail.back', {}, { defaultValue: 'Back to bookings' })}
        </Link>
      </div>
    )
  }

  const status = booking.status ?? 'upcoming'
  const statusClasses = STATUS_COLOR[status] || 'bg-info-container text-on-info-container'
  const startsAt = booking.start_date ?? booking.starts_at
  const endsAt = booking.end_date ?? booking.ends_at
  const priceDollars = booking.price_cents != null ? booking.price_cents / 100 : booking.total
  const isCancellable = status !== 'cancelled' && status !== 'completed'
  const userId = user?.id
  const linkedPetId = booking.pet_id ?? booking.pet_ids?.[0]

  return (
    <div
      className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
      data-mol-id="page-booking-detail"
    >
      <Link
        to="/bookings"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          cm.sp('mb', 4),
          'inline-flex text-on-surface-variant hover:text-primary',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
        {t('bookingDetail.back', {}, { defaultValue: 'Back to bookings' })}
      </Link>

      <section
        className={cm.cn(cm.sp('p', 8), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
          )}
        >
          <div>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-primary-dark dark:text-primary mb-1',
              )}
            >
              {t('bookingDetail.eyebrow', {}, { defaultValue: 'Booking' })}
            </p>
            <h1
              className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
              data-mol-id="booking-title"
            >
              {booking.service || t('bookings.fallbackService', {}, { defaultValue: 'Booking' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {fmtDateTime(startsAt)}
              {endsAt ? ` → ${fmtDateTime(endsAt)}` : ''}
            </p>
          </div>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'px-3 py-1 text-[10px] uppercase tracking-widest rounded-full',
              statusClasses,
            )}
            data-mol-id="booking-status"
          >
            {t(`bookingDetail.status.${status}`, {}, { defaultValue: status.replace('_', ' ') })}
          </span>
        </div>

        <div
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3', cm.sp('mt', 6))}
        >
          <article className={cm.cn(cm.sp('p', 5), 'rounded-xl bg-surface-container-low')}>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2',
              )}
            >
              {t('bookingDetail.sitterLabel', {}, { defaultValue: 'Sitter' })}
            </p>
            <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
              {booking.sitter_name || '—'}
            </p>
            {booking.sitter_id && (
              <Link
                to={`/sitters/${booking.sitter_id}`}
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-primary uppercase tracking-widest hover:underline mt-1 inline-block',
                )}
              >
                {t('bookingDetail.viewProfile', {}, { defaultValue: 'View profile →' })}
              </Link>
            )}
          </article>

          <article className={cm.cn(cm.sp('p', 5), 'rounded-xl bg-surface-container-low')}>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2',
              )}
            >
              {t('bookingDetail.petLabel', {}, { defaultValue: 'Pet' })}
            </p>
            <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
              {booking.pet_name || '—'}
            </p>
            {linkedPetId && (
              <Link
                to={`/pets/${linkedPetId}`}
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-primary uppercase tracking-widest hover:underline mt-1 inline-block',
                )}
              >
                {t('bookingDetail.viewPet', {}, { defaultValue: 'View pet →' })}
              </Link>
            )}
          </article>

          <article className={cm.cn(cm.sp('p', 5), 'rounded-xl bg-surface-container-low')}>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2',
              )}
            >
              {t('nav.total', {}, { defaultValue: 'Total' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'text-primary tabular-nums',
              )}
            >
              {priceDollars != null ? `$${priceDollars.toFixed(2)}` : '—'}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('bookingDetail.includesFees', {}, { defaultValue: 'Sitter rate × duration' })}
            </p>
          </article>
        </div>

        {booking.notes && (
          <div
            className={cm.cn(cm.sp('p', 5), cm.sp('mt', 6), 'rounded-xl bg-primary-container/40')}
          >
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-primary-dark dark:text-primary mb-2',
              )}
            >
              {t('bookingDetail.notesLabel', {}, { defaultValue: 'Notes for sitter' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>{booking.notes}</p>
          </div>
        )}

        {actionError && (
          <p
            className={cm.cn(
              cm.sp('mt', 4),
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
            role="alert"
          >
            {actionError}
          </p>
        )}

        {isCancellable && (
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }), cm.sp('mt', 6))}>
            {!confirmCancel ? (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-xl border border-error/40 text-error hover:bg-error-container transition-all',
                )}
                data-mol-id="cta-cancel-booking"
              >
                <span className={cm.cn('material-symbols-outlined text-base')}>cancel</span>
                {t('bookingDetail.cancelCta', {}, { defaultValue: 'Cancel booking' })}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={cancelBooking}
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'rounded-xl bg-error text-on-error',
                  )}
                  data-mol-id="cta-confirm-cancel"
                >
                  {t('bookingDetail.confirmCancel', {}, { defaultValue: 'Yes, cancel it' })}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-xl text-on-surface-variant hover:bg-surface-container',
                  )}
                >
                  {t('common.keepIt', {}, { defaultValue: 'Keep booking' })}
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <section className={cm.sp('mt', 8)}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('nav.messages', {}, { defaultValue: 'Messages' })}
        </h2>
        {messages.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
            {t(
              'bookingDetail.noMessages',
              {},
              { defaultValue: 'No messages yet — say hello to your sitter.' },
            )}
          </p>
        ) : (
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mb', 4))}>
            {messages.map((m) => {
              const fromMe = userId && m.sender_user_id === userId
              return (
                <div
                  key={m.id}
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.maxW('lg'),
                    'rounded-xl shadow-sm',
                    fromMe ? 'ml-auto bg-primary text-on-primary' : 'bg-surface-container-lowest',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.textSize('xs'),
                      cm.sp('mb', 1),
                    )}
                  >
                    <span className={cm.fontWeight('bold')}>
                      {fromMe
                        ? t('nav.you', {}, { defaultValue: 'You' })
                        : booking.sitter_name ||
                          t('messages.sitterFallback', {}, { defaultValue: 'Sitter' })}
                    </span>
                    <span className={fromMe ? 'text-white/80' : 'text-on-surface-variant'}>
                      {fmtMessageTime(m.sent_at)}
                    </span>
                  </div>
                  <p className={cm.cn(cm.textSize('sm'))}>{m.body}</p>
                </div>
              )
            })}
          </div>
        )}
        <form
          onSubmit={sendMessage}
          className={cm.cn(cm.flex({ gap: 'sm' }))}
          data-mol-id="form-send-message"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t(
              'bookingDetail.messagePlaceholder',
              {},
              { defaultValue: 'Write a message…' },
            )}
            className={cm.cn(
              cm.flex1,
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-lg bg-surface-container-low border border-outline/20',
            )}
            data-mol-id="input-message"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-lg text-white disabled:opacity-50',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
            }}
            data-mol-id="cta-send-message"
          >
            {sending
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('common.send', {}, { defaultValue: 'Send' })}
          </button>
        </form>
      </section>
    </div>
  )
}
