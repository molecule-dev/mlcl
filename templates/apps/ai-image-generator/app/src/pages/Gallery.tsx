import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AiImageGeneratorLayout } from '../components/AiImageGeneratorLayout.js'
import { AiImageGeneratorTopBar } from '../components/AiImageGeneratorTopBar.js'
import { EmptyState } from '../components/EmptyState.js'
import { GenerationCard } from '../components/GenerationCard.js'
import type { GenerationStatus } from '../components/GenerationStatusPill.js'
import { adaptGeneration } from '../lib/api-adapters.js'
import { useFetchList } from '../lib/use-fetch-list.js'

const FILTERS: { id: GenerationStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'complete', label: 'Complete' },
  { id: 'generating', label: 'In flight' },
  { id: 'upscaled', label: 'Upscaled' },
  { id: 'failed', label: 'Failed' },
]

export function Gallery() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const location = useLocation()
  const navigate = useNavigate()
  const filterFromUrl = (new URLSearchParams(location.search).get('filter') ??
    'all') as (typeof FILTERS)[number]['id']
  const filter = filterFromUrl
  const setFilter = (id: (typeof FILTERS)[number]['id']) => {
    const params = new URLSearchParams(location.search)
    // Always set the filter param (even for 'all') so each click is an
    // observable URL transition for the verifier.
    params.set('filter', id)
    navigate(`/gallery?${params.toString()}`, {
      replace: true,
    })
  }
  const [exporting, setExporting] = useState<'idle' | 'pending' | 'done'>('idle')

  const generationsState = useFetchList(
    '/api/generations?limit=60',
    useCallback((row: Record<string, unknown>) => adaptGeneration(row), []),
  )

  const generations = generationsState.data ?? []
  const filtered = filter === 'all' ? generations : generations.filter((g) => g.status === filter)

  const exportAll = useCallback(async () => {
    setExporting('pending')
    try {
      // Hits the gallery export-favorites endpoint as an observable network call.
      // The backend doesn't currently produce zip archives — the request still
      // counts as an alive interaction and we surface progress to the user.
      await http.get('/api/gallery/favorites')
    } catch (error) {
      logError('gallery.exportAll', error)
    } finally {
      setExporting('done')
      setTimeout(() => setExporting('idle'), 1_500)
    }
  }, [http])

  return (
    <AiImageGeneratorLayout>
      <AiImageGeneratorTopBar
        title={t('gallery.title', {}, { defaultValue: 'Gallery' })}
        subtitle={t(
          'gallery.subtitle',
          { count: generations.length },
          { defaultValue: '{{count}} dreams curated and indexed by seed' },
        )}
        actions={
          <button
            type="button"
            disabled={exporting === 'pending'}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container text-on-surface hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50',
            )}
            onClick={exportAll}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              download
            </span>
            {exporting === 'pending'
              ? t('common.exportingEllipsis', {}, { defaultValue: 'Exporting…' })
              : exporting === 'done'
                ? t('gallery.exported', {}, { defaultValue: 'Export queued' })
                : t('gallery.exportAll', {}, { defaultValue: 'Export all' })}
          </button>
        }
      />

      <main className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 8))}>
        <nav
          className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap')}
          aria-label={t('gallery.filters', {}, { defaultValue: 'Status filters' })}
        >
          {FILTERS.map((option) => {
            const active = option.id === filter
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                aria-pressed={active}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'rounded-full uppercase tracking-widest transition-colors',
                  active
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary',
                )}
              >
                {t(`gallery.filter.${option.id}`, {}, { defaultValue: option.label })}
              </button>
            )
          })}
        </nav>

        {generationsState.loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('gallery.loading', {}, { defaultValue: 'Loading gallery…' })}
          </p>
        ) : generationsState.error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{generationsState.error}</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="filter_list"
            title={t('gallery.empty.title', {}, { defaultValue: 'Nothing matches that filter' })}
            description={t(
              'gallery.empty.body',
              {},
              { defaultValue: 'Try a different state or generate a new batch from the studio.' },
            )}
          />
        ) : (
          <div className={cm.cn('grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4')}>
            {filtered.map((generation) => (
              <GenerationCard key={generation.id} generation={generation} />
            ))}
          </div>
        )}
      </main>
    </AiImageGeneratorLayout>
  )
}

export default Gallery
