import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  type BookingStatus,
  BookingTimelineEntry,
  type BookingType,
} from '../components/BookingTimelineEntry.js'
import { HealthSummaryTriad } from '../components/HealthSummaryTriad.js'
import { PetProfileCard } from '../components/PetProfileCard.js'
import type { PetHealth, PetSpecies } from '../components/PetSnapshotHero.js'
import { type PetChip, PetSnapshotHero } from '../components/PetSnapshotHero.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiPet {
  id: string
  name: string
  species: string
  breed?: string
  date_of_birth?: string
  photo_url?: string
  health_status?: string
}

interface ApiBooking {
  id: string
  service?: string
  status?: string
  start_date?: string
  end_date?: string
  sitter_name?: string
  pet_name?: string
  notes?: string
}

interface ApiReminder {
  id: string
  title: string
  kind?: string
  reminder_date: string
  pet_name?: string
}

function speciesOf(s: string | undefined): PetSpecies {
  switch (s) {
    case 'dog':
      return 'dog'
    case 'cat':
      return 'cat'
    case 'bird':
      return 'bird'
    case 'rabbit':
      return 'rabbit'
    case 'fish':
      return 'fish'
    default:
      return 'other'
  }
}

function healthOf(s: string | undefined): PetHealth {
  if (s === 'attention' || s === 'critical') return s
  return 'healthy'
}

