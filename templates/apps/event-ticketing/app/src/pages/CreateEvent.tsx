import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TierDraft {
  id: string
  serverId?: string
  name: string
  description: string
  price: string
  total: string
}

const STEPS = [
  { key: 'basics', defaultLabel: 'Basics' },
  { key: 'when', defaultLabel: 'Date & venue' },
  { key: 'tiers', defaultLabel: 'Tickets' },
  { key: 'review', defaultLabel: 'Review' },
] as const

const CATEGORY_OPTIONS = ['Music', 'Tech', 'Sports', 'Arts', 'Food', 'Business', 'General'] as const

function blankTier(): TierDraft {
  return {
    id: `local-${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    description: '',
    price: '',
    total: '',
  }
}

interface EventApiRow {
  id: string
  title: string
  description?: string | null
  category: string
  venue?: string | null
  venue_address?: string | null
  city?: string | null
  start_date: string
  start_time?: string | null
  end_time?: string | null
  status?: string | null
  min_price?: number | null
  tags?: string[] | null
}

interface TierApiRow {
  id: string
  name: string
  description?: string | null
  price_cents: number
  quantity_total: number
}

export function CreateEvent({
  mode = 'create' as 'create' | 'edit',
}: {
  mode?: 'create' | 'edit'
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id: string }>()

  const [step, setStep] = useState<(typeof STEPS)[number]['key']>('basics')
  const [eventId, setEventId] = useState<string | null>(routeId ?? null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('Music')
  const [venue, setVenue] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [city, setCity] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [tagsInput, setTagsInput] = useState('')
  const [tiers, setTiers] = useState<TierDraft[]>([blankTier()])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(mode === 'edit')
  // Destructive actions arm first, fire on the second click (fleet rule:
  // destructive actions are confirmed inline — never on a single tap).
  const [armedAction, setArmedAction] = useState<'none' | 'cancel' | 'delete'>('none')

  // A pending armed state disarms itself so a stray first tap can't lurk.
  useEffect(() => {
    if (armedAction === 'none') return
    const timer = window.setTimeout(() => setArmedAction('none'), 5000)
    return () => window.clearTimeout(timer)
  }, [armedAction])

  useEffect(() => {
    if (mode !== 'edit' || !routeId) return
    let cancelled = false
    async function load() {
      setLoadingExisting(true)
      try {
        const [eventRes, tierRes] = await Promise.all([
          http.get(`/api/events/${routeId}`),
          http.get(`/api/ticket-tiers?event_id=${encodeURIComponent(String(routeId))}`),
        ])
        if (cancelled) return
        const e = eventRes.data as EventApiRow
        setEventId(e.id)
        setTitle(e.title ?? '')
        setDescription(e.description ?? '')
        setCategory(e.category ?? 'Music')
        setVenue(e.venue ?? '')
        setVenueAddress(e.venue_address ?? '')
        setCity(e.city ?? '')
        setStartDate(e.start_date ? new Date(e.start_date).toISOString().slice(0, 10) : '')
        setStartTime(e.start_time ?? '')
        setEndTime(e.end_time ?? '')
        setStatus((e.status as 'draft' | 'published') ?? 'draft')
        setTagsInput(Array.isArray(e.tags) ? e.tags.join(', ') : '')
        const apiTiers = (tierRes.data as TierApiRow[]) ?? []
        setTiers(
          apiTiers.length > 0
            ? apiTiers.map((tier) => ({
                id: tier.id,
                serverId: tier.id,
                name: tier.name,
                description: tier.description ?? '',
                price: ((tier.price_cents ?? 0) / 100).toString(),
                total: String(tier.quantity_total ?? 0),
              }))
            : [blankTier()],
        )
      } catch (err) {
        if (!cancelled) setError((err as Error).message ?? 'Failed to load event')
      } finally {
        if (!cancelled) setLoadingExisting(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, mode, routeId])

  function addTier() {
    setTiers((prev) => [...prev, blankTier()])
  }

  function removeTier(id: string) {
    setTiers((prev) => (prev.length === 1 ? prev : prev.filter((t) => t.id !== id)))
  }

  function patchTier(id: string, patch: Partial<TierDraft>) {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  /**
   * Validate the form for the requested target status.
   * Drafts only require a title — everything else can be filled in later.
   * Publishing requires a fully-specified event with at least one tier so
   * attendees actually have something to buy.
   */
  function validate(targetStatus: 'draft' | 'published' = 'published'): string | null {
    if (!title.trim())
      return t('createEvent.validate.title', {}, { defaultValue: 'Event title is required.' })
    if (targetStatus === 'draft') return null
    if (!startDate)
      return t('createEvent.validate.startDate', {}, { defaultValue: 'Start date is required.' })
    if (!venue.trim())
      return t('createEvent.validate.venue', {}, { defaultValue: 'Venue is required.' })
    const cleanedTiers = tiers.filter((tier) => tier.name.trim())
    if (cleanedTiers.length === 0)
      return t('createEvent.validate.tiers', {}, { defaultValue: 'Add at least one ticket tier.' })
    for (const tier of cleanedTiers) {
      const priceNum = Number(tier.price)
      if (Number.isNaN(priceNum) || priceNum < 0)
        return t(
          'createEvent.validate.price',
          { name: tier.name },
          { defaultValue: 'Price for "{{name}}" must be a non-negative number.' },
        )
      const totalNum = Number(tier.total)
      if (!Number.isInteger(totalNum) || totalNum <= 0)
        return t(
          'createEvent.validate.quantity',
          { name: tier.name },
          { defaultValue: 'Quantity for "{{name}}" must be a positive integer.' },
        )
    }
    return null
  }

  async function persistEventBasics(targetStatus: 'draft' | 'published'): Promise<string> {
    const startIso = startDate
      ? new Date(`${startDate}T${startTime || '00:00'}:00`).toISOString()
      : undefined
    const cleanedTiers = tiers.filter((tier) => tier.name.trim())
    const minPrice = cleanedTiers.reduce((min, tier) => {
      const p = Number(tier.price)
      if (Number.isNaN(p)) return min
      return p < min ? p : min
    }, Number.POSITIVE_INFINITY)
    const ticketsTotal = cleanedTiers.reduce((sum, tier) => sum + Number(tier.total || 0), 0)
    const tagsList = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      venue: venue.trim(),
      venue_address: venueAddress.trim() || undefined,
      city: city.trim() || undefined,
      start_date: startIso,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      status: targetStatus,
      tickets_total: ticketsTotal,
      min_price: Number.isFinite(minPrice) ? minPrice : 0,
      tags: tagsList,
    }
    if (eventId) {
      const res = await http.put(`/api/events/${eventId}`, body)
      const updated = res.data as { id: string }
      void track({
        name: 'event.updated',
        properties: { event_id: updated.id, status: targetStatus },
      })
      return updated.id
    }
    const res = await http.post('/api/events', body)
    const created = res.data as { id: string }
    setEventId(created.id)
    void track({
      name: 'event.created',
      properties: { event_id: created.id, status: targetStatus },
    })
    return created.id
  }

  async function persistTiers(targetEventId: string): Promise<void> {
    const cleaned = tiers.filter((tier) => tier.name.trim())
    for (const tier of cleaned) {
      const body = {
        event_id: targetEventId,
        name: tier.name.trim(),
        description: tier.description.trim() || undefined,
        price_cents: Math.round(Number(tier.price) * 100),
        quantity_total: Number(tier.total),
      }
      if (tier.serverId) {
        await http.put(`/api/ticket-tiers/${tier.serverId}`, body)
      } else {
        const res = await http.post('/api/ticket-tiers', body)
        const created = res.data as { id: string }
        patchTier(tier.id, { serverId: created.id })
      }
    }
  }

  async function handleSubmit(e: React.FormEvent, targetStatus: 'draft' | 'published') {
    e.preventDefault()
    const issue = validate(targetStatus)
    if (issue) {
      setError(issue)
      setSuccess(null)
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const targetId = await persistEventBasics(targetStatus)
      await persistTiers(targetId)
      if (targetStatus === 'published') {
        await http.put(`/api/events/${targetId}/publish`, {})
        void track({ name: 'event.published', properties: { event_id: targetId } })
      }
      setStatus(targetStatus)
      setSuccess(
        targetStatus === 'published'
          ? t('createEvent.successPublished', {}, { defaultValue: 'Event published.' })
          : t('createEvent.successDraft', {}, { defaultValue: 'Saved as draft.' }),
      )
      navigate(`/events/${targetId}`)
    } catch (err) {
      setError((err as Error).message ?? 'Could not save event')
    } finally {
      setBusy(false)
    }
  }

  function handleCancelClick(): void {
    if (armedAction !== 'cancel') {
      setArmedAction('cancel')
      return
    }
    setArmedAction('none')
    void cancelEvent()
  }

  function handleDeleteClick(): void {
    if (armedAction !== 'delete') {
      setArmedAction('delete')
      return
    }
    setArmedAction('none')
    void deleteEvent()
  }

  async function cancelEvent() {
    if (!eventId) return
    setBusy(true)
    setError(null)
    try {
      await http.put(`/api/events/${eventId}/cancel`, {})
      void track({ name: 'event.cancelled', properties: { event_id: eventId } })
      setStatus('draft')
      setSuccess(t('createEvent.successCancelled', {}, { defaultValue: 'Event cancelled.' }))
      navigate('/dashboard')
    } catch (err) {
      setError((err as Error).message ?? 'Could not cancel event')
    } finally {
      setBusy(false)
    }
  }

  async function deleteEvent() {
    if (!eventId) return
    setBusy(true)
    setError(null)
    try {
      await http.delete(`/api/events/${eventId}`)
      void track({ name: 'event.deleted', properties: { event_id: eventId } })
      navigate('/dashboard')
    } catch (err) {
      setError((err as Error).message ?? 'Could not delete event')
    } finally {
      setBusy(false)
    }
  }

  if (loadingExisting) {
    return (
      <div
        className={cm.cn(cm.sp('p', 8), cm.textCenter, cm.textMuted)}
        data-mol-id="page-edit-event"
      >
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(8), 'max-w-6xl w-full mx-auto')}
      data-mol-id={`page-${mode === 'edit' ? 'edit' : 'create'}-event`}
    >
      <header className={cm.stack(2)}>
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.textSize('xs'),
            'inline-flex items-center gap-1 font-bold uppercase tracking-widest text-primary hover:underline',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
        </Link>
        <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
          {mode === 'edit'
            ? t('createEvent.editHeading', {}, { defaultValue: 'Edit event' })
            : t('createEvent.heading', {}, { defaultValue: 'Host a new event' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
          {mode === 'edit'
            ? t(
                'createEvent.editSubtitle',
                {},
                {
                  defaultValue:
                    'Update event details and ticket tiers. Save changes to push to your live page.',
                },
              )
            : t(
                'createEvent.subtitle',
                {},
                {
                  defaultValue:
                    'Tell us where, when, and what to charge. We’ll handle the rest — payments, QR delivery, and check-in.',
                },
              )}
        </p>
        {status === 'published' ? (
          <span
            className={cm.cn(
              'inline-flex w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
            )}
            style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}
            data-mol-id="event-status-published"
          >
            {t('createEvent.statusLive', {}, { defaultValue: 'Live · on sale' })}
          </span>
        ) : null}
      </header>

      {/* Step indicator */}
      <ol className={cm.cn('flex items-center gap-3 flex-wrap')}>
        {STEPS.map((s, i) => {
          const active = step === s.key
          const done = STEPS.findIndex((x) => x.key === step) > i
          return (
            <li key={s.key} className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <button
                type="button"
                onClick={() => setStep(s.key)}
                className={cm.cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
                  active
                    ? 'text-white shadow-md shadow-primary/30'
                    : done
                      ? 'bg-success/10 text-success'
                      : 'bg-surface-container-low text-on-surface-variant',
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
                <span
                  className={cm.cn(
                    'w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-extrabold',
                    active ? 'bg-surface/20' : 'bg-surface text-primary',
                  )}
                >
                  {i + 1}
                </span>
                {t(`createEvent.step.${s.key}`, {}, { defaultValue: s.defaultLabel })}
              </button>
              {i < STEPS.length - 1 ? (
                <span className={cm.cn('w-6 h-px bg-outline-variant')} aria-hidden="true" />
              ) : null}
            </li>
          )
        })}
      </ol>

      {error ? (
        <div
          role="alert"
          className={cm.cn('p-3 rounded-xl bg-error/10 text-error text-sm font-bold')}
          data-mol-id="event-form-error"
        >
          {error}
        </div>
      ) : null}
      {success ? (
        <div
          role="status"
          className={cm.cn('p-3 rounded-xl bg-success/10 text-success text-sm font-bold')}
        >
          {success}
        </div>
      ) : null}

      <div
        className={cm.cn(
          cm.grid({ gap: 'lg' }),
          'grid-cols-1 lg:grid-cols-[1fr_360px] items-start',
        )}
      >
        {/* Left form */}
        <form className={cm.cn(cm.stack(6))} onSubmit={(e) => handleSubmit(e, 'draft')}>
          {step === 'basics' ? (
            <section
              className={cm.cn(
                'p-6 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm stack-y space-y-5',
              )}
            >
              <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
                {t('createEvent.basics.heading', {}, { defaultValue: 'The basics' })}
              </h2>
              <label className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('createEvent.basics.title', {}, { defaultValue: 'Event title' })}
                </span>
                <input
                  data-mol-id="field-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={cm.cn(
                    'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-base font-bold',
                  )}
                />
              </label>
              <label className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.description', {}, { defaultValue: 'Description' })}
                </span>
                <textarea
                  data-mol-id="field-description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={cm.cn(
                    'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm',
                  )}
                />
              </label>
              <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1')}>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('form.category', {}, { defaultValue: 'Category' })}
                  </span>
                  <select
                    data-mol-id="field-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={cm.cn(
                      'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm font-medium',
                    )}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {t(`createEvent.category.${c.toLowerCase()}`, {}, { defaultValue: c })}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('createEvent.basics.tags', {}, { defaultValue: 'Tags (comma separated)' })}
                  </span>
                  <input
                    data-mol-id="field-tags"
                    placeholder={t(
                      'createEvent.basics.tagsPlaceholder',
                      {},
                      { defaultValue: 'Outdoor, All ages, Wheelchair accessible' },
                    )}
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className={cm.cn(
                      'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm',
                    )}
                  />
                </label>
              </div>
            </section>
          ) : null}

          {step === 'when' ? (
            <section
              className={cm.cn(
                'p-6 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm stack-y space-y-5',
              )}
            >
              <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
                {t('createEvent.when.heading', {}, { defaultValue: 'When & where' })}
              </h2>
              <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('form.startDate', {}, { defaultValue: 'Start date' })}
                  </span>
                  <input
                    data-mol-id="field-start-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={cm.cn(
                      'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm',
                    )}
                  />
                </label>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('createEvent.when.startTime', {}, { defaultValue: 'Start time' })}
                  </span>
                  <input
                    data-mol-id="field-start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={cm.cn(
                      'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm',
                    )}
                  />
                </label>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('createEvent.when.endTime', {}, { defaultValue: 'End time' })}
                  </span>
                  <input
                    data-mol-id="field-end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={cm.cn(
                      'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm',
                    )}
                  />
                </label>
                <label className={cm.cn(cm.stack(2), 'md:col-span-2')}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('createEvent.when.venue', {}, { defaultValue: 'Venue' })}
                  </span>
                  <input
                    data-mol-id="field-venue"
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className={cm.cn(
                      'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm font-medium',
                    )}
                  />
                </label>
                <label className={cm.cn(cm.stack(2), 'md:col-span-2')}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('form.address', {}, { defaultValue: 'Address' })}
                  </span>
                  <input
                    data-mol-id="field-venue-address"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    className={cm.cn(
                      'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm font-medium',
                    )}
                  />
                </label>
                <label className={cm.cn(cm.stack(2), 'md:col-span-2')}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('createEvent.when.city', {}, { defaultValue: 'City' })}
                  </span>
                  <input
                    data-mol-id="field-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={cm.cn(
                      'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm font-medium',
                    )}
                  />
                </label>
              </div>
            </section>
          ) : null}

          {step === 'tiers' ? (
            <section
              className={cm.cn(
                'p-6 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm stack-y space-y-5',
              )}
            >
              <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
                {t('createEvent.tiers.heading', {}, { defaultValue: 'Ticket tiers' })}
              </h2>
              <ul className={cm.cn(cm.stack(3))} data-mol-id="tier-list">
                {tiers.map((tier, i) => (
                  <li
                    key={tier.id}
                    className={cm.cn('p-4 rounded-xl border')}
                    style={{
                      borderStyle: 'dashed',
                      borderColor: 'var(--color-border-secondary)',
                      background: 'var(--color-background)',
                    }}
                    data-mol-id="tier-row"
                  >
                    <div
                      className={cm.cn(
                        cm.grid({ gap: 'sm' }),
                        'grid-cols-1 md:grid-cols-[2fr_2fr_1fr_1fr_auto]',
                      )}
                    >
                      <input
                        data-mol-id={`tier-${i}-name`}
                        placeholder={t(
                          'createEvent.tiers.namePlaceholder',
                          {},
                          { defaultValue: 'Tier name' },
                        )}
                        className={cm.cn(
                          'px-3 py-2 rounded-lg bg-surface border border-outline-variant text-sm font-bold',
                        )}
                        value={tier.name}
                        onChange={(e) => patchTier(tier.id, { name: e.target.value })}
                        aria-label={t(
                          'createEvent.tiers.nameAria',
                          { n: i + 1 },
                          { defaultValue: 'Tier {{n}} name' },
                        )}
                      />
                      <input
                        data-mol-id={`tier-${i}-description`}
                        placeholder={t(
                          'createEvent.tiers.descriptionPlaceholder',
                          {},
                          { defaultValue: 'Optional description' },
                        )}
                        className={cm.cn(
                          'px-3 py-2 rounded-lg bg-surface border border-outline-variant text-sm',
                        )}
                        value={tier.description}
                        onChange={(e) => patchTier(tier.id, { description: e.target.value })}
                        aria-label={t(
                          'createEvent.tiers.descriptionAria',
                          { n: i + 1 },
                          { defaultValue: 'Tier {{n}} description' },
                        )}
                      />
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          'px-3 py-2 rounded-lg bg-surface border border-outline-variant',
                        )}
                      >
                        <span
                          className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface-variant')}
                        >
                          $
                        </span>
                        <input
                          data-mol-id={`tier-${i}-price`}
                          inputMode="decimal"
                          className={cm.cn(
                            'w-0 min-w-0 flex-1 bg-transparent text-sm font-mono tabular-nums focus:outline-none',
                          )}
                          value={tier.price}
                          onChange={(e) => patchTier(tier.id, { price: e.target.value })}
                          aria-label={t(
                            'createEvent.tiers.priceAria',
                            { n: i + 1 },
                            { defaultValue: 'Tier {{n}} price' },
                          )}
                        />
                      </div>
                      <input
                        data-mol-id={`tier-${i}-total`}
                        inputMode="numeric"
                        placeholder={t(
                          'createEvent.tiers.qtyPlaceholder',
                          {},
                          { defaultValue: 'Qty' },
                        )}
                        className={cm.cn(
                          'px-3 py-2 rounded-lg bg-surface border border-outline-variant text-sm font-mono tabular-nums',
                        )}
                        value={tier.total}
                        onChange={(e) => patchTier(tier.id, { total: e.target.value })}
                        aria-label={t(
                          'createEvent.tiers.quantityAria',
                          { n: i + 1 },
                          { defaultValue: 'Tier {{n}} quantity' },
                        )}
                      />
                      <button
                        type="button"
                        aria-label={t(
                          'createEvent.tiers.removeAria',
                          { n: i + 1 },
                          { defaultValue: 'Remove tier {{n}}' },
                        )}
                        onClick={() => removeTier(tier.id)}
                        className={cm.cn('text-on-surface-variant hover:text-error')}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-lg')}
                          aria-hidden="true"
                        >
                          delete
                        </span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={addTier}
                data-mol-id="tier-add"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2.5),
                  'rounded-full border border-dashed border-primary text-primary text-sm font-bold inline-flex items-center gap-2 self-start',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  add
                </span>
                {t('createEvent.tiers.add', {}, { defaultValue: 'Add another tier' })}
              </button>
            </section>
          ) : null}

          {step === 'review' ? (
            <section
              className={cm.cn(
                'p-6 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm stack-y space-y-5',
              )}
              data-mol-id="event-review"
            >
              <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
                {t('createEvent.review.heading', {}, { defaultValue: 'Almost there — review' })}
              </h2>
              <div className={cm.cn('grid grid-cols-2 gap-4 text-sm')}>
                <div>
                  <dt
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('createEvent.review.title', {}, { defaultValue: 'Title' })}
                  </dt>
                  <dd className={cm.cn('font-bold mt-1')}>{title || '—'}</dd>
                </div>
                <div>
                  <dt
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('createEvent.review.when', {}, { defaultValue: 'When' })}
                  </dt>
                  <dd className={cm.cn('font-bold mt-1')}>
                    {startDate || '—'} {startTime ? `· ${startTime}` : ''}
                  </dd>
                </div>
                <div>
                  <dt
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('createEvent.review.venue', {}, { defaultValue: 'Venue' })}
                  </dt>
                  <dd className={cm.cn('font-bold mt-1')}>
                    {venue || '—'}
                    {city ? ` · ${city}` : ''}
                  </dd>
                </div>
                <div>
                  <dt
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('createEvent.review.tiers', {}, { defaultValue: 'Tiers' })}
                  </dt>
                  <dd className={cm.cn('font-bold mt-1')}>
                    {t(
                      'createEvent.review.tiersConfigured',
                      { count: tiers.filter((tier) => tier.name.trim()).length },
                      { defaultValue: '{{count}} configured' },
                    )}
                  </dd>
                </div>
              </div>
              <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                {t(
                  'createEvent.review.legal',
                  {},
                  {
                    defaultValue:
                      'By publishing, you agree to the organizer terms. Refunds up to 24h before doors are automatic.',
                  },
                )}
              </p>
            </section>
          ) : null}

          {/* Step nav */}
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-3')}
          >
            <button
              type="button"
              onClick={() => {
                const idx = STEPS.findIndex((s) => s.key === step)
                if (idx > 0) setStep(STEPS[idx - 1].key)
              }}
              disabled={step === STEPS[0].key}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                'rounded-full border border-outline-variant text-sm font-bold disabled:opacity-40',
              )}
            >
              {t('createEvent.previous', {}, { defaultValue: 'Previous' })}
            </button>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
              <button
                type="button"
                disabled={busy}
                onClick={(e) => handleSubmit(e, 'draft')}
                data-mol-id="event-save-draft"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2.5),
                  'rounded-full border border-outline-variant text-sm font-bold disabled:opacity-50',
                )}
              >
                {busy
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveDraft', {}, { defaultValue: 'Save draft' })}
              </button>
              {step === 'review' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={(e) => handleSubmit(e, 'published')}
                  data-mol-id="event-publish"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 2.5),
                    'rounded-full text-white text-sm font-extrabold shadow-md shadow-primary/30 disabled:opacity-50',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  }}
                >
                  {busy
                    ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                    : mode === 'edit'
                      ? t('createEvent.saveChanges', {}, { defaultValue: 'Save & publish' })
                      : t('createEvent.publish', {}, { defaultValue: 'Publish event' })}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const idx = STEPS.findIndex((s) => s.key === step)
                    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key)
                  }}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    'rounded-full text-white text-sm font-bold shadow-md shadow-primary/30',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  }}
                >
                  {t('createEvent.next', {}, { defaultValue: 'Next' })}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Right rail */}
        <aside className={cm.cn('lg:sticky lg:top-6 stack-y space-y-4')}>
          <article
            className={cm.cn(
              'p-6 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
            )}
          >
            <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary mb-2')}>
              {t('createEvent.preview.eyebrow', {}, { defaultValue: 'Live preview' })}
            </p>
            <div
              className={cm.cn('aspect-[16/9] rounded-xl relative overflow-hidden')}
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              }}
              aria-hidden="true"
            >
              <span
                className={cm.cn(
                  'absolute top-3 left-3 px-3 py-2 rounded-xl text-white text-center',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))',
                }}
              >
                <span
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest leading-none opacity-90',
                  )}
                >
                  {startDate
                    ? new Date(startDate)
                        .toLocaleDateString(undefined, { month: 'short' })
                        .toUpperCase()
                    : t('createEvent.preview.tbd', {}, { defaultValue: 'TBD' })}
                </span>
                <span className={cm.cn('block text-xl font-extrabold leading-none mt-0.5')}>
                  {startDate ? new Date(startDate).getDate() : '—'}
                </span>
              </span>
              <span
                className={cm.cn(
                  'absolute bottom-3 left-3 right-3 text-white font-extrabold text-lg leading-snug',
                )}
              >
                {title ||
                  t(
                    'createEvent.preview.titlePlaceholder',
                    {},
                    { defaultValue: 'Your event title' },
                  )}
              </span>
            </div>
            <p className={cm.cn(cm.textSize('xs'), 'mt-3 text-on-surface-variant')}>
              {t(
                'createEvent.preview.body',
                {},
                { defaultValue: 'This is how your event card looks on Discover.' },
              )}
            </p>
          </article>

          {mode === 'edit' && eventId ? (
            <article
              className={cm.cn(
                'p-6 rounded-2xl border border-error/30 bg-error/5 stack-y space-y-3',
              )}
            >
              <p className={cm.cn('text-xs font-black uppercase tracking-widest text-error')}>
                {t('nav.dangerZone', {}, { defaultValue: 'Danger zone' })}
              </p>
              <h3 className={cm.cn('text-lg font-extrabold tracking-tight')}>
                {t('createEvent.danger.heading', {}, { defaultValue: 'Cancel or delete' })}
              </h3>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'createEvent.danger.body',
                  {},
                  {
                    defaultValue:
                      'Cancelling refunds every attendee. Deleting hides the event but keeps records for audit.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleCancelClick}
                  data-mol-id="event-cancel"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'rounded-full text-sm font-bold border disabled:opacity-50',
                    armedAction === 'cancel'
                      ? 'border-error bg-error text-white'
                      : 'border-error text-error hover:bg-error/10',
                  )}
                >
                  {armedAction === 'cancel'
                    ? t(
                        'createEvent.danger.confirmCancel',
                        {},
                        { defaultValue: 'Tap again to cancel' },
                      )
                    : t('createEvent.danger.cancel', {}, { defaultValue: 'Cancel event' })}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDeleteClick}
                  data-mol-id="event-delete"
                  aria-label={
                    armedAction === 'delete'
                      ? t(
                          'createEvent.danger.confirmDeleteLabel',
                          {},
                          { defaultValue: 'Tap again to permanently delete this event' },
                        )
                      : undefined
                  }
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'rounded-full text-sm font-bold bg-error text-white disabled:opacity-50',
                    armedAction === 'delete' ? 'ring-2 ring-error ring-offset-2' : '',
                  )}
                >
                  {armedAction === 'delete'
                    ? t(
                        'createEvent.danger.confirmDelete',
                        {},
                        { defaultValue: 'Tap again to delete' },
                      )
                    : t('createEvent.danger.delete', {}, { defaultValue: 'Delete event' })}
                </button>
              </div>
              <p aria-live="polite" className={cm.cn(cm.textSize('xs'), 'text-error font-bold')}>
                {armedAction !== 'none'
                  ? t(
                      'createEvent.danger.armedHint',
                      {},
                      { defaultValue: 'Tap again to confirm — this cannot be undone.' },
                    )
                  : null}
              </p>
            </article>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

export default CreateEvent
