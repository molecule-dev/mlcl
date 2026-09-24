/**
 * Event-type editor — `/event-types/:id` (`:id` may be `new`).
 *
 * - On mount with a real id: GET /api/event-types/:id and prefill the form.
 * - "Save changes" persists via POST or PATCH and shows the saved-at
 *   timestamp + the canonical row.
 * - Toggling Active immediately flips `is_active` (PATCH) so the public
 *   /book/:slug page reflects the change.
 * - "Copy link" copies the absolute /book/:slug URL to the clipboard.
 * - "Delete" deletes the event type and routes back to the catalog.
 *
 * NOTE: weekly availability lives on the dedicated /availability page
 * (the rules are scoped to the user, not to a single event type).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { unwrapSingle } from '../lib/unwrap.js'

const DURATION_PRESETS = [15, 30, 45, 60, 90] as const

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'reminders', label: 'Reminders' },
] as const

const LOCATION_KINDS = [
  { value: 'jitsi', label: 'Jitsi' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'in_person', label: 'In person' },
  { value: 'phone', label: 'Phone' },
  { value: 'custom', label: 'Custom' },
] as const

interface ApiEventType {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  duration_minutes: number
  location_kind: string
  location_value: unknown
  buffer_before_minutes: number
  buffer_after_minutes: number
  min_notice_minutes: number
  max_per_day: number | null
  requires_confirmation: boolean
  color: string | null
  is_active: boolean
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'event'
  )
}

export function EventTypeEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('general')

  const [name, setName] = useState('Discovery call')
  const [slug, setSlug] = useState('discovery')
  const [duration, setDuration] = useState<number>(30)
  const [description, setDescription] = useState('')
  const [locationKind, setLocationKind] = useState<string>('jitsi')
  const [bufferBefore, setBufferBefore] = useState(0)
  const [bufferAfter, setBufferAfter] = useState(0)
  const [minNotice, setMinNotice] = useState(0)
  const [active, setActive] = useState(true)
  const [loaded, setLoaded] = useState(isNew)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const slugTouchedRef = useState(!isNew)[0]
  const [slugTouched, setSlugTouched] = useState<boolean>(slugTouchedRef)

  useEffect(() => {
    if (isNew) {
      setLoaded(true)
      return
    }
    let cancelled = false
    setLoaded(false)
    setLoadError(null)
    http
      .get<ApiEventType>(`/api/event-types/${encodeURIComponent(id ?? '')}`)
      .then((res) => {
        if (cancelled) return
        const et = unwrapSingle<ApiEventType>(res)
        if (!et) {
          setLoadError(t('eventTypeEditor.notFound', {}, { defaultValue: 'Event type not found.' }))
          return
        }
        setName(et.name)
        setSlug(et.slug)
        setDuration(et.duration_minutes)
        setDescription(et.description ?? '')
        setLocationKind(et.location_kind)
        setBufferBefore(et.buffer_before_minutes)
        setBufferAfter(et.buffer_after_minutes)
        setMinNotice(et.min_notice_minutes)
        setActive(!!et.is_active)
        setSlugTouched(true)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(
          t('eventTypeEditor.loadError', {}, { defaultValue: 'Could not load this event type.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, isNew, t])

  const liveSlug = useMemo(() => slugify(slug || name || 'event'), [slug, name])

  // Auto-derive slug from name when the user hasn't edited it manually.
  useEffect(() => {
    if (slugTouched) return
    setSlug(slugify(name))
  }, [name, slugTouched])

  const buildPayload = useCallback(
    (overrides: Partial<ApiEventType> = {}): Record<string, unknown> => ({
      name: name.trim(),
      slug: liveSlug,
      description: description.trim() || null,
      duration_minutes: duration,
      location_kind: locationKind,
      buffer_before_minutes: bufferBefore,
      buffer_after_minutes: bufferAfter,
      min_notice_minutes: minNotice,
      is_active: active,
      ...overrides,
    }),
    [
      name,
      liveSlug,
      description,
      duration,
      locationKind,
      bufferBefore,
      bufferAfter,
      minNotice,
      active,
    ],
  )

  async function handleSave(event?: React.FormEvent) {
    event?.preventDefault()
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const body = buildPayload()
      let res: unknown
      if (isNew) {
        res = await http.post<ApiEventType>('/api/event-types', body)
      } else {
        res = await http.patch<ApiEventType>(
          `/api/event-types/${encodeURIComponent(id ?? '')}`,
          body,
        )
      }
      const et = unwrapSingle<ApiEventType>(res)
      if (!et) {
        setSaveError(
          t(
            'eventTypeEditor.saveErrorMissing',
            {},
            {
              defaultValue: 'Save returned no row — please try again.',
            },
          ),
        )
        return
      }
      setSavedAt(new Date())
      // Host created or updated a booking-link definition.
      void track({
        name: isNew ? 'event_type.created' : 'event_type.updated',
        properties: { event_type_id: et.id, slug: et.slug, duration_minutes: et.duration_minutes },
      })
      if (isNew) {
        navigate(`/event-types/${et.id}`, { replace: true })
      } else {
        // Reflect any server-side coercions (e.g. slug normalization).
        setName(et.name)
        setSlug(et.slug)
        setDuration(et.duration_minutes)
        setDescription(et.description ?? '')
        setLocationKind(et.location_kind)
        setBufferBefore(et.buffer_before_minutes)
        setBufferAfter(et.buffer_after_minutes)
        setMinNotice(et.min_notice_minutes)
        setActive(!!et.is_active)
      }
    } catch (err) {
      const status = (err as { response?: { status?: number; data?: { error?: string } } })
        ?.response
      setSaveError(
        status?.data?.error ??
          t('common.couldNotSaveChanges', {}, { defaultValue: 'Could not save changes.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive() {
    if (isNew) {
      setActive((v) => !v)
      return
    }
    const next = !active
    setActive(next)
    setSaving(true)
    setSaveError(null)
    try {
      const res = await http.patch<ApiEventType>(
        `/api/event-types/${encodeURIComponent(id ?? '')}`,
        { is_active: next },
      )
      const et = unwrapSingle<ApiEventType>(res)
      if (et) {
        setActive(!!et.is_active)
        setSavedAt(new Date())
      }
    } catch (error) {
      logError('eventTypeEditor.toggleActive', error)
      setActive(!next)
      setSaveError(
        t(
          'eventTypeEditor.toggleError',
          {},
          {
            defaultValue: 'Could not change active state.',
          },
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (isNew) return
    setSaveError(null)
    try {
      await http.delete(`/api/event-types/${encodeURIComponent(id ?? '')}`)
      // Host deleted a booking-link definition.
      void track({ name: 'event_type.deleted', properties: { event_type_id: id } })
      navigate('/event-types', { replace: true })
    } catch (error) {
      logError('eventTypeEditor.delete', error)
      setSaveError(
        t(
          'eventTypeEditor.deleteError',
          {},
          {
            defaultValue: 'Could not delete event type.',
          },
        ),
      )
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/book/${liveSlug}`
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => {
          setCopyState('copied')
          setTimeout(() => setCopyState('idle'), 1500)
        },
        () => {
          /* swallow — not critical, button stays in idle state */
        },
      )
    }
  }

  if (!loaded) {
    return (
      <div className={cm.cn(cm.sp('p', 8))}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('eventTypeEditor.loading', {}, { defaultValue: 'Loading event type…' })}
        </p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.stack(4))}>
        <p
          role="alert"
          data-testid="event-type-editor-load-error"
          className={cm.cn(cm.textSize('base'), 'text-error font-semibold')}
        >
          {loadError}
        </p>
        <Link
          to="/event-types"
          className={cm.cn(cm.textSize('sm'), 'text-primary font-bold hover:underline')}
        >
          {t('eventTypeEditor.back', {}, { defaultValue: 'Back to event types' })}
        </Link>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSave}
      className={cm.cn(cm.stack(8), cm.sp('p', 8), 'max-w-[1200px] mx-auto')}
    >
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div className={cm.stack(2)}>
          <Link
            to="/event-types"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              'font-bold text-primary hover:underline',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              arrow_back
            </span>
            {t('eventTypeEditor.back', {}, { defaultValue: 'Back to event types' })}
          </Link>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {name || t('eventTypeEditor.untitled', {}, { defaultValue: 'New event type' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'font-mono tabular-nums text-on-surface-variant')}>
            /book/{liveSlug}
            {!isNew && id ? ` · ${id}` : ''}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            type="button"
            data-testid="toggle-active"
            onClick={handleToggleActive}
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              cm.roundedFull,
              'uppercase tracking-widest border transition-colors disabled:opacity-50',
              active
                ? 'bg-success-container border-success/40 text-on-success-container'
                : 'bg-surface-container border-outline-variant text-on-surface-variant',
            )}
          >
            {active
              ? t('status.active', {}, { defaultValue: 'Active' })
              : t('status.paused', {}, { defaultValue: 'Paused' })}
          </button>
          <button
            type="submit"
            data-testid="save-event-type"
            disabled={saving || !name.trim()}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md',
            )}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
          </button>
          {!isNew ? (
            <ConfirmButton
              label={t('common.delete', {}, { defaultValue: 'Delete' })}
              confirmLabel={t(
                'eventTypeEditor.confirmDelete',
                {},
                { defaultValue: 'Delete this event type? Existing bookings remain.' },
              )}
              pendingLabel={t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })}
              onConfirm={handleDelete}
              disarmSeconds={6}
              data-mol-id="delete-event-type"
            />
          ) : null}
        </div>
      </header>

      {saveError ? (
        <p
          role="alert"
          data-testid="event-type-editor-save-error"
          className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
        >
          {saveError}
        </p>
      ) : null}
      {savedAt && !saveError ? (
        <p
          data-testid="event-type-editor-saved-at"
          className={cm.cn(cm.textSize('xs'), 'text-success font-semibold')}
        >
          {t(
            'common.savedAt',
            { time: savedAt.toLocaleTimeString() },
            {
              defaultValue: 'Saved at {{time}}',
            },
          )}
        </p>
      ) : null}

      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 1),
          'gap-1 border-b border-outline-variant/40',
        )}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t(`eventTypeEditor.tab.${tab.key}`, {}, { defaultValue: tab.label })}
          </button>
        ))}
      </div>

      {activeTab === 'general' ? (
        <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12')}>
          <div
            className={cm.cn(
              cm.stack(6),
              cm.sp('p', 8),
              'lg:col-span-8 bg-surface-container-lowest rounded-3xl shadow-sm',
            )}
          >
            <div className={cm.stack(2)}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-bold uppercase tracking-widest text-on-surface-variant',
                )}
                htmlFor="ete-name"
              >
                {t('eventTypeEditor.fields.name', {}, { defaultValue: 'Name' })}
              </label>
              <input
                id="ete-name"
                data-testid="event-type-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('lg'),
                  'bg-surface rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all',
                )}
              />
            </div>

            <div className={cm.stack(2)}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-bold uppercase tracking-widest text-on-surface-variant',
                )}
                htmlFor="ete-slug"
              >
                {t('eventTypeEditor.fields.slug', {}, { defaultValue: 'Booking link slug' })}
              </label>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.sp('px', 4),
                  'bg-surface rounded-xl border border-outline-variant focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all',
                )}
              >
                <span className={cm.cn(cm.textSize('sm'), 'font-mono text-on-surface-variant')}>
                  /book/
                </span>
                <input
                  id="ete-slug"
                  data-testid="event-type-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value)
                    setSlugTouched(true)
                  }}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'bg-transparent border-none focus:ring-0 focus:outline-none font-mono text-on-surface',
                  )}
                />
              </div>
            </div>

            <div className={cm.stack(2)}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.duration', {}, { defaultValue: 'Duration' })}
              </p>
              <div className={cm.cn(cm.flex({ wrap: 'wrap' }), 'gap-2')}>
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    data-testid={`duration-${d}`}
                    onClick={() => setDuration(d)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      cm.roundedFull,
                      'border transition-colors',
                      duration === d
                        ? 'bg-primary text-on-primary border-primary shadow-sm'
                        : 'bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-container-low',
                    )}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>

            <div className={cm.stack(2)}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-bold uppercase tracking-widest text-on-surface-variant',
                )}
                htmlFor="ete-location"
              >
                {t('eventTypeEditor.fields.location', {}, { defaultValue: 'Default location' })}
              </label>
              <select
                id="ete-location"
                data-testid="event-type-location"
                value={locationKind}
                onChange={(e) => setLocationKind(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'bg-surface rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all',
                )}
              >
                {LOCATION_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {t(`eventTypeEditor.location.${k.value}`, {}, { defaultValue: k.label })}
                  </option>
                ))}
              </select>
            </div>

            <div className={cm.stack(2)}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-bold uppercase tracking-widest text-on-surface-variant',
                )}
                htmlFor="ete-desc"
              >
                {t('form.description', {}, { defaultValue: 'Description' })}
              </label>
              <textarea
                id="ete-desc"
                data-testid="event-type-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'bg-surface rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all leading-relaxed',
                )}
              />
            </div>
          </div>

          <aside
            className={cm.cn(
              cm.stack(4),
              cm.sp('p', 6),
              'lg:col-span-4 bg-surface-container-lowest rounded-3xl shadow-sm',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('sm'),
                'font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('eventTypeEditor.preview.heading', {}, { defaultValue: 'Booking link preview' })}
            </h3>
            <div
              className={cm.cn(
                cm.sp('p', 5),
                cm.stack(3),
                'bg-gradient-to-br from-primary/10 to-primary-container/30 rounded-2xl border border-primary/20',
              )}
            >
              <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
                {window.location.host}
              </p>
              <p className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>{name}</p>
              <p className={cm.cn(cm.textSize('sm'), 'font-mono text-on-surface-variant')}>
                /book/{liveSlug}
              </p>
              <p
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  'font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  schedule
                </span>
                {duration} min
              </p>
            </div>
            <button
              type="button"
              data-testid="copy-link"
              onClick={handleCopyLink}
              className={cm.cn(
                cm.sp('py', 3),
                cm.roundedFull,
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'border border-outline-variant hover:bg-surface-container-low transition-colors',
              )}
            >
              {copyState === 'copied'
                ? t('common.copiedBang', {}, { defaultValue: 'Copied!' })
                : t('eventTypeEditor.preview.copy', {}, { defaultValue: 'Copy link' })}
            </button>

            <div
              className={cm.cn(cm.stack(3), cm.sp('pt', 4), 'border-t border-outline-variant/40')}
            >
              <h4
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('eventTypeEditor.advanced.heading', {}, { defaultValue: 'Buffers + notice' })}
              </h4>
              <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
                <label
                  className={cm.cn(
                    cm.flex({ direction: 'col' }),
                    'gap-1 text-xs flex-1 min-w-[120px]',
                  )}
                >
                  {t(
                    'eventTypeEditor.advanced.bufferBefore',
                    {},
                    { defaultValue: 'Buffer before (min)' },
                  )}
                  <input
                    type="number"
                    min={0}
                    max={720}
                    data-testid="buffer-before"
                    value={bufferBefore}
                    onChange={(e) => setBufferBefore(Math.max(0, Number(e.target.value) || 0))}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none text-sm font-mono tabular-nums',
                    )}
                  />
                </label>
                <label
                  className={cm.cn(
                    cm.flex({ direction: 'col' }),
                    'gap-1 text-xs flex-1 min-w-[120px]',
                  )}
                >
                  {t(
                    'eventTypeEditor.advanced.bufferAfter',
                    {},
                    { defaultValue: 'Buffer after (min)' },
                  )}
                  <input
                    type="number"
                    min={0}
                    max={720}
                    data-testid="buffer-after"
                    value={bufferAfter}
                    onChange={(e) => setBufferAfter(Math.max(0, Number(e.target.value) || 0))}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none text-sm font-mono tabular-nums',
                    )}
                  />
                </label>
                <label
                  className={cm.cn(
                    cm.flex({ direction: 'col' }),
                    'gap-1 text-xs flex-1 min-w-[120px]',
                  )}
                >
                  {t(
                    'eventTypeEditor.advanced.minNotice',
                    {},
                    { defaultValue: 'Min. notice (min)' },
                  )}
                  <input
                    type="number"
                    min={0}
                    max={43200}
                    data-testid="min-notice"
                    value={minNotice}
                    onChange={(e) => setMinNotice(Math.max(0, Number(e.target.value) || 0))}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none text-sm font-mono tabular-nums',
                    )}
                  />
                </label>
              </div>
            </div>
          </aside>
        </section>
      ) : null}

      {activeTab === 'reminders' ? (
        <section
          className={cm.cn(
            cm.sp('p', 8),
            cm.stack(4),
            'bg-surface-container-lowest rounded-3xl shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
            {t('eventTypeEditor.reminders.heading', {}, { defaultValue: 'Reminders' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'eventTypeEditor.reminders.body',
              {},
              {
                defaultValue:
                  'Email reminders fire automatically — invitee gets a confirmation right away and the host gets a "new booking" notice.',
              },
            )}
          </p>
        </section>
      ) : null}
    </form>
  )
}

export default EventTypeEditor
