import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { ExifPanel } from '../components/ExifPanel.js'
import { ApiError, deletePhoto, favoritePhoto, getPhoto, type Photo } from '../lib/api.js'

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #c8872e 0%, #a66e1f 50%, #855615 100%)',
  'linear-gradient(135deg, #1e293b 0%, #334155 50%, #0c4a6e 100%)',
  'linear-gradient(135deg, #0e7490 0%, #155e75 50%, #134e4a 100%)',
  'linear-gradient(135deg, #1c1917 0%, #44403c 50%, #78716c 100%)',
  'linear-gradient(135deg, #c2410c 0%, #9a3412 50%, #7c2d12 100%)',
  'linear-gradient(135deg, #3a7ca5 0%, #2d6384 50%, #1e3a52 100%)',
  'linear-gradient(135deg, #7c2d12 0%, #5e2412 50%, #1c1917 100%)',
]

interface CurrentUser {
  id: string
  name?: string | null
  username?: string | null
  oauthData?: { photoPrefs?: { showExif?: boolean; allowDownload?: boolean } } | null
}

interface MeResponse {
  props?: CurrentUser
}

async function readMe(): Promise<CurrentUser | null> {
  try {
    const res = await fetch('/api/users/me', { credentials: 'include' })
    if (!res.ok) return null
    const body = (await res.json()) as MeResponse
    return body?.props ?? null
  } catch (_error) {
    // Network or parse failure — treat as unauthenticated
    return null
  }
}

