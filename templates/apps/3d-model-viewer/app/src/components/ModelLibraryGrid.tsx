import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import ModelLibraryCard from './ModelLibraryCard.js'

interface ModelItem {
  id: string | number
  name: string
  format: string
  fileSize?: string
  triCount?: string
  updatedAt?: string
  thumbnailUrl?: string
}

interface GridProps {
  models: ModelItem[]
  loading: boolean
  error: string | null
  /** Called after a card's delete action succeeds so the list can drop the row. */
  onDeleted?: (id: string | number) => void
}

function ModelLibraryGrid({ models, loading, error, onDeleted }: GridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.grid({ cols: 1, gap: 6 }),
          'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        )}
        data-mol-id="model-library-loading"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className={cm.cn(cm.flex({ direction: 'col', gap: 3 }), 'animate-pulse')}
          >
            <div
              className={cm.cn(cm.w('full'), 'aspect-[16/10] bg-surface-container rounded-xl')}
            />
            <div className={cm.cn(cm.h(4), cm.w('3/4'), 'bg-surface-container rounded')} />
            <div className={cm.cn(cm.h(3), cm.w('1/2'), 'bg-surface-container rounded')} />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div
        role="alert"
        data-mol-id="model-library-error"
        className={cm.cn(cm.textSize('sm'), cm.sp('py', 8), cm.textCenter, 'text-error')}
      >
        {error}
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div
        data-mol-id="model-library-empty"
        className={cm.cn(cm.textCenter, cm.sp('py', 16), cm.stack(3))}
      >
        <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}>
          {t('modelLibraryGrid.emptyHeading', {}, { defaultValue: 'No models yet' })}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'modelLibraryGrid.emptyBody',
            {},
            { defaultValue: 'Upload your first 3D model to start building your library.' },
          )}
        </p>
        <div>
          <Link
            to="/upload"
            data-mol-id="model-library-upload-cta"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 2 }),
              cm.sp('px', 5),
              cm.sp('py', 2.5),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'inline-flex bg-primary text-on-primary rounded-lg hover:opacity-90 transition-opacity',
            )}
          >
            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
            {t('modelLibraryGrid.uploadCta', {}, { defaultValue: 'Upload a model' })}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.grid({ cols: 1, gap: 6 }),
        'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      )}
      data-mol-id="model-library-grid"
    >
      {/* The card is NOT wrapped in a Link — it contains its own links and a
      delete menu, and nesting those inside an anchor made every menu click
      navigate away (and produced invalid nested <a> markup). */}
      {models.map((model) => (
        <div key={model.id} className="contents" data-mol-id={`model-card-${model.id}`}>
          <ModelLibraryCard model={model} onDeleted={onDeleted} />
        </div>
      ))}
    </div>
  )
}

export default ModelLibraryGrid
export { ModelLibraryGrid }
