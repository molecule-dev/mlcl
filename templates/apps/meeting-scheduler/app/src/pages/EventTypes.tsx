/**
 * Authed event-types catalog. Lists everything the user owns from
 * /api/event-types, supports creating a new one (navigates to
 * /event-types/new) and deleting (DELETE /api/event-types/:id with
 * optimistic update + rollback).
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EventTypeCard, type EventTypeRow } from '../components/EventTypeCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiEventType {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  duration_minutes: number
  location_kind: string
  is_active: boolean
  color: string | null
}

const LOCATION_LABELS: Record<string, string> = {
  jitsi: 'Jitsi',
  zoom: 'Zoom',
  google_meet: 'Google Meet',
  in_person: 'In person',
  phone: 'Phone',
  custom: 'Custom',
}

function toCardRow(et: ApiEventType): EventTypeRow {
  return {
    id: et.id,
    name: et.name,
    slug: et.slug,
    duration_minutes: et.duration_minutes,
    description: et.description,
    location: LOCATION_LABELS[et.location_kind] ?? et.location_kind,
    color: et.color,
    active: et.is_active,
  }
}

export function EventTypes() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [eventTypes, setEventTypes] = useState<ApiEventType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/event-types')
      .then((res) => {
        if (cancelled) return
        setEventTypes(unwrapList<ApiEventType>(res))
      })
      .catch(() => {
        if (cancelled) return
        setError(t('eventTypes.loadError', {}, { defaultValue: 'Failed to load event types.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const empty = !loading && eventTypes.length === 0 && !error

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), 'max-w-[1440px] mx-auto')}>
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div className={cm.stack(2)}>
          <p
            className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-widest text-primary')}
          >
            {t('eventTypes.eyebrow', {}, { defaultValue: 'Bookable links' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('eventTypes.title', {}, { defaultValue: 'Event types' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('medium'),
              'text-on-surface-variant/80 max-w-2xl',
            )}
          >
            {t(
              'eventTypes.subtitle',
              {},
              {
                defaultValue:
                  'Each link is a fixed-duration meeting type. Customize availability, buffers, and reminders independently.',
              },
            )}
          </p>
        </div>
        <Link
          to="/event-types/new"
          data-testid="new-event-type"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            add
          </span>
          {t('eventTypes.create', {}, { defaultValue: 'New event type' })}
        </Link>
      </header>

      {error ? (
        <p
          role="alert"
          data-testid="event-types-error"
          className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('eventTypes.loading', {}, { defaultValue: 'Loading event types…' })}
        </p>
      ) : empty ? (
        <div
          data-testid="event-types-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            cm.stack(4),
            'bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl text-primary/60 mx-auto')}
            aria-hidden="true"
          >
            event
          </span>
          <p className={cm.cn(cm.textSize('lg'), 'font-bold text-on-surface')}>
            {t('eventTypes.empty.title', {}, { defaultValue: 'No event types yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md mx-auto')}>
            {t(
              'eventTypes.empty.body',
              {},
              {
                defaultValue:
                  'Create your first booking link — pick a name, slug, and duration and we’ll handle the rest.',
              },
            )}
          </p>
          <Link
            to="/event-types/new"
            data-testid="empty-create-event-type"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'inline-block bg-primary text-on-primary rounded-full hover:opacity-90 transition-opacity',
            )}
          >
            {t('eventTypes.empty.cta', {}, { defaultValue: 'Create event type' })}
          </Link>
        </div>
      ) : (
        <section
          data-testid="event-types-list"
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3')}
        >
          {eventTypes.map((et) => (
            <EventTypeCard key={et.id} eventType={toCardRow(et)} />
          ))}
        </section>
      )}
    </div>
  )
}

export default EventTypes
