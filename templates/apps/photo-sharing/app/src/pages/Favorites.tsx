import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PhotoMasonry } from '../components/PhotoMasonry.js'
import { listFavorites, type Photo } from '../lib/api.js'

export function Favorites() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listFavorites()
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

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-10')}>
      <header
        className={
          'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-on-surface/10 p-8 md:p-12'
        }
        style={{
          background:
            'linear-gradient(135deg, var(--color-favorite) 0%, var(--color-primary) 60%, var(--color-primary-hover) 100%)',
          minHeight: '220px',
        }}
      >
        <div
          className={'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl'}
          aria-hidden="true"
        />
        <div className={'relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-end'}>
          <div className={'md:col-span-9 space-y-3'}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/80">
              {t('favorites.eyebrow', {}, { defaultValue: 'Saved · hearted · returned-to' })}
            </p>
            <h1
              className={'text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]'}
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              {t('favorites.heading', {}, { defaultValue: 'Favorites' })}
            </h1>
            <p className={'text-base text-white/85 max-w-2xl'}>
              {t(
                'favorites.subheading',
                {},
                {
                  defaultValue:
                    'Photographs you keep returning to. Hearted from across the community.',
                },
              )}
            </p>
          </div>
          <div className={'md:col-span-3 flex md:justify-end'}>
            <div
              className={'w-24 h-24 rounded-full flex items-center justify-center backdrop-blur-md'}
              style={{ background: 'rgba(255,255,255,0.16)' }}
              aria-hidden="true"
            >
              <span
                className="material-symbols-outlined text-[56px] text-white"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className={'space-y-4'}>
        <header className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }))}>
          <h2
            className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {t('favorites.streamHeading', {}, { defaultValue: 'In your shortlist' })}
          </h2>
          <p
            className={'text-xs text-on-surface-variant tabular-nums'}
            data-testid="favorites-count"
          >
            {t(
              'favorites.totalCount',
              { count: photos?.length ?? 0 },
              { defaultValue: '{{count}} hearted' },
            )}
          </p>
        </header>
        {error && (
          <p className={'text-sm text-error'} role="alert" data-testid="favorites-error">
            {error}
          </p>
        )}
        {photos === null ? (
          <p
            className={'text-sm text-on-surface-variant italic py-12 text-center'}
            data-testid="favorites-loading"
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : (
          <PhotoMasonry
            photos={photos}
            emptyMessage={t(
              'favorites.empty',
              {},
              {
                defaultValue:
                  "You haven't hearted any photographs yet — explore some, then come back.",
              },
            )}
          />
        )}
      </section>
    </div>
  )
}
