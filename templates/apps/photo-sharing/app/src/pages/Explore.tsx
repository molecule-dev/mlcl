import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { PhotoMasonry } from '../components/PhotoMasonry.js'
import { listPhotos, type Photo } from '../lib/api.js'

const TAG_FILTERS = [
  { key: 'all', defaultLabel: 'All', match: null },
  { key: 'landscape', defaultLabel: 'Landscape', match: 'landscape' },
  { key: 'portrait', defaultLabel: 'Portrait', match: 'portrait' },
  { key: 'street', defaultLabel: 'Street', match: 'street' },
  { key: 'nature', defaultLabel: 'Nature', match: 'nature' },
  { key: 'documentary', defaultLabel: 'Documentary', match: 'documentary' },
  { key: 'cityscape', defaultLabel: 'Cityscape', match: 'cityscape' },
] as const

type TagKey = (typeof TAG_FILTERS)[number]['key']

export function Explore() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const initialTag = (params.get('tag') as TagKey | null) ?? 'all'
  const [activeTag, setActiveTag] = useState<TagKey>(
    TAG_FILTERS.some((f) => f.key === initialTag) ? initialTag : 'all',
  )
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    setPhotos(null)
    const tag = TAG_FILTERS.find((f) => f.key === activeTag)?.match ?? undefined
    listPhotos({ tag, limit: 60 })
      .then((data) => {
        if (!cancelled) setPhotos(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [activeTag])

  const heroPhoto = useMemo(() => {
    if (!photos || photos.length === 0) return null
    return [...photos].sort((a, b) => (b.favorite_count ?? 0) - (a.favorite_count ?? 0))[0]
  }, [photos])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-12')}>
      <header className={'space-y-2'}>
        <p className="text-[11px] font-black uppercase tracking-widest text-primary">
          {t('explore.eyebrow', { app: APP_NAME }, { defaultValue: 'Today on {{app}}' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            'font-extrabold tracking-tight leading-[1.05] md:text-5xl',
          )}
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          {t('explore.heading', {}, { defaultValue: 'Explore' })}
        </h1>
        <p className={'text-base text-on-surface-variant max-w-xl'}>
          {t(
            'explore.subheading',
            {},
            {
              defaultValue: 'A masonry of new public photographs from the community.',
            },
          )}
        </p>
      </header>

      {heroPhoto && (
        <Link
          to={`/photos/${heroPhoto.id}`}
          className={'block relative overflow-hidden rounded-3xl shadow-xl shadow-on-surface/10'}
          data-testid="explore-hero"
        >
          <div className={'aspect-[16/8] bg-surface-container-low'}>
            <img
              src={heroPhoto.large_url || heroPhoto.thumbnail_url}
              alt={
                heroPhoto.title ?? t('explore.heroAlt', {}, { defaultValue: 'Featured photograph' })
              }
              className={'w-full h-full object-cover'}
            />
          </div>
          <div
            className={
              'absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent'
            }
          />
          <div className={'absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white space-y-2'}>
            <p className="text-[11px] font-black uppercase tracking-widest text-white/80">
              {t('explore.heroEyebrow', {}, { defaultValue: 'Most loved right now' })}
            </p>
            <h2
              className={'text-2xl md:text-3xl font-extrabold tracking-tight'}
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              {heroPhoto.title || t('status.untitled', {}, { defaultValue: 'Untitled' })}
            </h2>
            {heroPhoto.caption && (
              <p className="text-sm md:text-base text-white/85 max-w-2xl">{heroPhoto.caption}</p>
            )}
          </div>
        </Link>
      )}

      <section className={'space-y-5'}>
        <header
          className={cm.cn(
            cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' }),
          )}
        >
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
              {t('explore.streamEyebrow', {}, { defaultValue: 'Latest frames' })}
            </p>
            <h2
              className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight mt-1')}
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              {t('explore.streamHeading', {}, { defaultValue: 'In the stream' })}
            </h2>
          </div>
          <p className={'text-xs text-on-surface-variant tabular-nums'} data-testid="explore-count">
            {t(
              'explore.totalCount',
              { count: photos?.length ?? 0 },
              { defaultValue: '{{count}} photographs' },
            )}
          </p>
        </header>

        <ul className={'flex flex-wrap gap-2'}>
          {TAG_FILTERS.map((tag) => {
            const isActive = activeTag === tag.key
            return (
              <li key={tag.key}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTag(tag.key)
                    if (tag.key === 'all') setParams({})
                    else setParams({ tag: tag.key })
                  }}
                  aria-pressed={isActive}
                  data-testid={`explore-tag-${tag.key}`}
                  className={cm.cn(
                    cm.sp('px', 3),
                    'py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-colors',
                    isActive
                      ? 'bg-primary text-on-primary shadow'
                      : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                  )}
                >
                  {t(`explore.tag.${tag.key}`, {}, { defaultValue: tag.defaultLabel })}
                </button>
              </li>
            )
          })}
        </ul>

        {error && (
          <p className={'text-sm text-error'} role="alert" data-testid="explore-error">
            {error}
          </p>
        )}
        {photos === null ? (
          <p
            className={'text-sm text-on-surface-variant italic py-12 text-center'}
            data-testid="explore-loading"
          >
            {t('common.loading', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : (
          <PhotoMasonry
            photos={photos}
            emptyMessage={t(
              'explore.empty',
              {},
              {
                defaultValue: 'No public photographs yet — upload one to get started.',
              },
            )}
          />
        )}
      </section>
    </div>
  )
}
