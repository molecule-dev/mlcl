import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { PhotoEditorLayout } from '../components/PhotoEditorLayout.js'
import { PhotoTile } from '../components/PhotoTile.js'
import {
  albumToSampleAlbum,
  type ApiAlbum,
  type ApiImage,
  imageToSamplePhoto,
} from '../lib/image-adapter.js'

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
  'linear-gradient(135deg, #1e1e36 0%, #312e81 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
]

interface BillingStatus {
  name: string
  planKey: string
  isFree: boolean
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()
  const [images, setImages] = useState<ApiImage[]>([])
  const [albums, setAlbums] = useState<ApiAlbum[]>([])
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const displayName = user?.name ?? user?.email?.split('@')[0] ?? `${APP_NAME} Photographer`
  const handle = user?.email?.split('@')[0] ?? 'lustra'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get<ApiImage[]>('/images'),
      http.get<ApiAlbum[]>('/albums'),
      http.get<BillingStatus>('/billing/status'),
    ])
      .then(([imgRes, albRes, billRes]) => {
        if (cancelled) return
        setImages(Array.isArray(imgRes.data) ? imgRes.data : [])
        setAlbums(Array.isArray(albRes.data) ? albRes.data : [])
        setBilling(billRes.data)
        setLoadError(null)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setLoadError(err.message ?? 'Could not load profile.')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const samplePhotos = useMemo(() => images.map(imageToSamplePhoto), [images])
  const sampleAlbums = useMemo(
    () => albums.map((alb) => albumToSampleAlbum(alb, images)),
    [albums, images],
  )
  const featured = samplePhotos.slice(0, 8)
  const totalEdits = images.filter(
    (img) => Array.isArray(img.edit_history) && img.edit_history.length > 0,
  ).length

  return (
    <PhotoEditorLayout
      title={t('nav.profile', {}, { defaultValue: 'Profile' })}
      breadcrumb={t('profile.breadcrumb', {}, { defaultValue: '// account › profile' })}
    >
      {/* Hero band */}
      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] border border-[var(--photo-border)] mb-8',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--photo-hero-from) 0%, var(--photo-hero-via) 40%, var(--photo-hero-to) 130%)',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-[var(--photo-accent)]/30 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute -left-10 -top-10 w-48 h-48 rounded-full bg-[var(--photo-secondary)]/20 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 lg:p-10 items-center',
          )}
        >
          <div className={cm.cn('lg:col-span-3 flex flex-col items-center lg:items-start')}>
            <div
              className={cm.cn(
                'w-32 h-32 rounded-full bg-gradient-to-br from-[var(--photo-accent)] via-[var(--photo-panel-text-highlight)] to-[var(--photo-danger)] flex items-center justify-center text-white text-5xl font-extrabold shadow-xl border-4 border-surface/40',
              )}
              aria-hidden="true"
            >
              {displayName[0]?.toUpperCase() ?? 'L'}
            </div>
            <div
              className={cm.cn(
                'mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-foreground/30 backdrop-blur text-white',
              )}
              data-mol-id="profile-plan-badge"
              data-plan-key={billing?.planKey ?? 'unknown'}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[14px]')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                verified
              </span>
              {billing
                ? t(
                    'profile.plan.named',
                    { name: billing.name },
                    { defaultValue: `${billing.name} photographer` },
                  )
                : t('profile.plan.loading', {}, { defaultValue: 'Loading plan…' })}
            </div>
          </div>
          <div className={cm.cn('lg:col-span-9')}>
            <p
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-white/75',
              )}
              data-mol-id="profile-handle"
            >
              @{handle}
            </p>
            <h2
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tighter text-white mt-2 leading-[1.02]',
              )}
              data-mol-id="profile-display-name"
            >
              {displayName}
            </h2>
            <p
              className={cm.cn('text-base md:text-lg text-white/85 leading-relaxed mt-4 max-w-2xl')}
              data-mol-id="profile-email"
            >
              {user?.email ?? ''}
            </p>
            <div className={cm.cn('mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3')}>
              <ProfileStat
                statId="frames"
                value={String(samplePhotos.length)}
                labelKey="profile.stat.frames"
                defaultLabel="Frames"
              />
              <ProfileStat
                statId="albums"
                value={String(sampleAlbums.length)}
                labelKey="profile.stat.albums"
                defaultLabel="Albums"
              />
              <ProfileStat
                statId="edits"
                value={String(totalEdits)}
                labelKey="profile.stat.edits"
                defaultLabel="Polished"
              />
              <ProfileStat
                statId="plan"
                value={billing?.name ?? '—'}
                labelKey="profile.stat.plan"
                defaultLabel="Plan"
              />
            </div>
          </div>
        </div>
      </section>

      {loadError && (
        <div
          className={cm.cn('rounded-2xl p-4 mb-6 text-sm')}
          style={{
            color: 'var(--mol-color-error)',
            border: '1px solid color-mix(in srgb, var(--mol-color-error) 40%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
          }}
          data-mol-id="profile-load-error"
        >
          {loadError}
        </div>
      )}

      {/* Featured grid */}
      <section className={cm.cn('mb-10')}>
        <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 5))}>
          <div>
            <p
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-accent)]',
              )}
            >
              {t('profile.gallery.eyebrow', {}, { defaultValue: '// public showcase' })}
            </p>
            <h3
              className={cm.cn(
                cm.textSize('2xl'),
                'font-extrabold tracking-tight text-[var(--photo-text)] mt-1',
              )}
            >
              {t('profile.gallery.title', {}, { defaultValue: 'Recent frames' })}
            </h3>
          </div>
          <Link
            to="/library"
            className={cm.cn(
              'inline-block px-1 py-2 font-mono text-[11px] uppercase tracking-widest text-[var(--photo-panel-text-accent)] hover:text-[var(--photo-danger)] transition-colors',
            )}
          >
            {t('profile.gallery.viewAll', {}, { defaultValue: 'See library →' })}
          </Link>
        </div>
        {loading ? (
          <div
            className={cm.cn(
              'rounded-2xl border border-[var(--photo-border)] bg-[var(--photo-surface)] p-6 text-center text-sm italic text-[var(--photo-text-muted)]',
            )}
            data-mol-id="profile-frames-loading"
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </div>
        ) : featured.length === 0 ? (
          <div
            className={cm.cn(
              'rounded-2xl border border-[var(--photo-border)] bg-[var(--photo-surface)] p-6 text-center text-sm italic text-[var(--photo-text-muted)]',
            )}
            data-mol-id="profile-frames-empty"
          >
            {t(
              'profile.gallery.empty',
              {},
              { defaultValue: 'No frames yet — add one in the library.' },
            )}
          </div>
        ) : (
          <ul
            className={cm.cn(
              'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[180px]',
            )}
          >
            {featured.map((photo) => (
              <PhotoTile key={photo.id} photo={photo} />
            ))}
          </ul>
        )}
      </section>

      {/* Albums rail */}
      <section>
        <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 5))}>
          <div>
            <p
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-accent)]',
              )}
            >
              {t('profile.albums.eyebrow', {}, { defaultValue: '// curated stacks' })}
            </p>
            <h3
              className={cm.cn(
                cm.textSize('2xl'),
                'font-extrabold tracking-tight text-[var(--photo-text)] mt-1',
              )}
            >
              {t('profile.albums.title', {}, { defaultValue: 'Albums' })}
            </h3>
          </div>
        </div>
        {sampleAlbums.length === 0 ? (
          <div
            className={cm.cn(
              'rounded-2xl border border-[var(--photo-border)] bg-[var(--photo-surface)] p-6 text-center text-sm italic text-[var(--photo-text-muted)]',
            )}
            data-mol-id="profile-albums-empty"
          >
            {t('profile.albums.empty', {}, { defaultValue: 'No albums yet.' })}
          </div>
        ) : (
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4')}>
            {sampleAlbums.map((album) => (
              <Link
                key={album.id}
                to={`/album/${album.id}`}
                className={cm.cn(
                  'group block bg-[var(--photo-surface)] border border-[var(--photo-border)] rounded-2xl overflow-hidden hover:border-[var(--photo-accent)]/50 transition-all hover:-translate-y-0.5',
                )}
              >
                <div
                  className={cm.cn('relative aspect-[16/10] flex items-center justify-center')}
                  style={{
                    background: COVER_GRADIENTS[album.cover_index % COVER_GRADIENTS.length],
                  }}
                >
                  <div
                    className={cm.cn(
                      'absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:18px_18px] opacity-50',
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-[56px] text-white/85 group-hover:scale-105 transition-transform',
                    )}
                    aria-hidden="true"
                  >
                    photo_album
                  </span>
                </div>
                <div className={cm.cn(cm.sp('p', 4))}>
                  <h4
                    className={cm.cn(
                      'text-base font-bold tracking-tight text-[var(--photo-text)] line-clamp-1 group-hover:text-[var(--photo-panel-text-highlight)] transition-colors',
                    )}
                  >
                    {album.title}
                  </h4>
                  <p
                    className={cm.cn(
                      'text-[10px] font-mono uppercase tracking-widest text-[var(--photo-text-muted)] mt-2',
                    )}
                  >
                    {album.photo_count}{' '}
                    {t('profile.albums.framesUnit', {}, { defaultValue: 'frames' })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PhotoEditorLayout>
  )
}

interface ProfileStatProps {
  statId: string
  value: string
  labelKey: string
  defaultLabel: string
}

function ProfileStat({ statId, value, labelKey, defaultLabel }: ProfileStatProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.cn('rounded-xl bg-surface/10 backdrop-blur border border-surface/15 p-3')}>
      <p
        className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight text-white')}
        data-mol-id={`profile-stat-${statId}`}
      >
        {value}
      </p>
      <p
        className={cm.cn(
          'text-[10px] font-mono font-bold uppercase tracking-widest text-white/75 mt-1',
        )}
      >
        {t(labelKey, {}, { defaultValue: defaultLabel })}
      </p>
    </div>
  )
}

export default Profile
