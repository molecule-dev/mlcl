import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface HostProfile {
  id: string
  name: string | null
  username?: string | null
  email?: string | null
  member_since: string | null
  is_superhost: boolean
  photo?: string
  stats: {
    active_listings: number
    trips_hosted: number
    reviews_received: number
    average_rating: number
  }
  oauthData?: { phone?: string; preferences?: Record<string, unknown> } | null
}

interface ProfileListing {
  id: string
  title: string
  city: string
  country: string
  thumbnail_url: string | null
  rating: number
  review_count: number
  price_per_night_cents: number
}

const FALLBACK_ABOUT =
  'I love spotting things hosts overlook — fresh towels, late-night flight kits, the perfect coffee setup. I respond within an hour, every day.'

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams<{ id: string }>()
  const id = params.id ?? ''
  const http = useHttpClient()

  const [profile, setProfile] = useState<HostProfile | null>(null)
  const [listings, setListings] = useState<ProfileListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/hosts/${id}`).catch(() => null),
      http.get(`/api/hosts/${id}/listings`).catch(() => null),
    ])
      .then(([profileRes, listingsRes]) => {
        if (cancelled) return
        const profileData = unwrapSingle<HostProfile>(profileRes)
        if (!profileData) {
          setError(t('profile.loadError', {}, { defaultValue: 'Profile unavailable.' }))
          return
        }
        setProfile(profileData)
        setListings(unwrapList<ProfileListing>(listingsRes?.data))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading) {
    return (
      <p className={'p-12 text-center text-on-surface-variant'}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }
  if (error || !profile) {
    return (
      <p className={'p-12 text-center text-error'}>
        {error ?? t('profile.notFound', {}, { defaultValue: 'Profile not found.' })}
      </p>
    )
  }

  const memberYear = profile.member_since
    ? new Date(profile.member_since).getFullYear().toString()
    : new Date().getFullYear().toString()

  const photo = profile.photo ?? `https://picsum.photos/seed/roost-host-${id.slice(-12)}/300/300`
  const fullName = profile.name?.trim() || profile.username?.trim() || 'Host'

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <section
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-white relative overflow-hidden',
        )}
      >
        <div
          className={cm.cn(
            cm.w(48),
            cm.h(48),
            cm.roundedFull,
            'absolute -right-12 -top-12 bg-accent/40 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={'relative z-10 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center'}
        >
          <img
            src={photo}
            alt={fullName}
            className={cm.cn(cm.roundedFull, 'w-32 h-32 object-cover ring-4 ring-white/30')}
          />
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-accent-on-surface',
              )}
            >
              {t(
                'profile.eyebrow',
                { since: memberYear, appName: APP_NAME },
                { defaultValue: '{{appName}} member since {{since}}' },
              )}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('5xl'),
                cm.fontWeight('extrabold'),
                cm.sp('mt', 2),
                'leading-[0.95] tracking-tight',
              )}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {fullName}
            </h1>
            {profile.is_superhost ? (
              <span
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'inline-flex rounded-full bg-amber-500 text-white uppercase tracking-widest',
                )}
              >
                <span
                  className={'material-symbols-outlined text-base'}
                  aria-hidden="true"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  workspace_premium
                </span>
                {t('profile.superhost', {}, { defaultValue: 'Superhost' })}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-3', cm.sp('mt', 6))}>
        <Stat
          label={t('profile.trips', {}, { defaultValue: 'Trips hosted' })}
          value={profile.stats.trips_hosted.toString()}
        />
        <Stat
          label={t('nav.reviews', {}, { defaultValue: 'Reviews' })}
          value={profile.stats.reviews_received.toString()}
        />
        <Stat
          label={t('form.rating', {}, { defaultValue: 'Rating' })}
          value={(profile.stats.average_rating || 0).toFixed(2)}
        />
      </section>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6', cm.sp('mt', 8))}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-2 bg-surface rounded-2xl shadow-sm',
            cm.accentCard({ tone: 'primary' }),
          )}
        >
          <h2
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}
            style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
          >
            {t('profile.about', { name: fullName }, { defaultValue: 'About {{name}}' })}
          </h2>
          <p className={cm.cn(cm.textSize('base'), 'leading-relaxed text-on-surface')}>
            {t('profile.bio', { name: fullName }, { defaultValue: FALLBACK_ABOUT })}
          </p>
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl shadow-sm space-y-3',
            cm.accentCard({ tone: 'custom' }),
          )}
          style={{ ['--mol-accent' as string]: 'var(--color-accent)' }}
        >
          <h2
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
            style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
          >
            {t('profile.verifications', {}, { defaultValue: 'Verifications' })}
          </h2>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.textSize('sm'))}>
            <li className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className="material-symbols-outlined text-success"
                aria-hidden="true"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </li>
            {profile.oauthData?.phone && (
              <li className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  className="material-symbols-outlined text-success"
                  aria-hidden="true"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
                {t('form.phone', {}, { defaultValue: 'Phone' })}
              </li>
            )}
            {profile.is_superhost && (
              <li className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  className="material-symbols-outlined text-success"
                  aria-hidden="true"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
                {t('profile.verifIdentity', {}, { defaultValue: 'Government ID' })}
              </li>
            )}
          </ul>
        </section>
      </div>

      <section className={cm.cn(cm.sp('mt', 8))}>
        <h2
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
          style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
        >
          {t('profile.hostedListings', { name: fullName }, { defaultValue: "{{name}}'s listings" })}
        </h2>
        {listings.length === 0 ? (
          <p className={'text-on-surface-variant'}>
            {t('profile.noListings', {}, { defaultValue: 'No active listings yet.' })}
          </p>
        ) : (
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-5')}>
            {listings.map((l) => (
              <Link
                key={l.id}
                to={`/listings/${l.id}`}
                className={cm.cn(
                  'group block bg-surface rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden',
                )}
              >
                <div className="aspect-[4/3] bg-surface-variant overflow-hidden">
                  {l.thumbnail_url ? (
                    <img
                      src={l.thumbnail_url}
                      alt={l.title}
                      className={cm.cn(
                        cm.w('full'),
                        cm.h('full'),
                        'object-cover transition-transform duration-500 group-hover:scale-105',
                      )}
                    />
                  ) : null}
                </div>
                <div className={cm.sp('p', 5)}>
                  <h3
                    className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
                    style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
                  >
                    {l.title}
                  </h3>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {l.city}, {l.country}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('mt', 2),
                      'text-on-surface-variant tabular-nums',
                    )}
                  >
                    <span
                      className={'material-symbols-outlined text-sm text-warning'}
                      aria-hidden="true"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    {(l.rating || 0).toFixed(2)} · {l.review_count}{' '}
                    {t('profile.reviewsLabel', {}, { defaultValue: 'reviews' })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        'bg-surface rounded-2xl shadow-sm',
        cm.accentCard({ tone: 'primary' }),
      )}
    >
      <p className={cm.accentCardLabel({ tone: 'primary' })}>{label}</p>
      <p
        className={cm.cn(
          cm.textSize('3xl'),
          cm.fontWeight('extrabold'),
          cm.sp('mt', 1),
          'tabular-nums',
        )}
      >
        {value}
      </p>
    </div>
  )
}
