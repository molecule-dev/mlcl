import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AlbumCardGrid } from '../components/AlbumCardGrid.js'
import { type Album, ApiError, createAlbum, listAlbums } from '../lib/api.js'

export function Albums() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [albums, setAlbums] = useState<Album[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newVisibility, setNewVisibility] = useState<'public' | 'unlisted' | 'private'>('public')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const refresh = async () => {
    try {
      const data = await listAlbums({ owner: 'me' })
      setAlbums(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      await createAlbum({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        visibility: newVisibility,
      })
      setShowNew(false)
      setNewTitle('')
      setNewDescription('')
      setNewVisibility('public')
      await refresh()
    } catch (err) {
      const detail =
        err instanceof ApiError
          ? `${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err)
      setCreateError(detail)
    } finally {
      setCreating(false)
    }
  }

  const totalPhotos = (albums ?? []).reduce((sum, a) => sum + (a.photo_count ?? 0), 0)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-10')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' }),
        )}
      >
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-primary">
            {t('albums.eyebrow', {}, { defaultValue: 'Sequenced & curated' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              'font-extrabold tracking-tight leading-[1.05] md:text-5xl mt-1',
            )}
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {t('albums.heading', {}, { defaultValue: 'Albums' })}
          </h1>
          <p className={'text-base text-on-surface-variant max-w-xl mt-2'}>
            {t(
              'albums.subheading',
              {},
              {
                defaultValue:
                  'Photographer-curated runs of work — projects, expeditions, and themes.',
              },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            data-testid="albums-new-btn"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 5),
              'py-3 rounded-full font-bold text-sm bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              add
            </span>
            {t('albums.newAlbum', {}, { defaultValue: 'New album' })}
          </button>
          <Link
            to="/upload"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 5),
              'py-3 rounded-full font-bold text-sm border border-outline-variant text-on-surface hover:bg-surface-container transition-colors',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              cloud_upload
            </span>
            {t('common.upload', {}, { defaultValue: 'Upload' })}
          </Link>
        </div>
      </header>

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-3')}>
        <Stat
          label={t('albums.statAlbums', {}, { defaultValue: 'Albums' })}
          value={(albums?.length ?? 0).toString()}
        />
        <Stat
          label={t('albums.statPhotos', {}, { defaultValue: 'Photographs' })}
          value={totalPhotos.toLocaleString()}
        />
        <Stat
          label={t('albums.statPublic', {}, { defaultValue: 'Public' })}
          value={(albums ?? []).filter((a) => a.visibility === 'public').length.toString()}
        />
      </section>

      {error && (
        <p className={'text-sm text-error'} role="alert" data-testid="albums-error">
          {error}
        </p>
      )}

      {albums === null ? (
        <p
          className={'text-sm text-on-surface-variant italic py-12 text-center'}
          data-testid="albums-loading"
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <AlbumCardGrid
          albums={albums}
          emptyMessage={t(
            'albums.empty',
            {},
            { defaultValue: 'No albums yet — start a new one to begin curating.' },
          )}
        />
      )}

      {showNew && (
        <div
          className={'fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4'}
          role="dialog"
          aria-modal="true"
          aria-labelledby="albums-new-title"
          data-testid="albums-new-dialog"
        >
          <form
            onSubmit={submit}
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface rounded-2xl shadow-2xl w-full max-w-lg space-y-4',
            )}
          >
            <div>
              <h2
                id="albums-new-title"
                className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                {t('albums.newDialog.heading', {}, { defaultValue: 'Start a new album' })}
              </h2>
              <p className={'text-sm text-on-surface-variant mt-1'}>
                {t(
                  'albums.newDialog.subheading',
                  {},
                  {
                    defaultValue:
                      'Give your album a title and visibility — you can add photos to it from any photo detail page.',
                  },
                )}
              </p>
            </div>
            <label className="block">
              <span className="text-[11px] block font-black uppercase tracking-widest text-on-surface-variant mb-1">
                {t('form.title', {}, { defaultValue: 'Title' })}
              </span>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                data-testid="albums-new-title-input"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors',
                )}
              />
            </label>
            <label className="block">
              <span className="text-[11px] block font-black uppercase tracking-widest text-on-surface-variant mb-1">
                {t('form.descriptionOptional', {}, { defaultValue: 'Description (optional)' })}
              </span>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                data-testid="albums-new-description-input"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors resize-none',
                )}
              />
            </label>
            <div>
              <span className="text-[11px] block font-black uppercase tracking-widest text-on-surface-variant mb-1">
                {t('albums.newDialog.visibilityLabel', {}, { defaultValue: 'Visibility' })}
              </span>
              <div
                className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }))}
                role="radiogroup"
                aria-label={t(
                  'albums.newDialog.visibilityLabel',
                  {},
                  { defaultValue: 'Visibility' },
                )}
              >
                {(['public', 'unlisted', 'private'] as const).map((v) => {
                  const isActive = newVisibility === v
                  return (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => setNewVisibility(v)}
                      data-testid={`albums-new-visibility-${v}`}
                      className={cm.cn(
                        cm.sp('px', 4),
                        'py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors',
                        isActive
                          ? 'bg-primary text-on-primary shadow'
                          : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                      )}
                    >
                      {t(`albums.visibility.${v}`, {}, { defaultValue: v })}
                    </button>
                  )
                })}
              </div>
            </div>
            {createError && (
              <p className={'text-sm text-error'} role="alert" data-testid="albums-new-error">
                {createError}
              </p>
            )}
            <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
              <button
                type="button"
                onClick={() => {
                  setShowNew(false)
                  setCreateError(null)
                }}
                disabled={creating}
                className={cm.cn(
                  cm.sp('px', 4),
                  'py-2 rounded-full font-bold text-sm border border-outline-variant text-on-surface hover:bg-surface-container transition-colors',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={creating || !newTitle.trim()}
                data-testid="albums-new-submit"
                className={cm.cn(
                  cm.sp('px', 5),
                  'py-2 rounded-full font-bold text-sm bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {creating
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('albums.newDialog.submit', {}, { defaultValue: 'Create album' })}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div
      className={
        'bg-surface-container-lowest rounded-2xl p-5 border-l-4 border-primary hover:-translate-y-0.5 transition-transform'
      }
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      <p
        className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight tabular-nums mt-1')}
        style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
      >
        {value}
      </p>
    </div>
  )
}
