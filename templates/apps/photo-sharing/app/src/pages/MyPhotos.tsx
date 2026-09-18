import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PhotoMasonry } from '../components/PhotoMasonry.js'
import { listPhotos, type Photo } from '../lib/api.js'

const VISIBILITY_FILTERS = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'public', defaultLabel: 'Public' },
  { key: 'unlisted', defaultLabel: 'Unlisted' },
  { key: 'private', defaultLabel: 'Private' },
] as const

type VisibilityKey = (typeof VISIBILITY_FILTERS)[number]['key']

export function MyPhotos() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [visibility, setVisibility] = useState<VisibilityKey>('all')
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listPhotos({ owner: 'me', limit: 100 })
      .then((data) => {
        if (!cancelled) setPhotos(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!photos) return []
    if (visibility === 'all') return photos
    return photos.filter((p) => p.visibility === visibility)
  }, [photos, visibility])

  const totals = {
    photos: photos?.length ?? 0,
    views: photos?.reduce((s, p) => s + (p.view_count ?? 0), 0) ?? 0,
    favorites: photos?.reduce((s, p) => s + (p.favorite_count ?? 0), 0) ?? 0,
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-10')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' }),
        )}
      >
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-primary">
            {t('myPhotos.eyebrow', {}, { defaultValue: 'Your portfolio' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              'font-extrabold tracking-tight leading-[1.05] md:text-5xl mt-1',
            )}
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {t('myPhotos.heading', {}, { defaultValue: 'My photos' })}
          </h1>
          <p className={'text-base text-on-surface-variant max-w-xl mt-2'}>
            {t(
              'myPhotos.subheading',
              {},
              {
                defaultValue: "Everything you've uploaded — public, unlisted, and private.",
              },
            )}
          </p>
        </div>
        <Link
          to="/upload"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 5),
            'py-3 rounded-full font-bold text-sm bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow',
          )}
          data-testid="myphotos-upload-link"
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            cloud_upload
          </span>
          {t('myPhotos.upload', {}, { defaultValue: 'Upload photos' })}
        </Link>
      </header>

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-3')}>
        <Stat
          label={t('myPhotos.statPhotos', {}, { defaultValue: 'Photographs' })}
          value={totals.photos.toString()}
          icon="photo_library"
        />
        <Stat
          label={t('myPhotos.statViews', {}, { defaultValue: 'Views' })}
          value={totals.views.toLocaleString()}
          icon="visibility"
        />
        <Stat
          label={t('myPhotos.statFavorites', {}, { defaultValue: 'Favorites' })}
          value={totals.favorites.toLocaleString()}
          icon="favorite"
        />
      </section>

      <section className={'space-y-5'}>
        <ul className={'flex flex-wrap gap-2'}>
          {VISIBILITY_FILTERS.map((filter) => {
            const isActive = visibility === filter.key
            return (
              <li key={filter.key}>
                <button
                  type="button"
                  onClick={() => setVisibility(filter.key)}
                  aria-pressed={isActive}
                  data-testid={`myphotos-filter-${filter.key}`}
                  className={cm.cn(
                    cm.sp('px', 3),
                    'py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-colors',
                    isActive
                      ? 'bg-primary text-on-primary shadow'
                      : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                  )}
                >
                  {t(`myPhotos.filter.${filter.key}`, {}, { defaultValue: filter.defaultLabel })}
                </button>
              </li>
            )
          })}
        </ul>
        {error && (
          <p className={'text-sm text-error'} role="alert" data-testid="myphotos-error">
            {error}
          </p>
        )}
        {photos === null ? (
          <p
            className={'text-sm text-on-surface-variant italic py-12 text-center'}
            data-testid="myphotos-loading"
          >
            {t('common.loading', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : (
          <PhotoMasonry
            photos={filtered}
            emptyMessage={t(
              'myPhotos.empty',
              {},
              {
                defaultValue: 'No frames here yet — upload your first to begin.',
              },
            )}
          />
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        'bg-surface-container-lowest rounded-2xl p-5 border-l-4 border-primary hover:-translate-y-0.5 transition-transform',
      )}
    >
      <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          {label}
        </p>
        <p
          className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight tabular-nums')}
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          {value}
        </p>
      </div>
    </div>
  )
}
