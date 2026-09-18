import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AiImageGeneratorLayout } from '../components/AiImageGeneratorLayout.js'
import { AiImageGeneratorTopBar } from '../components/AiImageGeneratorTopBar.js'
import { GenerationCard } from '../components/GenerationCard.js'
import { GenerationStatusPill } from '../components/GenerationStatusPill.js'
import { adaptGeneration } from '../lib/api-adapters.js'
import { useFetchList, useFetchOne } from '../lib/use-fetch-list.js'

const ACTIONS: { id: string; icon: string; label: string }[] = [
  { id: 'download', icon: 'download', label: 'Download' },
  { id: 'upscale', icon: 'high_quality', label: 'Upscale 4×' },
  { id: 'edit', icon: 'edit', label: 'Open editor' },
  { id: 'variations', icon: 'auto_awesome_motion', label: 'Variations' },
  { id: 'share', icon: 'share', label: 'Share' },
]

export function ImageDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ id: string }>()
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const imageState = useFetchOne(
    params.id ? `/api/generations/${params.id}` : null,
    useCallback((row: Record<string, unknown>) => adaptGeneration(row), []),
  )

  const variationsState = useFetchList(
    params.id ? `/api/generations?parent_id=${params.id}&limit=4` : '/api/generations?limit=4',
    useCallback((row: Record<string, unknown>) => adaptGeneration(row), []),
  )

  const runAction = useCallback(
    async (id: string) => {
      if (!params.id) return
      setPendingAction(id)
      setFeedback(null)
      try {
        switch (id) {
          case 'download': {
            const url = imageState.data?.thumbnailUrl
            if (!url) {
              setFeedback(
                t(
                  'imageDetail.downloadUnavailable',
                  {},
                  { defaultValue: 'No image available to download yet.' },
                ),
              )
              break
            }
            const blob = await fetch(url).then((r) => r.blob())
            const objectUrl = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = objectUrl
            anchor.download = `${params.id}.png`
            document.body.appendChild(anchor)
            anchor.click()
            anchor.remove()
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
            setFeedback(t('imageDetail.downloadStarted', {}, { defaultValue: 'Download started.' }))
            break
          }
          case 'upscale':
            await http.post(`/api/generations/${params.id}/variations`, { count: 1 })
            setFeedback(t('imageDetail.upscaleQueued', {}, { defaultValue: 'Upscale queued' }))
            break
          case 'variations':
            await http.post(`/api/generations/${params.id}/variations`, { count: 4 })
            setFeedback(
              t('imageDetail.variationsQueued', {}, { defaultValue: 'Variations queued' }),
            )
            await variationsState.refetch()
            break
          case 'share':
            await http.put(`/api/gallery/${params.id}/visibility`, {})
            setFeedback(
              t('imageDetail.visibilityToggled', {}, { defaultValue: 'Visibility updated' }),
            )
            await imageState.refetch()
            break
          // 'edit' is handled by the Link in topbar; no in-place handler needed.
          default:
            break
        }
      } catch (error) {
        logError('imageDetail.runAction', error)
        setFeedback(t('imageDetail.actionFailed', {}, { defaultValue: 'Action failed.' }))
      } finally {
        setPendingAction(null)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- imageState.data?.thumbnailUrl kept to re-bind when the URL is available for download
    [http, params.id, t, variationsState, imageState, imageState.data?.thumbnailUrl],
  )

  if (imageState.loading) {
    return (
      <AiImageGeneratorLayout>
        <AiImageGeneratorTopBar
          title={t('imageDetail.loading', {}, { defaultValue: 'Loading image…' })}
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

  if (!imageState.data) {
    return (
      <AiImageGeneratorLayout>
        <AiImageGeneratorTopBar
          title={t('imageDetail.notFoundTitle', {}, { defaultValue: 'Image unavailable' })}
          subtitle={t(
            'imageDetail.notFoundBody',
            {},
            { defaultValue: 'This image could not be loaded.' },
          )}
        />
        <main className={cm.cn(cm.sp('p', 8))}>
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{imageState.error}</p>
        </main>
      </AiImageGeneratorLayout>
    )
  }

  const image = imageState.data
  const variations = variationsState.data ?? []

  return (
    <AiImageGeneratorLayout>
      <AiImageGeneratorTopBar
        title={t('imageDetail.title', {}, { defaultValue: 'Image' })}
        subtitle={image.prompt}
        actions={
          <Link
            to={`/editor/${image.id}`}
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
              brush
            </span>
            {t('imageDetail.openEditor', {}, { defaultValue: 'Open in editor' })}
          </Link>
        }
      />

      <main className={cm.cn(cm.sp('p', 8), 'grid gap-6 lg:grid-cols-12')}>
        <section className={cm.cn('lg:col-span-8 flex flex-col gap-6')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'aspect-video rounded-3xl bg-gradient-to-br from-primary/30 via-fuchsia-500/30 to-secondary/30 relative overflow-hidden border border-outline-variant/15 shadow-xl shadow-primary/10',
            )}
          >
            {image.thumbnailUrl ? (
              <img
                src={image.thumbnailUrl}
                alt={image.prompt}
                className={cm.cn('absolute inset-0 h-full w-full object-cover')}
              />
            ) : (
              <span
                className={cm.cn(
                  'text-white text-sm font-mono uppercase tracking-widest opacity-80',
                )}
              >
                {image.prompt}
              </span>
            )}
          </div>
          {feedback && (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('p', 3),
                'rounded-xl bg-primary-container/30 text-primary',
              )}
              role="status"
            >
              {feedback}
            </p>
          )}
          <nav
            className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}
            aria-label={t('imageDetail.actions', {}, { defaultValue: 'Image actions' })}
          >
            {ACTIONS.map((action) =>
              action.id === 'edit' ? (
                <Link
                  key={action.id}
                  to={`/editor/${image.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-xl bg-surface-container text-on-surface hover:bg-primary/10 hover:text-primary transition-colors',
                  )}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {action.icon}
                  </span>
                  {t(`imageDetail.actions.${action.id}`, {}, { defaultValue: action.label })}
                </Link>
              ) : (
                <button
                  key={action.id}
                  type="button"
                  disabled={pendingAction === action.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-xl bg-surface-container text-on-surface hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50',
                  )}
                  onClick={() => runAction(action.id)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {action.icon}
                  </span>
                  {pendingAction === action.id
                    ? t('imageDetail.acting', {}, { defaultValue: 'Working…' })
                    : t(`imageDetail.actions.${action.id}`, {}, { defaultValue: action.label })}
                </button>
              ),
            )}
          </nav>
          <article className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xl'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('imageDetail.variations', {}, { defaultValue: 'Variations' })}
            </h2>
            {variations.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'imageDetail.noVariations',
                  {},
                  { defaultValue: 'No variations yet — request one above.' },
                )}
              </p>
            ) : (
              <div className={cm.cn('grid grid-cols-2 gap-4 md:grid-cols-4')}>
                {variations.map((variation) => (
                  <GenerationCard
                    key={variation.id}
                    generation={variation}
                    aspectClass="aspect-square"
                  />
                ))}
              </div>
            )}
          </article>
        </section>

        <aside className={cm.cn('lg:col-span-4 flex flex-col gap-6')}>
          <article
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-3xl bg-surface-container-lowest border border-outline-variant/15 shadow-sm flex flex-col gap-4',
            )}
          >
            <header className={cm.flex({ align: 'center', justify: 'between' })}>
              <h3
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {t('imageDetail.metadata', {}, { defaultValue: 'Metadata' })}
              </h3>
              <GenerationStatusPill status={image.status} />
            </header>
            <dl className={cm.cn('grid grid-cols-2 gap-y-3 text-sm font-mono text-on-surface')}>
              <dt className={cm.cn('text-on-surface-variant uppercase tracking-widest text-xs')}>
                {t('form.model', {}, { defaultValue: 'Model' })}
              </dt>
              <dd className={cm.cn('text-right')}>{image.model}</dd>
              <dt className={cm.cn('text-on-surface-variant uppercase tracking-widest text-xs')}>
                {t('imageDetail.fields.seed', {}, { defaultValue: 'Seed' })}
              </dt>
              <dd className={cm.cn('text-right')}>{image.seed}</dd>
              <dt className={cm.cn('text-on-surface-variant uppercase tracking-widest text-xs')}>
                {t('imageDetail.fields.aspect', {}, { defaultValue: 'Aspect' })}
              </dt>
              <dd className={cm.cn('text-right')}>{image.aspectRatio}</dd>
              <dt className={cm.cn('text-on-surface-variant uppercase tracking-widest text-xs')}>
                {t('imageDetail.fields.created', {}, { defaultValue: 'Created' })}
              </dt>
              <dd className={cm.cn('text-right')}>{image.createdAt}</dd>
            </dl>
            <p
              className={cm.cn(
                cm.sp('p', 3),
                'rounded-xl bg-surface-container text-sm text-on-surface leading-relaxed',
              )}
            >
              {image.prompt}
            </p>
          </article>
          <article
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-3xl bg-surface-container-lowest border border-outline-variant/15 shadow-sm flex flex-col gap-3',
            )}
          >
            <h3
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('imageDetail.tipsTitle', {}, { defaultValue: 'Refine the dream' })}
            </h3>
            <ul
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              <li className={cm.cn('flex items-start gap-2')}>
                <span
                  className={cm.cn('material-symbols-outlined text-primary')}
                  style={{ fontSize: 18 }}
                >
                  tips_and_updates
                </span>
                {t(
                  'imageDetail.tips.lockSeed',
                  {},
                  {
                    defaultValue:
                      'Lock the seed to iterate on lighting without losing composition.',
                  },
                )}
              </li>
              <li className={cm.cn('flex items-start gap-2')}>
                <span
                  className={cm.cn('material-symbols-outlined text-primary')}
                  style={{ fontSize: 18 }}
                >
                  tips_and_updates
                </span>
                {t(
                  'imageDetail.tips.upscale',
                  {},
                  { defaultValue: 'Run upscale 4× before exporting for print-ready quality.' },
                )}
              </li>
            </ul>
          </article>
        </aside>
      </main>
    </AiImageGeneratorLayout>
  )
}

export default ImageDetail
