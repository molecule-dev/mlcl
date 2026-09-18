import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function InspectorPanel({ modelName, modelId }: { modelName?: string; modelId?: string } = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'inspector' | 'hierarchy' | 'materials'>('inspector')
  const [transformOpen, setTransformOpen] = useState(true)
  const [materialOpen, setMaterialOpen] = useState(false)
  const [renderingOpen, setRenderingOpen] = useState(true)
  const [castShadows, setCastShadows] = useState(true)
  const [receiveShadows, setReceiveShadows] = useState(true)
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'fixed right-0 top-[48px] h-[calc(100vh-48px)] w-80 bg-surface-container-high/90 backdrop-blur-2xl border-l border-outline-variant/15 z-40 shadow-[-8px_0_32px_rgba(0,0,0,0.3)]',
      )}
    >
      {/* Context Tabs */}
      <div
        className={cm.cn(
          cm.flex({}),
          'border-b border-outline-variant/15 overflow-x-auto no-scrollbar',
        )}
      >
        <button
          role="tab"
          aria-selected={activeTab === 'inspector'}
          onClick={() => setActiveTab('inspector')}
          className={`px-4 py-3 text-xs font-label uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === 'inspector' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'}`}
        >
          {t('inspectorPanel.tabInspector', {}, { defaultValue: 'Inspector' })}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'hierarchy'}
          onClick={() => setActiveTab('hierarchy')}
          className={`px-4 py-3 text-xs font-label uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === 'hierarchy' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'}`}
        >
          {t('inspectorPanel.tabHierarchy', {}, { defaultValue: 'Hierarchy' })}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'materials'}
          onClick={() => setActiveTab('materials')}
          className={`px-4 py-3 text-xs font-label uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === 'materials' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'}`}
        >
          {t('inspectorPanel.tabMaterials', {}, { defaultValue: 'Materials' })}
        </button>
      </div>
      {/* Header Info */}
      <div
        className={cm.cn(
          cm.sp('p', 5),
          'border-b border-outline-variant/15 bg-surface-container-highest/30',
        )}
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 1))}>
          <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {modelName ?? 'Dragon-Head_Mesh'}
          </h2>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
            info
          </span>
        </div>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-label')}>
          {t(
            'inspectorPanel.objectId',
            { id: modelId ?? '#8A4B-992C' },
            { defaultValue: 'ID: {{id}}' },
          )}
        </p>
      </div>
      {/* Scrollable Properties */}
      <div className={cm.cn(cm.flex1, cm.sp('p', 4), 'overflow-y-auto space-y-4 custom-scrollbar')}>
        {/* Transform Section */}
        <div
          className={cm.cn(
            'rounded-lg bg-surface-container/50 border border-outline-variant/10 overflow-hidden',
          )}
        >
          <button
            type="button"
            aria-expanded={transformOpen}
            onClick={() => setTransformOpen((o) => !o)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.flex({ justify: 'between', align: 'center' }),
              cm.w('full'),
              cm.cursorPointer,
              'py-2.5 bg-surface-container hover:bg-surface-bright/30 border-b border-outline-variant/10',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider text-on-surface',
              )}
            >
              {t('inspectorPanel.transformSection', {}, { defaultValue: 'Transform' })}
            </span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              {transformOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          <div className={transformOpen ? 'p-3 space-y-2' : 'hidden'}>
            {/* Position */}
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'group')}>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant w-1/3')}>
                {t('inspectorPanel.position', {}, { defaultValue: 'Position' })}
              </span>
              <div className={cm.cn(cm.flex({ gap: 1 }), 'w-2/3')}>
                <div
                  className={cm.cn(
                    cm.flex1,
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    'bg-surface-container-lowest border border-outline-variant/20 rounded group-focus-within:border-primary/50 transition-colors',
                  )}
                >
                  <span className="text-[9px] text-error font-label">X</span>
                  <span
                    className={cm.cn(cm.textSize('xs'), 'font-label tabular-nums text-on-surface')}
                  >
                    0.00
                  </span>
                </div>
                <div
                  className={cm.cn(
                    cm.flex1,
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    'bg-surface-container-lowest border border-outline-variant/20 rounded',
                  )}
                >
                  <span className="text-[9px] text-primary font-label">Y</span>
                  <span
                    className={cm.cn(cm.textSize('xs'), 'font-label tabular-nums text-on-surface')}
                  >
                    12.4
                  </span>
                </div>
                <div
                  className={cm.cn(
                    cm.flex1,
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    'bg-surface-container-lowest border border-outline-variant/20 rounded',
                  )}
                >
                  <span className="text-[9px] text-tertiary font-label">Z</span>
                  <span
                    className={cm.cn(cm.textSize('xs'), 'font-label tabular-nums text-on-surface')}
                  >
                    -4.2
                  </span>
                </div>
              </div>
            </div>
            {/* Rotation */}
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'group')}>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant w-1/3')}>
                {t('inspectorPanel.rotation', {}, { defaultValue: 'Rotation' })}
              </span>
              <div className={cm.cn(cm.flex({ gap: 1 }), 'w-2/3')}>
                <div
                  className={cm.cn(
                    cm.flex1,
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    'bg-surface-container-lowest border border-outline-variant/20 rounded',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.textCenter,
                      'font-label tabular-nums text-on-surface w-full',
                    )}
                  >
                    90.0
                  </span>
                </div>
                <div
                  className={cm.cn(
                    cm.flex1,
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    'bg-surface-container-lowest border border-outline-variant/20 rounded',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.textCenter,
                      'font-label tabular-nums text-on-surface w-full',
                    )}
                  >
                    0.0
                  </span>
                </div>
                <div
                  className={cm.cn(
                    cm.flex1,
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    'bg-surface-container-lowest border border-outline-variant/20 rounded',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.textCenter,
                      'font-label tabular-nums text-on-surface w-full',
                    )}
                  >
                    0.0
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Material Section */}
        <div
          className={cm.cn(
            'rounded-lg bg-surface-container/50 border border-outline-variant/10 overflow-hidden',
          )}
        >
          <button
            type="button"
            aria-expanded={materialOpen}
            onClick={() => setMaterialOpen((o) => !o)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.flex({ justify: 'between', align: 'center' }),
              cm.w('full'),
              cm.cursorPointer,
              'py-2.5 bg-surface-container hover:bg-surface-bright/30 border-b border-outline-variant/10',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider text-on-surface',
              )}
            >
              {t('inspectorPanel.materialSection', {}, { defaultValue: 'Material' })}
            </span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              {materialOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          <div className={materialOpen ? 'p-3 space-y-3' : 'hidden'}>
            {/* Intentionally hidden to show collapsed state, but code structured for it */}
          </div>
        </div>
        {/* Rendering Section */}
        <div
          className={cm.cn(
            'rounded-lg bg-surface-container/50 border border-outline-variant/10 overflow-hidden',
          )}
        >
          <button
            type="button"
            aria-expanded={renderingOpen}
            onClick={() => setRenderingOpen((o) => !o)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.flex({ justify: 'between', align: 'center' }),
              cm.w('full'),
              cm.cursorPointer,
              'py-2.5 bg-surface-container hover:bg-surface-bright/30 border-b border-outline-variant/10',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider text-on-surface',
              )}
            >
              {t('inspectorPanel.renderingSection', {}, { defaultValue: 'Rendering' })}
            </span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              {renderingOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          <div className={renderingOpen ? 'p-3 space-y-3' : 'hidden'}>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.h(8))}>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('inspectorPanel.castShadows', {}, { defaultValue: 'Cast Shadows' })}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={castShadows}
                aria-label={t('inspectorPanel.castShadows', {}, { defaultValue: 'Cast Shadows' })}
                onClick={() => setCastShadows((v) => !v)}
                className={`w-8 h-4 rounded-full relative cursor-pointer border transition-colors ${castShadows ? 'bg-primary/30 border-primary/50' : 'bg-outline-variant/30 border-outline-variant/50'}`}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${castShadows ? 'right-0.5 bg-primary' : 'left-0.5 bg-on-surface-variant'}`}
                ></span>
              </button>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.h(8))}>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('inspectorPanel.receiveShadows', {}, { defaultValue: 'Receive Shadows' })}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={receiveShadows}
                aria-label={t(
                  'inspectorPanel.receiveShadows',
                  {},
                  { defaultValue: 'Receive Shadows' },
                )}
                onClick={() => setReceiveShadows((v) => !v)}
                className={`w-8 h-4 rounded-full relative cursor-pointer border transition-colors ${receiveShadows ? 'bg-primary/30 border-primary/50' : 'bg-outline-variant/30 border-outline-variant/50'}`}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${receiveShadows ? 'right-0.5 bg-primary' : 'left-0.5 bg-on-surface-variant'}`}
                ></span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.sp('p', 4),
          'border-t border-outline-variant/15 bg-surface-container-highest',
        )}
      />
    </aside>
  )
}

export default InspectorPanel
export { InspectorPanel }
