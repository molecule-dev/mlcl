import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function ModelEditPreviewPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  return (
    <div
      className={cm.cn(
        cm.w('full'),
        cm.flex({ direction: 'col' }),
        'lg:w-[360px] bg-surface-container-lowest rounded-xl ambient-shadow ghost-border overflow-hidden relative',
      )}
    >
      <div
        className={cm.cn(
          cm.textPrimary,
          cm.sp('px', 2),
          cm.sp('py', 1),
          cm.fontWeight('bold'),
          'absolute top-4 right-4 z-10 bg-primary/10 rounded-md text-[0.6875rem] tracking-wider mono uppercase',
        )}
      >
        {t('modelEditPreviewPanel.fileType', {}, { defaultValue: '.GLB' })}
      </div>
      <div
        className={cm.cn(
          cm.h(64),
          cm.flex({ align: 'center', justify: 'center' }),
          'bg-on-background relative group',
        )}
      >
        <img
          alt={t('modelEditPreviewPanel.previewAlt', {}, { defaultValue: '3D Helmet Model' })}
          className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover opacity-80 mix-blend-screen')}
          data-alt="high-tech motorcycle helmet 3d model render against dark studio background with rim lighting"
          src="https://picsum.photos/seed/ModelEditPreviewPanel-1/1200/800"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-on-background/80 to-transparent"></div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'absolute bottom-4 left-4')}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'material-symbols-outlined text-tertiary-fixed-dim',
            )}
            data-icon="interests"
          >
            interests
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'mono text-on-tertiary tracking-tight tabular-nums',
            )}
          >
            {t(
              'modelEditPreviewPanel.triangleCount',
              { count: '14.2k' },
              { defaultValue: '{{count}} tris' },
            )}
          </span>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ justify: 'center' }),
          'bg-surface-container-low border-t border-outline-variant/10',
        )}
      >
        <div
          className={cm.cn(
            cm.roundedFull,
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.flex({ gap: 4 }),
            'glass-panel ambient-shadow border border-surface/20',
          )}
        >
          <button
            className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            onClick={() => setIsPlaying((p) => !p)}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              data-icon={isPlaying ? 'pause' : 'play_arrow'}
            >
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button
            className={`${isRotating ? 'text-primary' : 'text-on-surface-variant'} hover:text-primary transition-colors`}
            onClick={() => setIsRotating((r) => !r)}
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="360">
              360
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
export default ModelEditPreviewPanel
