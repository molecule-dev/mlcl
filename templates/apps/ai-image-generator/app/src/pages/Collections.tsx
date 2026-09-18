import { useCallback, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AiImageGeneratorLayout } from '../components/AiImageGeneratorLayout.js'
import { AiImageGeneratorTopBar } from '../components/AiImageGeneratorTopBar.js'
import { adaptCollection } from '../lib/api-adapters.js'
import { useFetchList } from '../lib/use-fetch-list.js'

export function Collections() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [creating, setCreating] = useState(false)

  const collectionsState = useFetchList(
    '/api/collections',
    useCallback((row: Record<string, unknown>) => adaptCollection(row), []),
  )

  const create = useCallback(async () => {
    setCreating(true)
    try {
      const stamp = new Date().toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      await http.post('/api/collections', {
        name: t('collections.untitled', { stamp }, { defaultValue: 'Untitled · {{stamp}}' }),
        description: '',
      })
      await collectionsState.refetch()
    } catch (error) {
      logError('collections.create', error)
    } finally {
      setCreating(false)
    }
  }, [http, t, collectionsState])

  const collections = collectionsState.data ?? []

  return (
    <AiImageGeneratorLayout>
      <AiImageGeneratorTopBar
        title={t('collections.title', {}, { defaultValue: 'Collections' })}
        subtitle={t(
          'collections.subtitle',
          {},
          { defaultValue: 'Mood-boards, briefs and ongoing series' },
        )}
        actions={
          <button
            type="button"
            disabled={creating}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 disabled:opacity-50',
            )}
            onClick={create}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            {creating
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('collections.create', {}, { defaultValue: 'New collection' })}
          </button>
        }
      />

      <main className={cm.cn(cm.sp('p', 8))}>
        {collectionsState.loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('collections.loading', {}, { defaultValue: 'Loading collections…' })}
          </p>
        ) : collectionsState.error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{collectionsState.error}</p>
        ) : collections.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'collections.empty',
              {},
              { defaultValue: 'No collections yet. Create one to start curating your work.' },
            )}
          </p>
        ) : (
          <div className={cm.cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3')}>
            {collections.map((collection) => (
              <Link
                key={collection.id}
                to={`/collections/${collection.id}`}
                className={cm.cn(
                  cm.flex({ direction: 'col' }),
                  'group rounded-3xl bg-surface-container-lowest border border-outline-variant/15 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-primary/10 transition-all',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'relative h-44 text-white',
                    collection.coverGradient,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-6xl drop-shadow-lg')}>
                    {collection.glyph}
                  </span>
                  <div
                    className={cm.cn(
                      'absolute inset-0 bg-gradient-to-t from-black/30 to-transparent',
                    )}
                  />
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'absolute top-3 right-3 px-2 py-0.5 rounded-full bg-surface/95 text-primary uppercase tracking-widest',
                    )}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      photo_library
                    </span>
                    {t(
                      'collections.imageCount',
                      { count: collection.imageCount },
                      { defaultValue: '{{count}} images' },
                    )}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('p', 5))}>
                  <h2
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('lg'),
                      'tracking-tight text-on-surface',
                    )}
                  >
                    {collection.name}
                  </h2>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      'text-on-surface-variant leading-relaxed line-clamp-2',
                    )}
                  >
                    {collection.description ||
                      t(
                        'collections.noDescription',
                        {},
                        { defaultValue: 'No description yet — open to add one.' },
                      )}
                  </p>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-mono text-on-surface-variant uppercase tracking-widest mt-2',
                    )}
                  >
                    {collection.updatedAt}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </AiImageGeneratorLayout>
  )
}

export default Collections
