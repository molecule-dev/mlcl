import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ModelCardData {
  id?: string
  name?: string
  format?: string
  polygon_count?: number
  thumbnail_url?: string
  updated_at?: string
}

export default function ModelCard({ model }: { model?: ModelCardData }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fmt = (model?.format ?? 'GLB').toUpperCase()
  const polyCount =
    model?.polygon_count != null ? Number(model.polygon_count).toLocaleString() : '—'
  const polys = t('modelCard.polyCount', { count: polyCount }, { defaultValue: '{{count}} polys' })
  const img = model?.thumbnail_url ?? 'https://picsum.photos/seed/ModelCard-1/1200/800'
  const modelName =
    model?.name || t('modelViewerNavBar.unnamedModel', {}, { defaultValue: 'Untitled model' })
  const editedAt = model?.updated_at
    ? t(
        'modelCard.editedOn',
        { date: new Date(model.updated_at).toLocaleDateString() },
        { defaultValue: 'Edited {{date}}' },
      )
    : t('modelLibraryCard.notUpdatedYet', {}, { defaultValue: 'Not updated yet' })
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={modelName}
      className={cm.cn(
        cm.cursorPointer,
        'bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_12px_40px_rgba(15,15,35,0.06)] min-w-[320px] snap-start group transition-transform duration-200 hover:-translate-y-1',
      )}
      onClick={() => model?.id && navigate(`/models/${model.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (model?.id) navigate(`/models/${model.id}`)
        }
      }}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'aspect-[16/10] bg-on-background relative overflow-hidden',
        )}
      >
        {/* Format Badge */}
        <div
          className={cm.cn(
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'absolute top-3 right-3 bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/20 rounded text-on-surface z-10',
          )}
        >
          {fmt}
        </div>
        {/* Polycount Badge */}
        <div
          className={cm.cn(
            cm.roundedFull,
            cm.sp('py', 1),
            'absolute bottom-3 left-3 bg-secondary-container/90 backdrop-blur-sm text-on-secondary-container font-mono text-[11px] px-2.5 z-10',
          )}
        >
          {polys}
        </div>
        <img
          className={cm.cn(
            cm.w('full'),
            cm.h('full'),
            'object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500',
          )}
          alt={modelName}
          data-alt="abstract 3d geometric shapes floating in dark studio lighting"
          src={img}
        />
      </div>
      <div className={cm.sp('p', 4)}>
        <h4 className={cm.cn(cm.fontWeight('medium'), 'text-on-surface truncate')}>{modelName}</h4>
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {editedAt}
        </p>
      </div>
    </div>
  )
}
export { ModelCard }