function ageOf(dob: string | undefined): string | undefined {
  if (!dob) return undefined
  const t = Date.now() - new Date(dob).getTime()
  if (Number.isNaN(t)) return undefined
  const years = Math.floor(t / (365.25 * 24 * 3600 * 1000))
  if (years >= 1) return `${years} yr${years === 1 ? '' : 's'}`
  const months = Math.max(1, Math.floor(t / (30 * 24 * 3600 * 1000)))
  return `${months} mo`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function bookingTypeOf(service: string | undefined): BookingType {
  if (service === 'walks' || service === 'walk') return 'walk'
  if (service === 'overnight' || service === 'boarding') return 'sitting'
  if (service === 'medication') return 'vet'
  return 'sitting'
}

function bookingStatusOf(status: string | undefined): BookingStatus {
  if (status === 'confirmed' || status === 'in_progress') return 'confirmed'
  if (status === 'requested' || status === 'pending') return 'pending'
  return 'upcoming'
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()
  const [pets, setPets] = useState<ApiPet[]>([])
  const [bookings, setBookings] = useState<ApiBooking[]>([])
  const [reminders, setReminders] = useState<ApiReminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.allSettled([
      http.get('/api/pets?limit=8'),
      http.get('/api/bookings/upcoming'),
      http.get('/api/health/reminders'),
    ]).then(([p, b, r]) => {
      if (cancelled) return
      if (p.status === 'fulfilled') setPets(unwrapList<ApiPet>(p.value))
      else console.error('[Dashboard] pets failed', p.reason)
      if (b.status === 'fulfilled') setBookings(unwrapList<ApiBooking>(b.value))
      else console.error('[Dashboard] bookings failed', b.reason)
      if (r.status === 'fulfilled') setReminders(unwrapList<ApiReminder>(r.value))
      else console.error('[Dashboard] reminders failed', r.reason)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [http])

  const heroPets: ReadonlyArray<PetChip> = pets.slice(0, 6).map((p) => ({
    id: p.id,
    name: p.name,
    species: speciesOf(p.species),
    health: healthOf(p.health_status),
    photoUrl: p.photo_url,
  }))

  const profileCardData = pets.slice(0, 4).map((p) => ({
    id: p.id,
    name: p.name,
    species: speciesOf(p.species),
    breed: p.breed,
    ageLabel: ageOf(p.date_of_birth),
    photoUrl: p.photo_url,
    health: healthOf(p.health_status),
  }))

  const fallbackService = t('bookings.fallbackService', {}, { defaultValue: 'Booking' })
  const fallbackSitter = t('messages.sitterFallback', {}, { defaultValue: 'Sitter' })
  const upcomingBookings = bookings.slice(0, 4).map((b) => ({
    id: b.id,
    dateLabel: b.start_date ? fmtDate(b.start_date) : '—',
    timeLabel: b.start_date ? fmtTime(b.start_date) : undefined,
    type: bookingTypeOf(b.service),
    status: bookingStatusOf(b.status),
    title: `${b.service || fallbackService}${b.pet_name ? ` · ${b.pet_name}` : ''}`,
    providerName: b.sitter_name || fallbackSitter,
    petsLabel: b.pet_name,
    summary: b.notes,
  }))

  const ownerName = user?.name?.split(' ')[0] || user?.email?.split('@')[0]
  const petsCount = pets.length
  const upcomingCount = bookings.length
  const alertsCount = reminders.length
  const refillsDue = reminders.filter((r) => r.kind === 'medication').length

  const nextBooking = upcomingBookings[0]
  const nextLabel = nextBooking
    ? `${nextBooking.dateLabel} · ${nextBooking.providerName}`
    : undefined

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-dashboard">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-widest text-primary-dark dark:text-primary mb-1',
            )}
          >
            {t('status.today', {}, { defaultValue: 'Today' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('dashboard.title', {}, { defaultValue: 'Pet household' })}
          </h1>
        </div>
        <Link
          to="/pets"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-xl bg-primary text-on-primary hover:opacity-90 transition-opacity',
          )}
          data-mol-id="dashboard-add-pet"
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>add</span>
          {t('dashboard.addPetCta', {}, { defaultValue: 'Add a pet' })}
        </Link>
      </div>

      <PetSnapshotHero
        ownerName={ownerName}
        pets={heroPets}
        petsCount={petsCount}
        upcomingCount={upcomingCount}
        alertsCount={alertsCount}
        nextAppointmentLabel={nextLabel}
      />

      <div className={cm.sp('mt', 8)}>
        <HealthSummaryTriad
          petsCount={petsCount}
          upcomingBookingsCount={upcomingCount}
          alertsCount={alertsCount}
          refillsDueCount={refillsDue}
        />
      </div>

      {/* Two-pane: pet roster + upcoming bookings */}
      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-2', cm.sp('mt', 8))}>
        <section>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('dashboard.petsTitle', {}, { defaultValue: 'Your pets' })}
            </h2>
            <Link
              to="/pets"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-primary uppercase tracking-widest hover:underline',
              )}
            >
              {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
            </Link>
          </div>
          {loading ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : profileCardData.length === 0 ? (
            <div
              className={cm.cn(
                cm.textCenter,
                cm.sp('py', 8),
                'rounded-xl bg-surface-container-low',
              )}
              data-mol-id="dashboard-empty-pets"
            >
              <span
                className={cm.cn(
                  'material-symbols-outlined text-5xl text-primary mb-2 block opacity-50',
                )}
              >
                pets
              </span>
              <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {t('dashboard.noPets', {}, { defaultValue: 'No pets yet' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'dashboard.addFirstPet',
                  {},
                  {
                    defaultValue: 'Add a pet to start tracking care, vet visits, and medications.',
                  },
                )}
              </p>
              <Link
                to="/pets"
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-xl text-white inline-flex',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
                }}
              >
                {t('dashboard.goToPets', {}, { defaultValue: 'Add your first pet' })}
              </Link>
            </div>
          ) : (
            <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
              {profileCardData.map((p) => (
                <PetProfileCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  species={p.species}
                  breed={p.breed}
                  ageLabel={p.ageLabel}
                  photoUrl={p.photoUrl}
                  health={p.health}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('dashboard.upcomingTitle', {}, { defaultValue: 'Upcoming bookings' })}
            </h2>
            <Link
              to="/bookings"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-primary uppercase tracking-widest hover:underline',
              )}
            >
              {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
            </Link>
          </div>
          {loading ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : upcomingBookings.length === 0 ? (
            <div
              className={cm.cn(
                cm.textCenter,
                cm.sp('py', 8),
                'rounded-xl bg-surface-container-low',
              )}
              data-mol-id="dashboard-empty-bookings"
            >
              <span
                className={cm.cn(
                  'material-symbols-outlined text-5xl text-primary mb-2 block opacity-50',
                )}
              >
                event_available
              </span>
              <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {t('dashboard.noBookings', {}, { defaultValue: 'No upcoming bookings' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'dashboard.bookSitter',
                  {},
                  { defaultValue: 'Browse vetted sitters to schedule a visit.' },
                )}
              </p>
              <Link
                to="/sitters"
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-xl text-white inline-flex',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
                }}
              >
                {t('dashboard.findSitter', {}, { defaultValue: 'Find a sitter' })}
              </Link>
            </div>
          ) : (
            <div>
              {upcomingBookings.map((b, i) => (
                <BookingTimelineEntry
                  key={b.id}
                  id={b.id}
                  dateLabel={b.dateLabel}
                  timeLabel={b.timeLabel}
                  type={b.type}
                  status={b.status}
                  title={b.title}
                  providerName={b.providerName}
                  petsLabel={b.petsLabel}
                  summary={b.summary}
                  isLast={i === upcomingBookings.length - 1}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
