import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ModelEditRenderSettings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<'solid' | 'wireframe' | 'textured' | 'matcap'>(
    'textured',
  )
  const [polycount, setPolycount] = useState(42000)
  const [camX, setCamX] = useState('0.000')
  const [camY, setCamY] = useState('1.540')
  const [camZ, setCamZ] = useState('3.200')

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl ambient-shadow ghost-border lg:p-8',
      )}
    >
      <h2
        className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 6), 'text-[1.375rem] text-on-surface')}
      >
        {t('renderSettings.title', {}, { defaultValue: 'Render Settings' })}
      </h2>
      <div className={cm.cn(cm.grid({ cols: 1, gap: 8 }), 'lg:grid-cols-3')}>
        <div className="col-span-1">
          <label
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 3),
              'block text-[0.6875rem] tracking-[0.05em] uppercase text-on-surface-variant',
            )}
          >
            {t('renderSettings.defaultViewMode', {}, { defaultValue: 'Default View Mode' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 2 }),
              cm.sp('p', 2),
              'bg-surface-container rounded-xl',
            )}
          >
            <button
              className={
                viewMode === 'solid'
                  ? 'flex items-center justify-between px-4 py-2 bg-surface-container-highest text-primary rounded-lg text-sm font-bold shadow-sm'
                  : 'flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-container-high transition-colors'
              }
              onClick={() => setViewMode('solid')}
            >
              {t('renderSettings.viewModeSolid', {}, { defaultValue: 'Solid' })}

              <span
                className={`material-symbols-outlined text-[20px] ${viewMode === 'solid' ? 'text-primary' : 'text-outline'}`}
                data-icon="cube"
              >
                square
              </span>
            </button>
            <button
              className={
                viewMode === 'wireframe'
                  ? 'flex items-center justify-between px-4 py-2 bg-surface-container-highest text-primary rounded-lg text-sm font-bold shadow-sm'
                  : 'flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-container-high transition-colors'
              }
              onClick={() => setViewMode('wireframe')}
            >
              {t('renderSettings.viewModeWireframe', {}, { defaultValue: 'Wireframe' })}

              <span
                className={`material-symbols-outlined text-[20px] ${viewMode === 'wireframe' ? 'text-primary' : 'text-outline'}`}
                data-icon="grid_4x4"
              >
                grid_4x4
              </span>
            </button>
            <button
              className={
                viewMode === 'textured'
                  ? 'flex items-center justify-between px-4 py-2 bg-surface-container-highest text-primary rounded-lg text-sm font-bold shadow-sm'
                  : 'flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-container-high transition-colors'
              }
              onClick={() => setViewMode('textured')}
            >
              {t('renderSettings.viewModeTextured', {}, { defaultValue: 'Textured' })}

              <span
                className={`material-symbols-outlined text-[20px] ${viewMode === 'textured' ? 'text-primary' : 'text-outline'}`}
                data-icon="texture"
              >
                texture
              </span>
            </button>
            <button
              className={
                viewMode === 'matcap'
                  ? 'flex items-center justify-between px-4 py-2 bg-surface-container-highest text-primary rounded-lg text-sm font-bold shadow-sm'
                  : 'flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-container-high transition-colors'
              }
              onClick={() => setViewMode('matcap')}
            >
              {t('renderSettings.viewModeMatcap', {}, { defaultValue: 'Matcap' })}

              <span
                className={`material-symbols-outlined text-[20px] ${viewMode === 'matcap' ? 'text-primary' : 'text-outline'}`}
                data-icon="tonality"
              >
                tonality
              </span>
            </button>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 8 }), 'col-span-1 lg:col-span-2')}>
          <div>
            <div
              className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 2))}
            >
              <label
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'block text-[0.6875rem] tracking-[0.05em] uppercase text-on-surface-variant',
                )}
              >
                {t('renderSettings.polycountTarget', {}, { defaultValue: 'Polycount Target' })}
              </label>
              <div className={cm.flex({ align: 'center', gap: 2 })}>
                <span
                  className="material-symbols-outlined text-error text-[16px]"
                  data-icon="warning"
                >
                  warning
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'mono text-error tabular-nums',
                  )}
                >
                  {polycount.toLocaleString()}
                </span>
              </div>
            </div>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.cursorPointer,
                'h-2 bg-surface-container-high rounded-lg appearance-none accent-primary',
              )}
              max={100000}
              min={1000}
              type="range"
              value={polycount}
              onChange={(e) => setPolycount(Number(e.target.value))}
            />
            <div
              className={cm.cn(
                cm.flex({ justify: 'between' }),
                cm.sp('mt', 2),
                cm.textSize('xs'),
                'text-outline mono',
              )}
            >
              <span>{t('renderSettings.polycountMin', {}, { defaultValue: '1k' })}</span>
              <span>
                {t(
                  'renderSettings.polycountWarningLimit',
                  {},
                  { defaultValue: '50k (Warning limit)' },
                )}
              </span>
              <span>{t('renderSettings.polycountMax', {}, { defaultValue: '100k' })}</span>
            </div>
          </div>
          <div>
            <label
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 3),
                'block text-[0.6875rem] tracking-[0.05em] uppercase text-on-surface-variant',
              )}
            >
              {t(
                'renderSettings.cameraOriginPosition',
                {},
                { defaultValue: 'Camera Origin Position' },
              )}
            </label>
            <div className={cm.grid({ cols: 3, gap: 4 })}>
              <div className="relative">
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'absolute left-3 top-1/2 -translate-y-1/2 text-outline',
                  )}
                >
                  {t('renderSettings.axisX', {}, { defaultValue: 'X' })}
                </span>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('pl', 8),
                    cm.sp('pr', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'bg-surface-container-low border border-outline-variant/20 rounded-xl text-on-surface mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-right',
                  )}
                  type="text"
                  value={camX}
                  onChange={(e) => setCamX(e.target.value)}
                />
              </div>
              <div className="relative">
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'absolute left-3 top-1/2 -translate-y-1/2 text-outline',
                  )}
                >
                  {t('renderSettings.axisY', {}, { defaultValue: 'Y' })}
                </span>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('pl', 8),
                    cm.sp('pr', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'bg-surface-container-low border border-outline-variant/20 rounded-xl text-on-surface mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-right',
                  )}
                  type="text"
                  value={camY}
                  onChange={(e) => setCamY(e.target.value)}
                />
              </div>
              <div className="relative">
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'absolute left-3 top-1/2 -translate-y-1/2 text-outline',
                  )}
                >
                  {t('renderSettings.axisZ', {}, { defaultValue: 'Z' })}
                </span>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('pl', 8),
                    cm.sp('pr', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'bg-surface-container-low border border-outline-variant/20 rounded-xl text-on-surface mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-right',
                  )}
                  type="text"
                  value={camZ}
                  onChange={(e) => setCamZ(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModelEditRenderSettings
export { ModelEditRenderSettings }
