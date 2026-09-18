import { useCallback, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AiImageGeneratorLayout } from '../components/AiImageGeneratorLayout.js'
import { AiImageGeneratorTopBar } from '../components/AiImageGeneratorTopBar.js'
import { GenerationCard } from '../components/GenerationCard.js'
import { adaptGeneration, adaptModel } from '../lib/api-adapters.js'
import { useFetchList } from '../lib/use-fetch-list.js'

export function Models() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const modelsState = useFetchList(
    '/api/models',
    useCallback((row: Record<string, unknown>) => adaptModel(row), []),
  )
  const generationsState = useFetchList(
    '/api/generations?limit=12',
    useCallback((row: Record<string, unknown>) => adaptGeneration(row), []),
  )

  const activate = useCallback(
    async (id: string) => {
      setPendingId(id)
      try {
        await http.post(`/api/models/${id}/activate`, {})
        await modelsState.refetch()
      } catch (error) {
        logError('models.activate', error)
      } finally {
        setPendingId(null)
      }
    },
    [http, modelsState],
  )

  const models = modelsState.data ?? []
  const samples = (generationsState.data ?? []).slice(0, 3)

  return (
    <AiImageGeneratorLayout>
      <AiImageGeneratorTopBar
        title={t('nav.models', {}, { defaultValue: 'Models' })}
        subtitle={t(
          'models.subtitle',
          {},
          { defaultValue: 'Diffusion engines and fine-tunes available to your account' },
        )}
      />

      <main className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col', gap: 'lg' }))}>
        {modelsState.loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('models.loading', {}, { defaultValue: 'Loading models…' })}
          </p>
        ) : models.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('models.empty', {}, { defaultValue: 'No models available.' })}
          </p>
        ) : (
          <div className={cm.cn('grid gap-4 md:grid-cols-2 xl:grid-cols-3')}>
            {models.map((model) => {
              const isActive = model.active === true
              return (
                <article
                  key={model.id}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'sm' }),
                    cm.sp('p', 6),
                    'rounded-3xl bg-surface-container-lowest border shadow-sm transition-all',
                    isActive
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-outline-variant/15',
                  )}
                >
                  <header className={cm.flex({ align: 'center', justify: 'between' })}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.textSize('xs'),
                        'uppercase tracking-widest text-primary',
                      )}
                    >
                      {model.vendor}
                    </span>
                    {isActive && (
                      <span
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.textSize('xs'),
                          cm.sp('px', 2),
                          'rounded-full bg-primary text-on-primary uppercase tracking-widest',
                        )}
                      >
                        {t('status.active', {}, { defaultValue: 'Active' })}
                      </span>
                    )}
                  </header>
                  <h2
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('xl'),
                      'tracking-tight text-on-surface',
                    )}
                  >
                    {model.name}
                  </h2>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {model.description}
                  </p>
                  {samples.length > 0 && (
                    <div className={cm.cn('grid grid-cols-3 gap-2 pt-2')}>
                      {samples.map((generation) => (
                        <GenerationCard
                          key={`${model.id}-${generation.id}`}
                          generation={generation}
                          aspectClass="aspect-square"
                        />
                      ))}
                    </div>
                  )}
                  <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                    <div className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap')}>
                      {model.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className={cm.cn(
                            cm.fontWeight('semibold'),
                            cm.textSize('xs'),
                            cm.sp('px', 2),
                            'rounded-full bg-primary-container/30 text-primary uppercase tracking-widest',
                          )}
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => activate(model.id)}
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.textSize('xs'),
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        'rounded-full transition-colors uppercase tracking-widest',
                        isActive
                          ? 'bg-surface-container text-on-surface-variant cursor-default'
                          : 'bg-primary text-on-primary hover:bg-primary-dim',
                      )}
                      disabled={isActive || pendingId === model.id}
                    >
                      {pendingId === model.id
                        ? t('models.activating', {}, { defaultValue: 'Activating…' })
                        : isActive
                          ? t('models.activeCta', {}, { defaultValue: 'In use' })
                          : t('models.activate', {}, { defaultValue: 'Activate' })}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </AiImageGeneratorLayout>
  )
}

export default Models
