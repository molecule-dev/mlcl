import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ModelInspectorPanel() {
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
        cm.w(80),
        'fixed right-0 top-[48px] h-[calc(100vh-48px)] bg-surface-container-high/90 backdrop-blur-2xl border-l border-outline-variant/15 z-40 shadow-[-8px_0_32px_rgba(0,0,0,0.3)]',
      )}
    >
      {/* Context Tabs */}
      <div
        className={cm.cn(
          cm.flex(),
          'border-b border-outline-variant/15 overflow-x-auto no-scrollbar',
        )}
      >
        {(['inspector', 'hierarchy', 'materials'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('xs'),
              'font-label uppercase tracking-widest whitespace-nowrap transition-colors',
              activeTab === tab
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface/5',
            )}
          >
            {t(
              `modelInspectorPanel.tab.${tab}`,
              {},
              { defaultValue: tab.charAt(0).toUpperCase() + tab.slice(1) },
            )}
          </button>
        ))}
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
            Dragon-Head_Mesh
          </h2>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
            info
          </span>
        </div>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-label')}>
          {t('modelInspectorPanel.meshId', { id: '#8A4B-992C' }, { defaultValue: 'ID: {{id}}' })}
        </p>
      </div>
      {/* Scrollable Properties */}
      <div
        className={cm.cn(cm.flex1, cm.sp('p', 4), cm.stack(4), 'overflow-y-auto custom-scrollbar')}
      >
        {/* Transform Section */}
        <div
          className={cm.cn(
            'rounded-lg bg-surface-container/50 border border-outline-variant/10 overflow-hidden',
          )}
        >
          <button
            type="button"
            aria-expanded={transformOpen}
            className={cm.cn(
              cm.flex({ justify: 'between', align: 'center' }),
              cm.sp('px', 4),
              cm.w('full'),
              cm.cursorPointer,
              'py-2.5 bg-surface-container hover:bg-surface-bright/30 border-b border-outline-variant/10',
            )}
            onClick={() => setTransformOpen((o) => !o)}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider text-on-surface',
              )}
            >
              {t('modelInspectorPanel.sectionTransform', {}, { defaultValue: 'Transform' })}
            </span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              {transformOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          <div className={transformOpen ? cm.cn(cm.sp('p', 3), cm.stack(2)) : 'hidden'}>
            {/* Position */}
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'group')}>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant w-1/3')}>
                {t('modelInspectorPanel.position', {}, { defaultValue: 'Position' })}
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
                {t('modelInspectorPanel.rotation', {}, { defaultValue: 'Rotation' })}
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
            className={cm.cn(
              cm.flex({ justify: 'between', align: 'center' }),
              cm.sp('px', 4),
              cm.w('full'),
              cm.cursorPointer,
              'py-2.5 bg-surface-container hover:bg-surface-bright/30 border-b border-outline-variant/10',
            )}
            onClick={() => setMaterialOpen((o) => !o)}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider text-on-surface',
              )}
            >
              {t('modelInspectorPanel.sectionMaterial', {}, { defaultValue: 'Material' })}
            </span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              {materialOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          <div className={materialOpen ? cm.cn(cm.sp('p', 3), cm.stack(3)) : 'hidden'}>
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
            className={cm.cn(
              cm.flex({ justify: 'between', align: 'center' }),
              cm.sp('px', 4),
              cm.w('full'),
              cm.cursorPointer,
              'py-2.5 bg-surface-container hover:bg-surface-bright/30 border-b border-outline-variant/10',
            )}
            onClick={() => setRenderingOpen((o) => !o)}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider text-on-surface',
              )}
            >
              {t('modelInspectorPanel.sectionRendering', {}, { defaultValue: 'Rendering' })}
            </span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              {renderingOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          <div className={renderingOpen ? cm.cn(cm.sp('p', 3), cm.stack(3)) : 'hidden'}>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.h(8))}>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('modelInspectorPanel.castShadows', {}, { defaultValue: 'Cast Shadows' })}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={castShadows}
                aria-label={t(
                  'modelInspectorPanel.castShadows',
                  {},
                  { defaultValue: 'Cast Shadows' },
                )}
                className={cm.cn(
                  cm.roundedFull,
                  cm.cursorPointer,
                  cm.w(8),
                  cm.h(4),
                  'bg-primary/30 relative border border-primary/50',
                )}
                onClick={() => setCastShadows((v) => !v)}
              >
                <span
                  className={cm.cn(
                    cm.w(3),
                    cm.h(3),
                    cm.roundedFull,
                    'block absolute top-0.5 bg-primary transition-all',
                    castShadows ? 'right-0.5' : 'left-0.5',
                  )}
                ></span>
              </button>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.h(8))}>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('modelInspectorPanel.receiveShadows', {}, { defaultValue: 'Receive Shadows' })}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={receiveShadows}
                aria-label={t(
                  'modelInspectorPanel.receiveShadows',
                  {},
                  { defaultValue: 'Receive Shadows' },
                )}
                className={cm.cn(
                  cm.roundedFull,
                  cm.cursorPointer,
                  cm.w(8),
                  cm.h(4),
                  'bg-primary/30 relative border border-primary/50',
                )}
                onClick={() => setReceiveShadows((v) => !v)}
              >
                <span
                  className={cm.cn(
                    cm.w(3),
                    cm.h(3),
                    cm.roundedFull,
                    'block absolute top-0.5 bg-primary transition-all',
                    receiveShadows ? 'right-0.5' : 'left-0.5',
                  )}
                ></span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Footer Action */}
      <div
        className={cm.cn(
          cm.sp('p', 4),
          'border-t border-outline-variant/15 bg-surface-container-highest',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.w('full'),
            'py-2.5 bg-outline-variant/20 text-on-surface rounded-lg transition-all duration-300 border border-outline-variant/30',
          )}
          aria-label={t('modelInspectorPanel.analyzeMesh', {}, { defaultValue: 'Analyze Mesh' })}
        >
          <span className="material-symbols-outlined text-[18px]">build</span>
          {t('modelInspectorPanel.analyzeMesh', {}, { defaultValue: 'Analyze Mesh' })}
        </span>
      </div>
    </aside>
  )
}

export default ModelInspectorPanel
export { ModelInspectorPanel }
