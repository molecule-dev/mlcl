import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Provider {
  id: string
  first_name: string
  last_name: string
  title: string
  specialty: string
  consultation_fee: number
}

interface Slot {
  id: string
  starts_at: string
  ends_at: string
  date?: string
  start_time?: string
  end_time?: string
}

const formatSlotDate = (slot: Slot): string => {
  const d = new Date(slot.starts_at)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

const formatSlotTime = (slot: Slot): string => {
  const start = new Date(slot.starts_at)
  const end = new Date(slot.ends_at)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return ''
  const fmt = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${fmt(start)} – ${fmt(end)}`
}

export function BookAppointmentPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [appointmentType, setAppointmentType] = useState('video')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const providerId = params.id ?? searchParams.get('provider_id')

  useEffect(() => {
    if (providerId) {
      http
        .get(`/api/providers/${providerId}`)
        .then((res) => setProvider(unwrapSingle<Provider>(res)))
      http
        .get(`/api/providers/${providerId}/availability`)
        .then((res) => setSlots(unwrapList<Slot>(res)))
    }
  }, [http, providerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot || !providerId) return

    setSubmitting(true)
    setError(null)
    const slot = slots.find((s) => s.id === selectedSlot)
    if (!slot) {
      setSubmitting(false)
      return
    }
    try {
      const startsAt = new Date(slot.starts_at)
      const endsAt = new Date(slot.ends_at)
      if (Number.isNaN(startsAt.getTime())) {
        setError(
          t(
            'booking.failed',
            {},
            { defaultValue: 'Could not book the appointment. Please try again.' },
          ),
        )
        setSubmitting(false)
        return
      }
      const durationMinutes = Number.isNaN(endsAt.getTime())
        ? 30
        : Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / 60000))
      const created = await http.post('/api/appointments', {
        provider_id: providerId,
        scheduled_at: startsAt.toISOString(),
        duration_minutes: durationMinutes,
        type: appointmentType === 'chat' ? 'messaging' : appointmentType,
        reason,
      })
      // Domain event — ids only, never the visit reason (health content).
      track({
        name: 'appointment.booked',
        properties: {
          appointment_id: unwrapSingle<{ id?: string }>(created)?.id,
          provider_id: providerId,
        },
      })
      navigate('/appointments')
    } catch (_error) {
      // booking API failure; error is shown via setError UI state
      setError(
        t(
          'booking.failed',
          {},
          { defaultValue: 'Could not book the appointment. Please try again.' },
        ),
      )
      setSubmitting(false)
    }
  }

  const inputClass = cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'w-full border border-outline-variant rounded-md bg-surface',
  )
  const labelClass = cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))
  const primaryButtonClass = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 2),
    cm.fontWeight('semibold'),
    'rounded-md bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50',
  )

  if (!providerId) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('3xl'), cm.mxAuto, 'space-y-4')}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('booking.title', {}, { defaultValue: 'Book Appointment' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('booking.selectProvider', {}, { defaultValue: 'Please select a provider first.' })}
        </p>
        <Link to="/providers" className={cm.cn(primaryButtonClass, 'inline-block')}>
          {t('booking.findProvider', {}, { defaultValue: 'Find a Provider' })}
        </Link>
      </div>
    )
  }

  return (
    <div
      data-mol-id="page-book-appointment"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('3xl'), cm.mxAuto, 'space-y-6')}
    >
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
        {t('booking.title', {}, { defaultValue: 'Book Appointment' })}
      </h1>

      {provider && (
        <div className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-1')}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {provider.title} {provider.first_name} {provider.last_name}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {provider.specialty}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-primary')}>
            {t(
              'booking.fee',
              { fee: provider.consultation_fee },
              { defaultValue: '${{fee}} per visit' },
            )}
          </p>
        </div>
      )}

      <form
        data-mol-id="form-book-appointment"
        onSubmit={handleSubmit}
        className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-5')}
      >
        <div>
          <label className={labelClass}>
            {t('booking.type', {}, { defaultValue: 'Appointment Type' })}
          </label>
          <select
            value={appointmentType}
            onChange={(e) => setAppointmentType(e.target.value)}
            className={cm.cn(inputClass, 'form-select')}
          >
            <option value="video">
              {t('appointments.type.video', {}, { defaultValue: 'Video Call' })}
            </option>
            <option value="phone">
              {t('appointments.type.phone', {}, { defaultValue: 'Phone Call' })}
            </option>
            <option value="chat">
              {t('appointments.type.chat', {}, { defaultValue: 'Chat' })}
            </option>
          </select>
        </div>

        <div>
          <label className={labelClass}>
            {t('booking.selectTime', {}, { defaultValue: 'Select Time' })}
          </label>
          {slots.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('booking.noSlots', {}, { defaultValue: 'No available slots.' })}
            </p>
          ) : (
            <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-2 sm:grid-cols-3')}>
              {slots.map((slot) => {
                const isSelected = selectedSlot === slot.id
                return (
                  <button
                    data-mol-id="button-action"
                    key={slot.id}
                    type="button"
                    className={cm.cn(
                      'slot-button',
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'flex flex-col items-start rounded-md border text-left transition-colors',
                      isSelected
                        ? 'border-primary bg-primary-container text-on-primary-container'
                        : 'border-outline-variant hover:bg-surface-container',
                    )}
                    onClick={() => setSelectedSlot(slot.id)}
                    data-slot-starts-at={slot.starts_at}
                    aria-pressed={isSelected}
                  >
                    <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {formatSlotDate(slot)}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {formatSlotTime(slot)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>
            {t('booking.reason', {}, { defaultValue: 'Reason for Visit' })}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t(
              'booking.reasonPlaceholder',
              {},
              { defaultValue: 'Briefly describe your symptoms or reason...' },
            )}
            className={inputClass}
            rows={3}
          />
        </div>

        <button
          data-mol-id="button-submit"
          type="submit"
          className={primaryButtonClass}
          disabled={!selectedSlot || submitting}
        >
          {submitting
            ? t('booking.submitting', {}, { defaultValue: 'Booking...' })
            : t('booking.confirm', {}, { defaultValue: 'Confirm Booking' })}
        </button>
        {error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  )
}
