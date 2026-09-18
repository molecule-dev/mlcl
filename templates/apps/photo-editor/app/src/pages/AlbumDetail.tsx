import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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
  'linear-gradient(135deg, #1e293b 0%, #0c4a6e 100%)',
  'linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)',
]

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function AlbumDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [album, setAlbum] = useState<ApiAlbum | null>(null)
  const [images, setImages] = useState<ApiImage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([http.get<ApiAlbum>(`/albums/${id}`), http.get<ApiImage[]>('/images')])
      .then(([albRes, imgRes]) => {
        if (cancelled) return
        setAlbum(albRes.data)
        setImages(Array.isArray(imgRes.data) ? imgRes.data : [])
        setLoadError(null)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setLoadError(err.message ?? 'Could not load album.')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  const sampleAlbum = useMemo(
    () => (album ? albumToSampleAlbum(album, images) : null),
    [album, images],
  )
  const photosInAlbum = useMemo(
    () => images.filter((img) => img.album_id === id).map(imageToSamplePhoto),
    [images, id],
  )

  if (loading) {
    return (
      <PhotoEditorLayout
        title={t('albumDetail.loading.title', {}, { defaultValue: 'Album' })}
        breadcrumb={t(
          'albumDetail.breadcrumb.loading',
          {},
          { defaultValue: '// library › albums' },
        )}
      >
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            'rounded-2xl border border-[var(--photo-border)] bg-[var(--photo-surface)] text-sm italic text-[var(--photo-text-muted)]',
          )}
          data-mol-id="album-loading"
        >
          {t('albumDetail.loading', {}, { defaultValue: 'Loading album…' })}
        </div>
      </PhotoEditorLayout>
    )
  }

  if (loadError || !sampleAlbum) {
    return (
      <PhotoEditorLayout
        title={t('albumDetail.notFound.title', {}, { defaultValue: 'Album not found' })}
        breadcrumb={t(
          'albumDetail.breadcrumb.missing',
          {},
          { defaultValue: '// library › albums' },
        )}
        toolbar={
          <Link
            to="/library"
            className={cm.cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-mono uppercase tracking-widest text-[var(--photo-text-muted)] border border-[var(--photo-border)] hover:text-[var(--photo-panel-text-highlight)] hover:border-[var(--photo-accent)]/40 transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
              arrow_back
            </span>
            {t('nav.library', {}, { defaultValue: 'Library' })}
          </Link>
        }
      >
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            'rounded-2xl border border-[var(--photo-border)] bg-[var(--photo-surface)]',
          )}
          data-mol-id="album-missing"
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-[48px] text-[var(--photo-text-muted)]',
            )}
            aria-hidden="true"
          >
            photo_album
          </span>
          <p className={cm.cn('text-sm italic text-[var(--photo-text-muted)] mt-3')}>
            {loadError ??
              t('albumDetail.notFound', {}, { defaultValue: 'This album was not found.' })}
          </p>
        </div>
      </PhotoEditorLayout>
    )
  }

  const gradient = COVER_GRADIENTS[sampleAlbum.cover_index % COVER_GRADIENTS.length]

  return (
    <PhotoEditorLayout
      title={sampleAlbum.title}
      breadcrumb={t(
        'albumDetail.breadcrumb',
        { albumTitle: sampleAlbum.title },
        { defaultValue: '// library › albums › {{albumTitle}}' },
      )}
      toolbar={
        <Link
          to="/library"
          className={cm.cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-mono uppercase tracking-widest text-[var(--photo-text-muted)] border border-[var(--photo-border)] hover:text-[var(--photo-panel-text-highlight)] hover:border-[var(--photo-accent)]/40 transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
            arrow_back
          </span>
          {t('nav.library', {}, { defaultValue: 'Library' })}
        </Link>
      }
    >
      {/* Hero cover band */}
      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] border border-[var(--photo-border)] mb-8',
        )}
        style={{ background: gradient }}
        data-mol-id="album-hero"
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-surface/15 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute -left-10 -top-10 w-48 h-48 rounded-full bg-foreground/25 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 lg:p-12 items-center',
          )}
        >
          <div className={cm.cn('lg:col-span-7')}>
            <p
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-white/75',
              )}
            >
              {t('albumDetail.eyebrow', {}, { defaultValue: 'Album' })}
            </p>
            <h2
              className={cm.cn(
                'text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter leading-[1.02] text-white mt-3',
              )}
              data-mol-id="album-title"
            >
              {sampleAlbum.title}
            </h2>
            <div className={cm.cn('mt-6 flex flex-wrap items-center gap-3')}>
              <span
                className={cm.cn(
                  'px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-surface/15 backdrop-blur-md text-white',
                )}
                data-mol-id="album-photo-count"
              >
                {sampleAlbum.photo_count}{' '}
                {t('albumDetail.framesUnit', {}, { defaultValue: 'frames' })}
              </span>
              <span
                className={cm.cn(
                  'px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-foreground/30 backdrop-blur-md text-white',
                )}
              >
                {t(
                  'albumDetail.updated',
                  { date: fmtDate(sampleAlbum.updated_at) },
                  { defaultValue: 'Updated {{date}}' },
                )}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Photo grid */}
      <section>
        <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 5))}>
          <div>
            <p
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-accent)]',
              )}
            >
              {t('albumDetail.gridEyebrow', {}, { defaultValue: '// frames in this album' })}
            </p>
            <h3
              className={cm.cn(
                cm.textSize('2xl'),
                'font-extrabold tracking-tight text-[var(--photo-text)] mt-1',
              )}
            >
              {photosInAlbum.length === 0
                ? t('albumDetail.empty.title', {}, { defaultValue: 'Empty album' })
                : t(
                    'albumDetail.gridTitle',
                    { count: photosInAlbum.length },
                    { defaultValue: '{{count}} curated frames' },
                  )}
            </h3>
          </div>
        </div>
        {photosInAlbum.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('py', 16),
              cm.textCenter,
              'rounded-2xl border border-[var(--photo-border)] bg-[var(--photo-surface)]',
            )}
            data-mol-id="album-empty"
          >
            <span
              className={cm.cn(
                'material-symbols-outlined text-[48px] text-[var(--photo-text-muted)]',
              )}
              aria-hidden="true"
            >
              photo_library
            </span>
            <p className={cm.cn('text-sm italic text-[var(--photo-text-muted)] mt-3')}>
              {t(
                'albumDetail.empty.body',
                {},
                { defaultValue: 'No frames in this album yet — assign some from the library.' },
              )}
            </p>
          </div>
        ) : (
          <ul
            className={cm.cn(
              'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[180px]',
            )}
            data-mol-id="album-photo-grid"
          >
            {photosInAlbum.map((photo) => (
              <PhotoTile key={photo.id} photo={photo} />
            ))}
          </ul>
        )}
      </section>
    </PhotoEditorLayout>
  )
}

export default AlbumDetail
