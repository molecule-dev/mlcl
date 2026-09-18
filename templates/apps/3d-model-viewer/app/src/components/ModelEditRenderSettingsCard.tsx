import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ViewMode } from '../pages/ModelEdit.js'

interface RenderSettingsProps {
  viewMode: ViewMode
  setViewMode: (v: ViewMode) => void
  polycount: number
  setPolycount: (v: number) => void
  cameraPos: { x: string; y: string; z: string }
  setCameraPos: (v: { x: string; y: string; z: string }) => void
}

const VIEW_MODES: Array<{ mode: ViewMode; icon: string; iconKey: string }> = [
  { mode: 'Solid', icon: 'square', iconKey: 'cube' },
  { mode: 'Wireframe', icon: 'grid_4x4', iconKey: 'grid_4x4' },
  { mode: 'Textured', icon: 'texture', iconKey: 'texture' },
  { mode: 'Matcap', icon: 'tonality', iconKey: 'tonality' },
]

function ModelEditRenderSettingsCard({
  viewMode,
  setViewMode,
  polycount,
  setPolycount,
  cameraPos,
  setCameraPos,
}: RenderSettingsProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl shadow-[0_12px_40px_rgba(15,15,35,0.06)] ghost-border lg:p-8',
      )}
    >
      <h2
        className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 6), 'text-[1.375rem] text-on-surface')}
      >
        {t('modelEditRenderSettings.title', {}, { defaultValue: 'Render Settings' })}
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
            {t(
              'modelEditRenderSettings.defaultViewMode',
              {},
              { defaultValue: 'Default View Mode' },
            )}
          </label>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 2 }),
              cm.sp('p', 2),
              'bg-surface-container rounded-xl',
            )}
          >
            {VIEW_MODES.map(({ mode, icon, iconKey }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={
                  viewMode === mode
                    ? cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        cm.textPrimary,
                        'bg-surface-container-highest rounded-lg shadow-sm',
                      )
                    : cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'rounded-lg hover:bg-surface-container-high transition-colors',
                      )
                }
              >
                {mode}
                <span
                  className={`material-symbols-outlined text-[20px] ${viewMode === mode ? 'text-primary' : 'text-outline'}`}
                  data-icon={iconKey}
                >
                  {icon}
                </span>
              </button>
            ))}
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
                {t(
                  'modelEditRenderSettings.polycountTarget',
                  {},
                  { defaultValue: 'Polycount Target' },
                )}
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
                cm.cursorPointer,
                cm.h(2),
                cm.w('full'),
                'bg-surface-container-high rounded-lg appearance-none accent-primary',
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
              <span>{t('modelEditRenderSettings.polycountMin', {}, { defaultValue: '1k' })}</span>
              <span>
                {t(
                  'modelEditRenderSettings.polycountWarningLimit',
                  {},
                  { defaultValue: '50k (Warning limit)' },
                )}
              </span>
              <span>{t('modelEditRenderSettings.polycountMax', {}, { defaultValue: '100k' })}</span>
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
                'modelEditRenderSettings.cameraOriginPosition',
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
                  {t(
                    'modelEditRenderSettings.axisLabel',
                    { axis: 'X' },
                    { defaultValue: '{{axis}}' },
                  )}
                </span>
                <input
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('py', 2),
                    cm.sp('pl', 8),
                    cm.sp('pr', 4),
                    cm.textRight,
                    cm.w('full'),
                    'bg-surface-container-low border border-outline-variant/20 rounded-xl mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                  )}
                  type="text"
                  value={cameraPos.x}
                  onChange={(e) => setCameraPos({ ...cameraPos, x: e.target.value })}
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
                  {t(
                    'modelEditRenderSettings.axisLabel',
                    { axis: 'Y' },
                    { defaultValue: '{{axis}}' },
                  )}
                </span>
                <input
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('py', 2),
                    cm.sp('pl', 8),
                    cm.sp('pr', 4),
                    cm.textRight,
                    cm.w('full'),
                    'bg-surface-container-low border border-outline-variant/20 rounded-xl mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                  )}
                  type="text"
                  value={cameraPos.y}
                  onChange={(e) => setCameraPos({ ...cameraPos, y: e.target.value })}
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
                  {t(
                    'modelEditRenderSettings.axisLabel',
                    { axis: 'Z' },
                    { defaultValue: '{{axis}}' },
                  )}
                </span>
                <input
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('py', 2),
                    cm.sp('pl', 8),
                    cm.sp('pr', 4),
                    cm.textRight,
                    cm.w('full'),
                    'bg-surface-container-low border border-outline-variant/20 rounded-xl mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                  )}
                  type="text"
                  value={cameraPos.z}
                  onChange={(e) => setCameraPos({ ...cameraPos, z: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModelEditRenderSettingsCard
export { ModelEditRenderSettingsCard }