export function PhotoDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [favPending, setFavPending] = useState(false)
  const [me, setMe] = useState<CurrentUser | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!id) return
    setPhoto(null)
    setError(null)
    Promise.all([getPhoto(id), readMe()])
      .then(([p, u]) => {
        if (cancelled) return
        setPhoto(p)
        setMe(u)
      })
      .catch((err) => {
        if (cancelled) return
        const detail =
          err instanceof ApiError
            ? `${err.status}: ${err.message}`
            : err instanceof Error
              ? err.message
              : String(err)
        setError(detail)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const onFavorite = async () => {
    if (!id || !photo) return
    setFavPending(true)
    try {
      const result = await favoritePhoto(id)
      setPhoto({ ...photo, favorited: result.favorited, favorite_count: result.favorite_count })
      void track({
        name: 'photo.liked',
        properties: { photo_id: id, favorited: result.favorited },
      })
    } catch (err) {
      const detail =
        err instanceof ApiError
          ? `${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err)
      setError(detail)
    } finally {
      setFavPending(false)
    }
  }

  const onDelete = async () => {
    if (!id || !photo) return
    try {
      await deletePhoto(id)
      void track({ name: 'photo.deleted', properties: { photo_id: id } })
      navigate('/my-photos')
    } catch (err) {
      const detail =
        err instanceof ApiError
          ? `${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err)
      setError(detail)
    }
  }

  const onDownload = async () => {
    if (!photo) return
    setDownloadError(null)
    try {
      const res = await fetch(photo.original_url || photo.large_url, { credentials: 'include' })
      if (!res.ok) {
        throw new Error(`Download failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(photo.title || 'photo').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.${photo.exif_data && typeof (photo.exif_data as Record<string, unknown>).format === 'string' ? (photo.exif_data as Record<string, string>).format : 'jpg'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : String(err))
    }
  }

  if (error) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-4')}
      >
        <p className={'text-sm text-error'} role="alert" data-testid="photo-detail-error">
          {error}
        </p>
        <Link to="/explore" className="text-primary hover:underline">
          {t('photoDetail.backToExplore', {}, { defaultValue: 'Back to Explore' })}
        </Link>
      </div>
    )
  }

  if (!photo) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto)}>
        <p
          className={'text-sm text-on-surface-variant italic py-12 text-center'}
          data-testid="photo-detail-loading"
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  const handle =
    photo.owner?.username ??
    photo.owner?.name ??
    t('photoDetail.fallbackHandle', {}, { defaultValue: 'photographer' })
  const ownerName = photo.owner?.name ?? handle
  const gradient =
    COVER_GRADIENTS[
      Math.abs(photo.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)) % COVER_GRADIENTS.length
    ]
  const isOwner = !!me && me.id === photo.owner_id
  // Owner-side preferences from oauthData.photoPrefs. Owners always see
  // EXIF + the download button on their own photos; visitors see them
  // only when the owner opted in (defaults follow Settings.tsx
  // DEFAULT_PREFS — showExif:true, allowDownload:false).
  const ownerPrefs = photo.owner_prefs ?? null
  const visitorCanSeeExif = ownerPrefs?.showExif !== false
  const visitorCanDownload = ownerPrefs?.allowDownload === true
  const showExif = isOwner || visitorCanSeeExif
  const allowDownload = isOwner || visitorCanDownload
  // The owner's "Display location metadata" preference (owner_prefs.showLocation,
  // default on) — was never consumed, so a photo's GPS showed to everyone. Owners
  // always see their own; visitors see the location row only when the owner opted in.
  const showLocation = isOwner || ownerPrefs?.showLocation !== false

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-10')}>
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          'text-[11px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        <Link to="/explore" className={'hover:text-primary transition-colors'}>
          {t('photoDetail.crumbExplore', {}, { defaultValue: 'Explore' })}
        </Link>
        <span aria-hidden="true">·</span>
        <span>@{handle}</span>
        <span aria-hidden="true">·</span>
        <span data-testid="photo-detail-title-crumb">
          {photo.title || t('status.untitled', {}, { defaultValue: 'Untitled' })}
        </span>
      </nav>

      <div className={'grid grid-cols-1 lg:grid-cols-12 gap-8'}>
        <div className={'lg:col-span-8 space-y-6'}>
          <div
            className={
              'relative w-full rounded-3xl overflow-hidden shadow-xl shadow-on-surface/10 bg-surface-container-low'
            }
            style={{
              background: gradient,
              aspectRatio:
                photo.width && photo.height ? `${photo.width} / ${photo.height}` : '16 / 10',
            }}
          >
            <img
              src={photo.large_url || photo.original_url}
              alt={
                photo.title ??
                t('photoDetail.photoAlt', { handle }, { defaultValue: 'Photo by {{handle}}' })
              }
              className={'absolute inset-0 w-full h-full object-cover'}
              data-testid="photo-detail-image"
            />
          </div>

          <header className={'space-y-3'}>
            {photo.tags && photo.tags.length > 0 && (
              <p className="text-[11px] font-black uppercase tracking-widest text-primary">
                {photo.tags.slice(0, 3).join(' · ')}
              </p>
            )}
            <h1
              className={cm.cn(
                cm.textSize('4xl'),
                'font-extrabold tracking-tight leading-[1.05] md:text-5xl',
              )}
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              data-testid="photo-detail-title"
            >
              {photo.title || t('status.untitled', {}, { defaultValue: 'Untitled' })}
            </h1>
            {photo.caption && (
              <p className={'text-lg text-on-surface-variant leading-relaxed max-w-2xl'}>
                {photo.caption}
              </p>
            )}
            {photo.description && photo.description !== photo.caption && (
              <p className={'text-sm text-on-surface-variant leading-relaxed max-w-2xl'}>
                {photo.description}
              </p>
            )}
          </header>

          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), 'pb-2')}>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <span
                className={
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0'
                }
                style={{ background: gradient }}
                aria-hidden="true"
              >
                {ownerName.charAt(0).toUpperCase()}
              </span>
              <span>
                <span className={'block text-sm font-bold'}>{ownerName}</span>
                <span className="block text-[11px] font-mono text-on-surface-variant">
                  @{handle}
                </span>
              </span>
            </div>

            <span aria-hidden="true" className="text-on-surface-variant">
              ·
            </span>

            <button
              type="button"
              onClick={onFavorite}
              disabled={favPending}
              aria-pressed={!!photo.favorited}
              data-testid="photo-detail-favorite"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                'py-2 rounded-full text-sm font-bold transition-colors disabled:opacity-50',
                photo.favorited
                  ? 'bg-error/10 text-error'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container',
              )}
            >
              <span
                className={'material-symbols-outlined text-base'}
                style={photo.favorited ? { fontVariationSettings: "'FILL' 1" } : undefined}
                aria-hidden="true"
              >
                favorite
              </span>
              <span className="tabular-nums" data-testid="photo-detail-favorite-count">
                {photo.favorite_count.toLocaleString()}
              </span>
            </button>

            {allowDownload && (
              <button
                type="button"
                onClick={onDownload}
                data-testid="photo-detail-download"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  'py-2 rounded-full text-sm font-bold bg-surface-container-lowest text-on-surface hover:bg-surface-container transition-colors',
                )}
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  download
                </span>
                {t('common.download', {}, { defaultValue: 'Download' })}
              </button>
            )}

            {isOwner && (
              <ConfirmButton
                label={t('common.delete', {}, { defaultValue: 'Delete' })}
                confirmLabel={t(
                  'photoDetail.confirmDelete',
                  {},
                  { defaultValue: 'Delete this photo? This cannot be undone.' },
                )}
                pendingLabel={t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })}
                onConfirm={onDelete}
                disarmSeconds={6}
                data-mol-id="photo-detail-delete"
                data-testid="photo-detail-delete"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  'py-2 rounded-full text-sm font-bold bg-error/10 text-error hover:bg-error/20 transition-colors disabled:opacity-50',
                )}
              />
            )}
          </div>

          {downloadError && (
            <p
              className={'text-sm text-error'}
              role="alert"
              data-testid="photo-detail-download-error"
            >
              {downloadError}
            </p>
          )}
        </div>

        <aside className={'lg:col-span-4 space-y-5 lg:sticky lg:top-6 lg:self-start'}>
          {showExif && (
            <ExifPanel exif={photo.exif_data ?? undefined} showLocation={showLocation} />
          )}

          {photo.tags && photo.tags.length > 0 && (
            <div className={'bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden'}>
              <header
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  'border-b border-outline-variant/60',
                )}
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t('form.tags', {}, { defaultValue: 'Tags' })}
                </p>
              </header>
              <div
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  cm.flex({ wrap: 'wrap', gap: 'sm' }),
                )}
              >
                {photo.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/explore?tag=${encodeURIComponent(tag)}`}
                    className={
                      'px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-surface-container text-on-surface-variant hover:bg-primary hover:text-on-primary transition-colors'
                    }
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div
            className={cm.cn(
              cm.sp('p', 5),
              'bg-surface-container-lowest rounded-2xl shadow-sm space-y-3',
            )}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {t('photoDetail.statsEyebrow', {}, { defaultValue: 'Frame stats' })}
            </p>
            <dl className={'space-y-2 text-sm'}>
              <div className={cm.flex({ justify: 'between' })}>
                <dt className="text-on-surface-variant">
                  {t('photoDetail.uploaded', {}, { defaultValue: 'Uploaded' })}
                </dt>
                <dd className="font-mono tabular-nums">
                  {new Date(photo.uploaded_at).toLocaleDateString()}
                </dd>
              </div>
              <div className={cm.flex({ justify: 'between' })}>
                <dt className="text-on-surface-variant">
                  {t('photoDetail.views', {}, { defaultValue: 'Views' })}
                </dt>
                <dd className="font-mono tabular-nums">{photo.view_count.toLocaleString()}</dd>
              </div>
              <div className={cm.flex({ justify: 'between' })}>
                <dt className="text-on-surface-variant">
                  {t('photoDetail.favorites', {}, { defaultValue: 'Favorites' })}
                </dt>
                <dd className="font-mono tabular-nums">{photo.favorite_count.toLocaleString()}</dd>
              </div>
              <div className={cm.flex({ justify: 'between' })}>
                <dt className="text-on-surface-variant">
                  {t('photoDetail.dimensions', {}, { defaultValue: 'Dimensions' })}
                </dt>
                <dd className="font-mono tabular-nums">
                  {photo.width && photo.height ? `${photo.width} × ${photo.height}` : '—'}
                </dd>
              </div>
              <div className={cm.flex({ justify: 'between' })}>
                <dt className="text-on-surface-variant">
                  {t('photoDetail.visibility', {}, { defaultValue: 'Visibility' })}
                </dt>
                <dd className="font-mono tabular-nums">
                  {t(
                    `photoDetail.visibility.${photo.visibility}`,
                    {},
                    { defaultValue: photo.visibility },
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  )
}
