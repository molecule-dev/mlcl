import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { PhotoMasonry } from '../components/PhotoMasonry.js'
import { type Album, ApiError, apiGet, deleteAlbum, getAlbum } from '../lib/api.js'

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
 * Reads the signed-in user's id. Galleries link to other photographers'
 * public albums through this page, so owner-only controls (Add photos,
 * Delete) must be gated on actual ownership — the API rejects non-owner
 * writes anyway, but the buttons shouldn't render for visitors.
 */
async function readMeId(): Promise<string | null> {
  try {
    const me = await apiGet<{ props?: { id?: string } }>('/users/me')
    return me?.props?.id ?? null
  } catch (_error) {
    // Unauthenticated or network failure — treat as not the owner.
    return null
  }
}

export function AlbumDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [album, setAlbum] = useState<Album | null>(null)
  const [meId, setMeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!id) return
    setAlbum(null)
    setError(null)
    Promise.all([getAlbum(id), readMeId()])
      .then(([data, userId]) => {
        if (cancelled) return
        setAlbum(data)
        setMeId(userId)
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

  const handleDelete = async () => {
    if (!id || !album) return
    try {
      await deleteAlbum(id)
      void track({ name: 'album.deleted', properties: { album_id: id } })
      navigate('/albums')
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

  if (error) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-4')}
      >
        <p className={'text-sm text-error'} role="alert" data-testid="album-detail-error">
          {error}
        </p>
        <Link to="/albums" className="text-primary hover:underline">
          {t('albumDetail.backToAlbums', {}, { defaultValue: 'Back to albums' })}
        </Link>
      </div>
    )
  }

  if (!album) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto)}>
        <p
          className={'text-sm text-on-surface-variant italic py-12 text-center'}
          data-testid="album-detail-loading"
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  const photos = album.photos ?? []
  const isOwner = meId !== null && meId === album.owner_id
  const gradient =
    COVER_GRADIENTS[
      Math.abs(album.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)) % COVER_GRADIENTS.length
    ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-10')}>
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          'text-[11px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        <Link to="/albums" className={'hover:text-primary transition-colors'}>
          {t('albumDetail.crumbAlbums', {}, { defaultValue: 'Albums' })}
        </Link>
        <span aria-hidden="true">·</span>
        <span data-testid="album-detail-title-crumb">{album.title}</span>
      </nav>

      <section
        className={
          'relative overflow-hidden rounded-[2rem] text-white p-8 md:p-12 shadow-2xl shadow-on-surface/10'
        }
        style={{ background: gradient, minHeight: '320px' }}
      >
        <div
          className={'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl'}
          aria-hidden="true"
        />
        <div
          className={'absolute right-12 top-12 w-24 h-24 rounded-full bg-foreground/10 blur-2xl'}
          aria-hidden="true"
        />

        <div className={'relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end'}>
          <div className={'lg:col-span-8 space-y-4'}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
              {t(
                `albumDetail.visibility.${album.visibility}`,
                {},
                { defaultValue: album.visibility },
              )}
            </p>
            <h1
              className={
                'text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.02]'
              }
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              data-testid="album-detail-title"
            >
              {album.title}
            </h1>
            {album.description && (
              <p className={'text-base md:text-lg text-white/85 leading-relaxed max-w-2xl'}>
                {album.description}
              </p>
            )}
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                'text-[11px] text-white/80 tabular-nums',
              )}
            >
              <span className={'inline-flex items-center gap-1.5'}>
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  image
                </span>
                <span data-testid="album-detail-photo-count">
                  {t(
                    'albumDetail.photoCount',
                    { count: album.photo_count },
                    { defaultValue: '{{count}} photographs' },
                  )}
                </span>
              </span>
              <span className={'inline-flex items-center gap-1.5'}>
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  schedule
                </span>
                {t(
                  'albumDetail.updated',
                  { date: new Date(album.updated_at).toLocaleDateString() },
                  { defaultValue: 'updated {{date}}' },
                )}
              </span>
            </div>
          </div>
          <div className={'lg:col-span-4 flex justify-end'}>
            <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }))}>
              {isOwner && (
                <Link
                  to={`/upload?album_id=${encodeURIComponent(album.id)}`}
                  data-testid="album-detail-add-photos"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 5),
                    'py-2.5 rounded-full text-sm font-bold bg-surface text-on-surface hover:bg-surface/90 transition-colors shadow',
                  )}
                >
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    cloud_upload
                  </span>
                  {t('albumDetail.addPhotos', {}, { defaultValue: 'Add photos' })}
                </Link>
              )}
              {isOwner && (
                <ConfirmButton
                  label={t('common.delete', {}, { defaultValue: 'Delete' })}
                  confirmLabel={t(
                    'albumDetail.confirmDelete',
                    { title: album.title },
                    {
                      defaultValue:
                        'Delete album "{{title}}"? Photos in this album will not be deleted.',
                    },
                  )}
                  pendingLabel={t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })}
                  onConfirm={handleDelete}
                  disarmSeconds={6}
                  data-mol-id="album-detail-delete"
                  data-testid="album-detail-delete"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 5),
                    'py-2.5 rounded-full text-sm font-bold border border-surface/30 text-white hover:bg-surface/10 transition-colors disabled:opacity-50',
                  )}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={'space-y-4'}>
        <header>
          <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('albumDetail.frameEyebrow', {}, { defaultValue: 'In sequence' })}
          </p>
          <h2
            className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight mt-1')}
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {t('albumDetail.frameHeading', {}, { defaultValue: 'Frames' })}
          </h2>
        </header>
        <PhotoMasonry
          photos={photos}
          emptyMessage={t(
            'albumDetail.empty',
            {},
            { defaultValue: 'No photographs in this album yet — upload some to add them.' },
          )}
        />
      </section>
    </div>
  )
}
