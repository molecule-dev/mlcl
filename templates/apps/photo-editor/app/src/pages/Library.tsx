import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
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

const FILTERS = [
  { id: 'all', icon: 'grid_view', labelKey: 'library.filter.all', defaultLabel: 'All photos' },
  { id: 'edited', icon: 'edit', labelKey: 'library.filter.edited', defaultLabel: 'Edited' },
  { id: 'recent', icon: 'schedule', labelKey: 'library.filter.recent', defaultLabel: 'Recent' },
  { id: 'starred', icon: 'star', labelKey: 'library.filter.starred', defaultLabel: 'Starred' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const ALBUM_GRADIENTS = [
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
  'linear-gradient(135deg, #1e1e36 0%, #312e81 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #1e293b 0%, #0c4a6e 100%)',
  'linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)',
]

export function Library() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterId>('all')
  const [images, setImages] = useState<ApiImage[]>([])
  const [albums, setAlbums] = useState<ApiAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showNewImage, setShowNewImage] = useState(false)

  // Escape closes the new-image modal (keyboard equivalent of the
  // pointer-only backdrop click).
  useEffect(() => {
    if (!showNewImage) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowNewImage(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showNewImage])
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newSubmitting, setNewSubmitting] = useState(false)
  const [newError, setNewError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get<ApiImage[]>('/images'), http.get<ApiAlbum[]>('/albums')])
      .then(([imgRes, albRes]) => {
        if (cancelled) return
        setImages(Array.isArray(imgRes.data) ? imgRes.data : [])
        setAlbums(Array.isArray(albRes.data) ? albRes.data : [])
        setLoadError(null)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setLoadError(err.message ?? 'Could not load library.')
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

  const filteredPhotos = useMemo(() => {
    return samplePhotos.filter((p) => {
      if (filter === 'edited') return Boolean(p.edited_at)
      if (filter === 'recent') {
        return Date.now() - new Date(p.uploaded_at).getTime() <= SEVEN_DAYS_MS
      }
      if (filter === 'starred') {
        return p.tags.includes('starred')
      }
      return true
    })
  }, [samplePhotos, filter])

  const totalSizeMb = useMemo(
    () => (samplePhotos.reduce((acc, p) => acc + p.size_bytes, 0) / 1_000_000).toFixed(0),
    [samplePhotos],
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUrl.trim() || !newName.trim()) return
    setNewSubmitting(true)
    setNewError(null)
    try {
      const res = await http.post<ApiImage>('/images', {
        name: newName.trim(),
        original_url: newUrl.trim(),
      })
      const created = res.data
      setImages((prev) => [created, ...prev])
      setShowNewImage(false)
      setNewName('')
      setNewUrl('')
      track({ name: 'photo.uploaded', properties: { image_id: created.id } })
      navigate(`/editor?photo=${created.id}`)
    } catch (err) {
      setNewError(err instanceof Error ? err.message : 'Could not create image.')
    } finally {
      setNewSubmitting(false)
    }
  }

  return (
    <PhotoEditorLayout
      title={t('nav.library', {}, { defaultValue: 'Library' })}
      breadcrumb={t('library.breadcrumb', {}, { defaultValue: '// library › all photos' })}
      toolbar={
        <button
          type="button"
          onClick={() => setShowNewImage(true)}
          data-mol-id="library-new-edit"
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            'rounded-md bg-gradient-to-r from-[var(--photo-accent)] to-[var(--photo-danger)] text-white hover:opacity-90 transition-opacity uppercase tracking-widest font-mono',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
            add_a_photo
          </span>
          <span>{t('library.newEdit', {}, { defaultValue: 'New edit' })}</span>
        </button>
      }
    >
      {/* Hero KPI strip — gradient band with library stats */}
      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] border border-[var(--photo-border)] mb-8',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--photo-surface-elevated) 0%, var(--color-secondary-container) 50%, var(--color-tertiary-container) 130%)',
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
            'absolute -left-10 -top-10 w-48 h-48 rounded-full bg-[var(--photo-danger)]/20 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 p-8 lg:p-10 items-center',
          )}
        >
          <div className={cm.cn('md:col-span-7')}>
            <p
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-white/70',
              )}
            >
              {t('nav.yourLibrary', {}, { defaultValue: 'Your library' })}
            </p>
            <h2
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tighter leading-[1.02] text-white mt-2',
              )}
              data-mol-id="library-hero-headline"
              data-photo-count={samplePhotos.length}
            >
              {samplePhotos.length === 0
                ? t('library.hero.headlineEmpty', {}, { defaultValue: 'Open your darkroom' })
                : t(
                    'library.hero.headline',
                    { count: samplePhotos.length },
                    { defaultValue: '{{count}} frames in flight' },
                  )}
            </h2>
            <p className={cm.cn('text-base text-white/85 mt-3 max-w-md')}>
              {samplePhotos.length === 0
                ? t(
                    'library.hero.bodyEmpty',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        'Upload your first frame to start editing — drop in a public image URL and {{appName}} opens it in the editor.',
                    },
                  )
                : t(
                    'library.hero.body',
                    {},
                    {
                      defaultValue:
                        'Pick a frame to open in the Editor, or scroll to the bottom and start a new edit from scratch.',
                    },
                  )}
            </p>
          </div>
          <div className={cm.cn('md:col-span-5 grid grid-cols-3 gap-3')}>
            <Stat
              value={String(samplePhotos.length)}
              labelKey="library.hero.statPhotos"
              defaultLabel="Photos"
              accent="#a78bfa"
            />
            <Stat
              value={String(sampleAlbums.length)}
              labelKey="library.hero.statAlbums"
              defaultLabel="Albums"
              accent="#f472b6"
            />
            <Stat
              value={`${totalSizeMb}MB`}
              labelKey="library.hero.statSize"
              defaultLabel="Total size"
              accent="#22d3ee"
            />
          </div>
        </div>
      </section>

      {loadError && (
        <div
          className={cm.cn('rounded-2xl border p-4 mb-6 text-sm')}
          style={{
            borderColor: 'var(--color-error-container)',
            backgroundColor: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
            color: 'var(--mol-color-error)',
          }}
          data-mol-id="library-load-error"
        >
          {loadError}
        </div>
      )}

      {/* Filter chip row */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('mb', 5),
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          {FILTERS.map((f) => {
            const active = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                data-mol-id={`library-filter-${f.id}`}
                data-active={active ? 'true' : 'false'}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'rounded-full text-[11px] font-mono font-bold uppercase tracking-widest border transition-colors',
                  active
                    ? 'bg-[var(--photo-accent)]/20 text-[var(--photo-panel-text-highlight)] border-[var(--photo-accent)]/60'
                    : 'bg-transparent text-[var(--photo-text-muted)] border-[var(--photo-border)] hover:text-[var(--photo-text)] hover:border-[var(--photo-accent)]/40',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  {f.icon}
                </span>
                {t(f.labelKey, {}, { defaultValue: f.defaultLabel })}
              </button>
            )
          })}
        </div>
        <span
          className={cm.cn(
            'font-mono text-[11px] uppercase tracking-widest text-[var(--photo-text-muted)]',
          )}
        >
          {t(
            'library.count',
            { count: filteredPhotos.length },
            { defaultValue: '{{count}} matching' },
          )}
        </span>
      </div>

      {loading ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            'rounded-2xl border border-[var(--photo-border)] bg-[var(--photo-panel-bg)] text-sm text-[var(--photo-text-muted)] italic',
          )}
          data-mol-id="library-loading"
        >
          {t('library.loading', {}, { defaultValue: 'Loading library…' })}
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            'rounded-2xl border border-[var(--photo-border)] bg-[var(--photo-panel-bg)]',
          )}
          data-mol-id="library-empty"
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
            {samplePhotos.length === 0
              ? t(
                  'library.emptyAll',
                  {},
                  { defaultValue: 'Your library is empty. Add your first frame to start editing.' },
                )
              : t('library.empty', {}, { defaultValue: 'No frames in this filter yet.' })}
          </p>
          {samplePhotos.length === 0 && (
            <button
              type="button"
              onClick={() => setShowNewImage(true)}
              data-mol-id="library-empty-cta"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'mx-auto mt-4 px-4 py-2 rounded-md text-sm bg-gradient-to-r from-[var(--photo-accent)] to-[var(--photo-danger)] text-white hover:opacity-90 transition-opacity uppercase tracking-widest font-mono',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                add_a_photo
              </span>
              {t('library.empty.cta', {}, { defaultValue: 'Add your first frame' })}
            </button>
          )}
        </div>
      ) : (
        <ul
          className={cm.cn(
            'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[180px]',
          )}
        >
          {filteredPhotos.map((photo) => (
            <PhotoTile key={photo.id} photo={photo} />
          ))}
        </ul>
      )}

      {/* Album rail */}
      <section className={cm.cn(cm.sp('mt', 12))}>
        <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 5))}>
          <div>
            <p
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-accent)]',
              )}
            >
              {t('library.albums.eyebrow', {}, { defaultValue: '// curated stacks' })}
            </p>
            <h3
              className={cm.cn(
                cm.textSize('2xl'),
                'font-extrabold tracking-tight text-[var(--photo-text)] mt-1',
              )}
            >
              {t('library.albums.title', {}, { defaultValue: 'Albums you\u2019re building' })}
            </h3>
          </div>
        </div>
        {sampleAlbums.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('py', 8),
              cm.textCenter,
              'rounded-2xl border border-[var(--photo-border)] bg-[var(--photo-surface)] text-sm italic text-[var(--photo-text-muted)]',
            )}
            data-mol-id="library-albums-empty"
          >
            {t(
              'library.albums.empty',
              {},
              { defaultValue: 'No albums yet — group related frames once you have a few.' },
            )}
          </div>
        ) : (
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4')}>
            {sampleAlbums.map((album) => (
              <Link
                key={album.id}
                to={`/album/${album.id}`}
                data-mol-id={`library-album-${album.id}`}
                className={cm.cn(
                  'group block bg-[var(--photo-surface)] border border-[var(--photo-border)] rounded-2xl overflow-hidden hover:border-[var(--photo-accent)]/50 transition-all hover:-translate-y-0.5 hover:shadow-lg',
                )}
              >
                <div
                  className={cm.cn('relative aspect-[16/10] flex items-center justify-center')}
                  style={{
                    background: ALBUM_GRADIENTS[album.cover_index % ALBUM_GRADIENTS.length],
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
                  >
                    photo_album
                  </span>
                  <span
                    className={cm.cn(
                      'absolute top-2 right-2 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest rounded bg-foreground/55 backdrop-blur text-white',
                    )}
                  >
                    {album.photo_count}{' '}
                    {t('library.albums.framesUnit', {}, { defaultValue: 'frames' })}
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {showNewImage && (
        <div
          role="dialog"
          aria-modal="true"
          data-mol-id="library-new-modal"
          className={cm.cn('fixed inset-0 z-50 flex items-center justify-center p-4')}
        >
          <div
            aria-hidden="true"
            onClick={() => setShowNewImage(false)}
            className={cm.cn('absolute inset-0 bg-foreground/70 backdrop-blur-sm')}
          />
          <form
            onSubmit={handleCreate}
            className={cm.cn(
              'relative w-full max-w-md rounded-2xl border border-[var(--photo-border)] bg-[var(--photo-surface)] p-6 space-y-4',
            )}
            data-mol-id="library-new-form"
          >
            <div>
              <p
                className={cm.cn(
                  'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-accent)]',
                )}
              >
                {t('library.new.eyebrow', {}, { defaultValue: '// add a frame' })}
              </p>
              <h3
                className={cm.cn('text-xl font-bold tracking-tight text-[var(--photo-text)] mt-1')}
              >
                {t('library.new.title', {}, { defaultValue: 'Open a new image' })}
              </h3>
              <p className={cm.cn('text-xs text-[var(--photo-text-muted)] mt-2 leading-relaxed')}>
                {t(
                  'library.new.body',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Paste a public image URL — {{appName}} registers it in your library and opens it in the editor.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn('space-y-3')}>
              <label className={cm.cn('block')}>
                <span
                  className={cm.cn(
                    'block text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--photo-text-muted)] mb-1',
                  )}
                >
                  {t('library.new.name', {}, { defaultValue: 'Frame name' })}
                </span>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  data-mol-id="library-new-name"
                  className={cm.cn(
                    'w-full bg-[var(--photo-canvas-bg)] border border-[var(--photo-border)] rounded-md px-3 py-2 text-sm text-[var(--photo-text)] focus:border-[var(--photo-accent)] focus:outline-none',
                  )}
                  placeholder={t(
                    'library.new.namePlaceholder',
                    {},
                    { defaultValue: 'Velvet Dusk over Reykjavík' },
                  )}
                />
              </label>
              <label className={cm.cn('block')}>
                <span
                  className={cm.cn(
                    'block text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--photo-text-muted)] mb-1',
                  )}
                >
                  {t('library.new.url', {}, { defaultValue: 'Image URL' })}
                </span>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  required
                  data-mol-id="library-new-url"
                  className={cm.cn(
                    'w-full bg-[var(--photo-canvas-bg)] border border-[var(--photo-border)] rounded-md px-3 py-2 text-sm text-[var(--photo-text)] focus:border-[var(--photo-accent)] focus:outline-none',
                  )}
                  placeholder={t(
                    'library.new.urlPlaceholder',
                    {},
                    { defaultValue: 'https://images.unsplash.com/photo-...' },
                  )}
                />
              </label>
            </div>
            {newError && (
              <p
                className={cm.cn('text-xs text-[var(--mol-color-error)]')}
                data-mol-id="library-new-error"
              >
                {newError}
              </p>
            )}
            <div className={cm.cn('flex items-center justify-end gap-2 pt-2')}>
              <button
                type="button"
                onClick={() => setShowNewImage(false)}
                className={cm.cn(
                  'px-4 py-2 rounded-md text-xs font-mono uppercase tracking-widest text-[var(--photo-text-muted)] hover:text-[var(--photo-text)] transition-colors',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={newSubmitting || !newName.trim() || !newUrl.trim()}
                data-mol-id="library-new-submit"
                className={cm.cn(
                  'px-4 py-2 rounded-md text-xs font-mono uppercase tracking-widest font-bold text-white bg-gradient-to-r from-[var(--photo-accent)] to-[var(--photo-danger)] hover:opacity-90 transition-opacity disabled:opacity-60',
                )}
              >
                {newSubmitting
                  ? t('library.new.submitting', {}, { defaultValue: 'Opening…' })
                  : t('library.new.submit', {}, { defaultValue: 'Open in editor' })}
              </button>
            </div>
          </form>
        </div>
      )}
    </PhotoEditorLayout>
  )
}

interface StatProps {
  value: string
  labelKey: string
  defaultLabel: string
  accent: string
}

function Stat({ value, labelKey, defaultLabel, accent }: StatProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        'rounded-xl bg-surface/5 backdrop-blur border border-surface/10 p-3 hover:-translate-y-0.5 transition-transform',
      )}
    >
      <p
        className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight')}
        style={{ color: accent }}
      >
        {value}
      </p>
      <p
        className={cm.cn(
          'text-[10px] font-mono font-bold uppercase tracking-widest text-white/70 mt-1',
        )}
      >
        {t(labelKey, {}, { defaultValue: defaultLabel })}
      </p>
    </div>
  )
}

export default Library
