import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AlbumCardGrid } from '../components/AlbumCardGrid.js'
import { PhotoMasonry } from '../components/PhotoMasonry.js'
import { ApiError, getProfile, type ProfileSummary } from '../lib/api.js'

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #c8872e 0%, #855615 100%)',
  'linear-gradient(135deg, #1e293b 0%, #0c4a6e 100%)',
  'linear-gradient(135deg, #0e7490 0%, #134e4a 100%)',
  'linear-gradient(135deg, #1c1917 0%, #44403c 100%)',
  'linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)',
  'linear-gradient(135deg, #3a7ca5 0%, #1e3a52 100%)',
  'linear-gradient(135deg, #7c2d12 0%, #1c1917 100%)',
]

/**
 * Public photographer profile, backed by `GET /api/profiles/:handle`.
 *
 * Resolves `:handle` as either a username or a UUID. Renders a public-
 * safe view of the user (display name, bio, location), their public
 * portfolio (PhotoMasonry), and any public albums (AlbumCardGrid).
 *
 * The handler returns 404 (not 200 with an empty body) if the
 * photographer toggled `Public profile` off in Settings, so the page
 * shows a clean "no public profile" state without leaking that the
 * handle exists.
 */
export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { handle = '' } = useParams<{ handle: string }>()
  const [profile, setProfile] = useState<ProfileSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setProfile(null)
    if (!handle) {
      setError(t('profile.notFound', {}, { defaultValue: 'Profile not found.' }))
      setLoading(false)
      return
    }
    getProfile(handle)
      .then((p) => {
        if (cancelled) return
        setProfile(p)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        const detail =
          err instanceof ApiError
            ? err.status === 404
              ? t('profile.notFound', {}, { defaultValue: 'Profile not found.' })
              : `${err.status}: ${err.message}`
            : err instanceof Error
              ? err.message
              : String(err)
        setError(detail)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [handle, t])

  const gradient = useMemo(() => {
    const seed = (profile?.id ?? handle ?? 'profile')
      .split('')
      .reduce((s, c) => s + c.charCodeAt(0), 0)
    return COVER_GRADIENTS[Math.abs(seed) % COVER_GRADIENTS.length]
  }, [profile?.id, handle])

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto)}>
        <p
          className={'text-sm text-on-surface-variant italic py-12 text-center'}
          data-testid="profile-loading"
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-4')}
      >
        <p className={'text-sm text-error'} role="alert" data-testid="profile-error">
          {error ?? t('profile.notFound', {}, { defaultValue: 'Profile not found.' })}
        </p>
        <Link to="/explore" className="text-primary hover:underline">
          {t('profile.backToExplore', {}, { defaultValue: 'Back to Explore' })}
        </Link>
      </div>
    )
  }

  const displayName =
    profile.name?.trim() ||
    profile.username ||
    profile.handle ||
    t('profile.fallbackName', {}, { defaultValue: 'photographer' })
  const initial = displayName.charAt(0).toUpperCase()
  const handleLabel = profile.username ?? profile.id.slice(0, 8)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-10')}>
      <section
        className={
          'relative overflow-hidden rounded-[2rem] text-white p-8 md:p-12 shadow-2xl shadow-on-surface/10'
        }
        style={{ background: gradient, minHeight: '300px' }}
        data-testid="profile-hero"
      >
        <div
          className={'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl'}
          aria-hidden="true"
        />
        <div
          className={'absolute right-12 top-12 w-24 h-24 rounded-full bg-foreground/10 blur-2xl'}
          aria-hidden="true"
        />
        <div className={'relative z-10 flex flex-col md:flex-row items-start md:items-end gap-6'}>
          <div
            className={
              'w-32 h-32 md:w-40 md:h-40 rounded-full shrink-0 flex items-center justify-center text-5xl md:text-6xl font-extrabold shadow-2xl shadow-black/30'
            }
            style={{
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              fontFamily: 'Playfair Display, Georgia, serif',
            }}
            aria-hidden="true"
          >
            {initial}
          </div>
          <div className={'flex-1 min-w-0'}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/80">
              {t('profile.publicProfile', {}, { defaultValue: 'Public photographer profile' })}
            </p>
            <h1
              className={
                'text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] mt-1'
              }
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              data-testid="profile-name"
            >
              {displayName}
            </h1>
            <p className={'text-sm font-mono text-white/85 mt-1'} data-testid="profile-handle">
              @{handleLabel}
              {profile.location ? ` · ${profile.location}` : ''}
            </p>
            {profile.bio && (
              <p
                className={'text-base text-white/85 leading-relaxed mt-3 max-w-2xl'}
                data-testid="profile-bio"
              >
                {profile.bio}
              </p>
            )}
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                'mt-5 text-sm text-white/90 tabular-nums',
              )}
              data-testid="profile-stats"
            >
              <span>
                <span className="font-extrabold">{profile.photo_count}</span>{' '}
                {t('profile.photos', {}, { defaultValue: 'photographs' })}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <span className="font-extrabold">{profile.album_count}</span>{' '}
                {t('profile.albums', {}, { defaultValue: 'albums' })}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <span className="font-extrabold">
                  {profile.favorites_received.toLocaleString()}
                </span>{' '}
                {t('profile.hearted', {}, { defaultValue: 'hearts' })}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <span className="font-extrabold">{profile.views_received.toLocaleString()}</span>{' '}
                {t('profile.views', {}, { defaultValue: 'views' })}
              </span>
            </div>
            {profile.joined_at && (
              <p className={'text-xs text-white/70 mt-3'} data-testid="profile-joined">
                {t(
                  'profile.joinedAt',
                  { date: new Date(profile.joined_at).toLocaleDateString(), app: APP_NAME },
                  { defaultValue: 'on {{app}} since {{date}}' },
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={'space-y-4'} data-testid="profile-portfolio-section">
        <h2
          className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          {t('profile.portfolioHeading', {}, { defaultValue: 'Portfolio' })}
        </h2>
        <PhotoMasonry
          photos={profile.photos}
          emptyMessage={t(
            'profile.portfolioEmpty',
            {},
            { defaultValue: 'No photographs published yet.' },
          )}
        />
      </section>

      {profile.albums.length > 0 && (
        <section className={'space-y-4'} data-testid="profile-albums-section">
          <h2
            className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {t('profile.albumsHeading', {}, { defaultValue: 'Albums' })}
          </h2>
          <AlbumCardGrid albums={profile.albums} />
        </section>
      )}
    </div>
  )
}
