import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ModelViewport() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [activeTool, setActiveTool] = useState<'rotate' | 'pan' | 'zoom' | 'layers'>('rotate')
  const [, setSelectedPin] = useState<number | null>(null)
  return (
    <div
      className={cm.cn(
        cm.w('full'),
        'lg:w-7/12 relative aspect-[4/3] rounded-2xl overflow-hidden shadow-ambient group',
      )}
    >
      {/* Viewport Background */}
      <div className="absolute inset-0 bg-on-background">
        <img
          alt={t('modelViewport.viewerAlt', {}, { defaultValue: '3D Model Viewer' })}
          className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover opacity-80')}
          data-alt="High quality 3D rendering of a modern geometric object with soft cinematic lighting against a dark deep blue background"
          src="https://picsum.photos/seed/ModelViewport-1/1200/800"
        />
      </div>
      {/* HUD Corner */}
      <div className="absolute top-4 left-4 font-mono text-[10px] text-on-surface-variant/70 tracking-widest leading-relaxed">
        {t('modelViewport.hudCamera', {}, { defaultValue: 'CAM: PERSPECTIVE' })}
        <br />

        {t('modelViewport.hudFov', { fov: 45 }, { defaultValue: 'FOV: {{fov}}°' })}
        <br />

        {t('modelViewport.hudResolution', {}, { defaultValue: 'RES: 4K UHD' })}
      </div>
      {/* Annotation Pins */}
      <button
        type="button"
        aria-label={t(
          'modelViewport.pinLabel',
          { number: 1 },
          { defaultValue: 'Annotation pin {{number}}' },
        )}
        className={cm.cn(
          'absolute top-[30%] left-[45%]',
          cm.flex({ align: 'center', justify: 'center' }),
        )}
        onClick={() => setSelectedPin((p) => (p === 0 ? null : 0))}
      >
        <div
          className={cm.cn(
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.textSize('xs'),
            cm.cursorPointer,
            cm.w(6),
            cm.h(6),
            'bg-tertiary text-on-tertiary shadow-lg z-10 hover:scale-110 transition-transform',
          )}
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
        </div>
        <div
          className={cm.cn(
            cm.roundedFull,
            cm.w(10),
            cm.h(10),
            'absolute border-2 border-tertiary/40 animate-ping',
          )}
        ></div>
      </button>
      <button
        type="button"
        aria-label={t(
          'modelViewport.pinLabel',
          { number: 2 },
          { defaultValue: 'Annotation pin {{number}}' },
        )}
        className={cm.cn(
          'absolute top-[60%] right-[30%]',
          cm.flex({ align: 'center', justify: 'center' }),
        )}
        onClick={() => setSelectedPin((p) => (p === 1 ? null : 1))}
      >
        <div
          className={cm.cn(
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.textSize('xs'),
            cm.cursorPointer,
            cm.w(6),
            cm.h(6),
            'bg-tertiary text-on-tertiary shadow-lg z-10 hover:scale-110 transition-transform',
          )}
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
        </div>
      </button>
      {/* Floating Inspector Panel */}
      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.w(64),
          'absolute bottom-6 right-6 glass-panel ghost-border rounded-xl shadow-ambient transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300',
        )}
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 3))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface',
            )}
          >
            {t('modelViewport.materialPropsTitle', {}, { defaultValue: 'Material Props' })}
          </span>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
            tune
          </span>
        </div>
        <div className={cm.stack(3)}>
          <div className={cm.flex({ justify: 'between', align: 'center' })}>
            <span className={cm.cn(cm.fontWeight('medium'), 'text-[11px] text-on-surface-variant')}>
              {t('modelViewport.roughnessLabel', {}, { defaultValue: 'Roughness' })}
            </span>
            <span className={cm.cn(cm.textPrimary, 'text-[11px] font-mono')}>0.15</span>
          </div>
          <div
            className={cm.cn(
              cm.w('full'),
              cm.roundedFull,
              cm.h(1),
              'bg-surface-container-highest overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.h('full'), cm.roundedFull, 'w-[15%] bg-primary')}></div>
          </div>
          <div className={cm.flex({ justify: 'between', align: 'center' })}>
            <span className={cm.cn(cm.fontWeight('medium'), 'text-[11px] text-on-surface-variant')}>
              {t('modelViewport.metalnessLabel', {}, { defaultValue: 'Metalness' })}
            </span>
            <span className={cm.cn(cm.textPrimary, 'text-[11px] font-mono')}>0.85</span>
          </div>
          <div
            className={cm.cn(
              cm.w('full'),
              cm.roundedFull,
              cm.h(1),
              'bg-surface-container-highest overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.h('full'), cm.roundedFull, 'w-[85%] bg-primary')}></div>
          </div>
        </div>
      </div>
      {/* Viewport Controller */}
      <div
        className={cm.cn(
          cm.roundedFull,
          cm.sp('px', 6),
          cm.sp('py', 3),
          cm.flex({ gap: 6 }),
          'absolute bottom-6 left-1/2 -translate-x-1/2 glass-panel ghost-border shadow-ambient',
        )}
      >
        <button
          onClick={() => setActiveTool('rotate')}
          aria-label={t('modelViewport.rotateTool', {}, { defaultValue: 'Rotate' })}
          aria-pressed={activeTool === 'rotate'}
          className={
            activeTool === 'rotate'
              ? 'text-primary hover:text-primary-container transition-colors'
              : 'text-on-surface-variant hover:text-primary transition-colors'
          }
        >
          <span className="material-symbols-outlined text-[20px]">360</span>
        </button>
        <button
          onClick={() => setActiveTool('pan')}
          aria-label={t('modelViewport.panTool', {}, { defaultValue: 'Pan' })}
          aria-pressed={activeTool === 'pan'}
          className={
            activeTool === 'pan'
              ? 'text-primary hover:text-primary-container transition-colors'
              : 'text-on-surface-variant hover:text-primary transition-colors'
          }
        >
          <span className="material-symbols-outlined text-[20px]">pan_tool</span>
        </button>
        <button
          onClick={() => setActiveTool('zoom')}
          aria-label={t('modelViewport.zoomTool', {}, { defaultValue: 'Zoom' })}
          aria-pressed={activeTool === 'zoom'}
          className={
            activeTool === 'zoom'
              ? 'text-primary hover:text-primary-container transition-colors'
              : 'text-on-surface-variant hover:text-primary transition-colors'
          }
        >
          <span className="material-symbols-outlined text-[20px]">zoom_in</span>
        </button>
        <button
          onClick={() => setActiveTool('layers')}
          aria-label={t('modelViewport.layersTool', {}, { defaultValue: 'Layers' })}
          aria-pressed={activeTool === 'layers'}
          className={
            activeTool === 'layers'
              ? 'text-primary hover:text-primary-container transition-colors'
              : 'text-on-surface-variant hover:text-primary transition-colors'
          }
        >
          <span className="material-symbols-outlined text-[20px]">layers</span>
        </button>
      </div>
    </div>
  )
}

export default ModelViewport
export { ModelViewport }
