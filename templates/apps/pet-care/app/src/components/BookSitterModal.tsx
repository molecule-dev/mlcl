/**
 * Modal for creating a booking against a specific sitter.
 *
 * Hits POST /api/bookings with the sitter_id pre-bound; the user picks
 * which of their pets to include, the service type, and the date range.
 * Closes on success and invokes onCreated with the new booking id so the
 * caller can navigate or refresh.
 */
import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Pet {
  id: string
  name: string
}

interface SitterSummary {
  id: string
  display_name?: string
  services?: string[]
  hourly_rate_cents?: number
}

interface CreatedBooking {
  id?: string
  data?: { id?: string }
}

interface Props {
  sitter: SitterSummary
  open: boolean
  onClose: () => void
  onCreated?: (bookingId: string) => void
}

/** English defaults for known service keys — rendered through t() below. */
const SERVICE_LABELS: Record<string, string> = {
  walks: 'Walk',
  drop_in: 'Drop-in visit',
  overnight: 'Overnight',
  boarding: 'Boarding',
  medication: 'Medication',
}

function defaultStart(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setMinutes(0, 0, 0)
  d.setHours(10)
  return d.toISOString().slice(0, 16)
}

function defaultEnd(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setMinutes(0, 0, 0)
  d.setHours(11)
  return d.toISOString().slice(0, 16)
}

export function BookSitterModal({ sitter, open, onClose, onCreated }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const services =
    sitter.services && sitter.services.length > 0 ? sitter.services : ['walks', 'drop_in']
  const [pets, setPets] = useState<Pet[]>([])
  const [selectedPetIds, setSelectedPetIds] = useState<Set<string>>(new Set())
  const [service, setService] = useState<string>(services[0])
  const [startsAt, setStartsAt] = useState<string>(defaultStart())
  const [endsAt, setEndsAt] = useState<string>(defaultEnd())
  const [notes, setNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    http
      .get('/api/pets')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<Pet>(res)
        setPets(list)
        if (list.length === 1) setSelectedPetIds(new Set([list[0].id]))
      })
      .catch((err: unknown) => {
        console.error('[BookSitterModal] pets load failed', err)
      })
    return () => {
      cancelled = true
    }
  }, [http, open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const togglePet = (id: string) => {
    setSelectedPetIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (selectedPetIds.size === 0) {
      setError(t('book.errors.noPet', {}, { defaultValue: 'Pick at least one pet.' }))
      return
    }
    const start = new Date(startsAt)
    const end = new Date(endsAt)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError(
        t('book.errors.invalidDate', {}, { defaultValue: 'Pick a valid start and end time.' }),
      )
      return
    }
    if (end <= start) {
      setError(
        t('book.errors.endBeforeStart', {}, { defaultValue: 'End time must be after start time.' }),
      )
      return
    }
    setSubmitting(true)
    try {
      const res = await http.post('/api/bookings', {
        sitter_id: sitter.id,
        pet_ids: Array.from(selectedPetIds),
        service,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        notes,
      })
      const created = unwrapSingle<CreatedBooking>(res)
      const id = created?.id ?? created?.data?.id
      if (id) onCreated?.(id)
      track({
        name: 'appointment.scheduled',
        properties: { bookingId: id ?? '', sitterId: sitter.id, service },
      })
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || t('book.errors.failed', {}, { defaultValue: 'Could not create booking.' }))
      console.error('[BookSitterModal] create failed', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="presentation"
      className={cm.cn(
        'fixed inset-0 z-50',
        cm.flex({ align: 'center', justify: 'center' }),
        'bg-foreground/50 p-4',
      )}
      data-mol-id="modal-book-sitter"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-sitter-title"
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2 id="book-sitter-title" className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t(
              'book.title',
              { name: sitter.display_name ?? '' },
              { defaultValue: 'Book {{name}}' },
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={cm.cn(
              'material-symbols-outlined',
              cm.sp('p', 1),
              'rounded-full hover:bg-surface-container',
            )}
            aria-label={t('common.close', {}, { defaultValue: 'Close' })}
            data-mol-id="modal-close"
          >
            close
          </button>
        </div>

        <form
          onSubmit={submit}
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
          data-mol-id="form-book-sitter"
        >
          <div>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('book.pets', {}, { defaultValue: 'Pets' })}
            </label>
            {pets.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                {t(
                  'book.noPets',
                  {},
                  {
                    defaultValue:
                      'You need at least one pet on your profile to book. Add one from the Pets page first.',
                  },
                )}
              </p>
            ) : (
              <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }), cm.sp('mt', 2))}>
                {pets.map((p) => {
                  const checked = selectedPetIds.has(p.id)
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => togglePet(p.id)}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'rounded-full border transition-all',
                        checked
                          ? 'bg-primary text-on-primary border-primary'
                          : 'bg-surface-container-low border-outline/30 text-on-surface',
                      )}
                      data-mol-id={`pet-pick-${p.id}`}
                      aria-pressed={checked}
                    >
                      {p.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="book-service"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('book.service', {}, { defaultValue: 'Service' })}
            </label>
            <select
              id="book-service"
              value={service}
              onChange={(e) => setService(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('mt', 2),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border border-outline/20',
              )}
            >
              {services.map((s) => (
                <option key={s} value={s}>
                  {t(`book.services.${s}`, {}, { defaultValue: SERVICE_LABELS[s] ?? s })}
                </option>
              ))}
            </select>
          </div>

          <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-2')}>
            <div>
              <label
                htmlFor="book-start"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('common.start', {}, { defaultValue: 'Start' })}
              </label>
              <input
                id="book-start"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('mt', 2),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-lg bg-surface-container-low border border-outline/20',
                )}
              />
            </div>
            <div>
              <label
                htmlFor="book-end"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('book.end', {}, { defaultValue: 'End' })}
              </label>
              <input
                id="book-end"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('mt', 2),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-lg bg-surface-container-low border border-outline/20',
                )}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="book-notes"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('book.notes', {}, { defaultValue: 'Notes (optional)' })}
            </label>
            <textarea
              id="book-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={cm.cn(
                cm.w('full'),
                cm.sp('mt', 2),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border border-outline/20',
              )}
              placeholder={t(
                'book.notesPlaceholder',
                {},
                { defaultValue: 'Anything the sitter should know?' },
              )}
            />
          </div>

          {error && (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-error-container bg-error-container rounded-lg p-3',
              )}
              role="alert"
            >
              {error}
            </p>
          )}

          <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
            <button
              type="button"
              onClick={onClose}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-lg text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={submitting || pets.length === 0}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-lg text-white disabled:opacity-50',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
              }}
              data-mol-id="submit-book-sitter"
            >
              {submitting
                ? t('book.submitting', {}, { defaultValue: 'Booking…' })
                : t('book.submit', {}, { defaultValue: 'Confirm booking' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
