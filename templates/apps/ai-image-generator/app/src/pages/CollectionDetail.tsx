import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AiImageGeneratorLayout } from '../components/AiImageGeneratorLayout.js'
import { AiImageGeneratorTopBar } from '../components/AiImageGeneratorTopBar.js'
import { GenerationCard } from '../components/GenerationCard.js'
import { adaptCollection, adaptGeneration } from '../lib/api-adapters.js'
import { useFetchList, useFetchOne } from '../lib/use-fetch-list.js'

export function CollectionDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ id: string }>()

  const collectionState = useFetchOne(
    params.id ? `/api/collections/${params.id}` : null,
    useCallback((row: Record<string, unknown>) => adaptCollection(row), []),
  )

  const generationsState = useFetchList(
    '/api/generations?limit=24',
    useCallback((row: Record<string, unknown>) => adaptGeneration(row), []),
  )

  const [shareState, setShareState] = useState<'idle' | 'pending' | 'shared'>('idle')
  const [editName, setEditName] = useState<string | null>(null)

  const share = useCallback(async () => {
    if (!params.id) return
    setShareState('pending')
    try {
      await http.post(`/api/collections/${params.id}/share`, {})
      setShareState('shared')
      void track({
        name: 'collection.shared',
        properties: { collectionId: params.id },
      })
      await collectionState.refetch()
    } catch (error) {
      logError('collection.share', error)
      setShareState('idle')
    }
  }, [http, params.id, collectionState])

  const startEdit = useCallback(() => {
    setEditName(collectionState.data?.name ?? '')
  }, [collectionState.data])

  const saveEdit = useCallback(async () => {
    if (!params.id || editName === null) return
    try {
      await http.put(`/api/collections/${params.id}`, { name: editName })
      setEditName(null)
      void track({
        name: 'collection.renamed',
        properties: { collectionId: params.id },
      })
      await collectionState.refetch()
    } catch (error) {
      logError('collection.saveEdit', error)
      setEditName(null)
    }
  }, [http, params.id, editName, collectionState])

  if (collectionState.loading) {
    return (
      <AiImageGeneratorLayout>
        <AiImageGeneratorTopBar
          title={t('collectionDetail.loading', {}, { defaultValue: 'Loading collection…' })}
          subtitle=""
        />
        <main className={cm.cn(cm.sp('p', 8))}>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        </main>
      </AiImageGeneratorLayout>
    )
  }

  if (collectionState.error || !collectionState.data) {
    return (
      <AiImageGeneratorLayout>
        <AiImageGeneratorTopBar
          title={t(
            'collectionDetail.notFoundTitle',
            {},
            { defaultValue: 'Collection unavailable' },
          )}
          subtitle={t(
            'collectionDetail.notFoundBody',
            {},
            { defaultValue: 'This collection has been removed or is private.' },
          )}
        />
        <main className={cm.cn(cm.sp('p', 8))}>
          <Link
            to="/collections"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'text-primary hover:text-secondary transition-colors',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              arrow_back
            </span>
            {t('collectionDetail.backCta', {}, { defaultValue: 'Back to collections' })}
          </Link>
        </main>
      </AiImageGeneratorLayout>
    )
  }

  const collection = collectionState.data
  const generations = generationsState.data ?? []

  return (
    <AiImageGeneratorLayout>
      <AiImageGeneratorTopBar
        title={collection.name}
        subtitle={collection.description}
        actions={
          <div className={cm.flex({ align: 'center', gap: 'xs' })}>
            <button
              type="button"
              disabled={shareState === 'pending'}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container text-on-surface hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50',
              )}
              onClick={share}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                share
              </span>
              {shareState === 'shared'
                ? t('collectionDetail.shared', {}, { defaultValue: 'Visibility toggled' })
                : t('common.share', {}, { defaultValue: 'Share' })}
            </button>
            <button
              type="button"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container text-on-surface hover:bg-primary/10 hover:text-primary transition-colors',
              )}
              onClick={startEdit}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                edit
              </span>
              {t('common.edit', {}, { defaultValue: 'Edit' })}
            </button>
          </div>
        }
      />

      <main className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col', gap: 'lg' }))}>
        {editName !== null && (
          <form
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('p', 4),
              'rounded-2xl bg-surface-container border border-outline-variant/15',
            )}
            onSubmit={(e) => {
              e.preventDefault()
              saveEdit().catch(() => {})
            }}
          >
            <label className="sr-only" htmlFor="collection-edit-name">
              {t('collectionDetail.editName', {}, { defaultValue: 'Collection name' })}
            </label>
            <input
              id="collection-edit-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'flex-1 rounded-xl border border-outline-variant/15 bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary/30 focus:outline-none',
              )}
            />
            <button
              type="submit"
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-xl bg-primary text-on-primary',
              )}
            >
              {t('common.save', {}, { defaultValue: 'Save' })}
            </button>
            <button
              type="button"
              onClick={() => setEditName(null)}
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-xl bg-surface-container text-on-surface-variant',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </form>
        )}

        <section
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('p', 6),
            'rounded-3xl bg-gradient-to-br from-primary/10 via-surface-container-lowest to-secondary/10 border border-outline-variant/15',
          )}
        >
          <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {collection.updatedAt}
            </span>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant max-w-xl leading-relaxed',
              )}
            >
              {t(
                'collectionDetail.coverNote',
                { count: collection.imageCount },
                { defaultValue: 'Curated mood-board with {{count}} images.' },
              )}
            </p>
          </div>
          <Link
            to="/generate"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              auto_awesome
            </span>
            {t('collectionDetail.addImage', {}, { defaultValue: 'Conjure for collection' })}
          </Link>
        </section>

        {generationsState.loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('collectionDetail.loadingImages', {}, { defaultValue: 'Loading images…' })}
          </p>
        ) : generations.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'collectionDetail.empty',
              {},
              { defaultValue: 'No images in this collection yet — generate something to add.' },
            )}
          </p>
        ) : (
          <div className={cm.cn('grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4')}>
            {generations.map((generation) => (
              <GenerationCard key={generation.id} generation={generation} />
            ))}
          </div>
        )}
      </main>
    </AiImageGeneratorLayout>
  )
}

export default CollectionDetail
