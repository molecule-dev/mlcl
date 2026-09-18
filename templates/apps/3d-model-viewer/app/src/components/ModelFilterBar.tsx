import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface FilterProps {
  format: string
  onFormat: (f: string) => void
  polycount: number
  onPolycount: (v: number) => void
  sort: string
  onSort: (s: string) => void
}
// Matches the formats the API accepts (glb/gltf/obj/fbx/stl) — see
// api/src/handlers/models.ts createModelSchema.
const FORMATS = ['All Formats', 'GLB', 'GLTF', 'OBJ', 'FBX', 'STL']
const SORTS = ['Recent', 'Name', 'Size', 'Polycount']
function ModelFilterBar({ format, onFormat, polycount, onPolycount, sort, onSort }: FilterProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const formatLabels: Record<string, string> = {
    'All Formats': t('modelFilterBar.allFormats', {}, { defaultValue: 'All Formats' }),
  }
  const sortLabels: Record<string, string> = {
    Recent: t('status.recent', {}, { defaultValue: 'Recent' }),
    Name: t('form.name', {}, { defaultValue: 'Name' }),
    Size: t('form.size', {}, { defaultValue: 'Size' }),
    Polycount: t('modelFilterBar.sortByPolycount', {}, { defaultValue: 'Polycount' }),
  }
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between', gap: 4 }),
        cm.sp('mb', 8),
        cm.sp('p', 4),
        'xl:flex-row xl:items-center bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(15,15,35,0.03)]',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.sp('pb', 2),
          'overflow-x-auto xl:pb-0 hide-scrollbar',
        )}
      >
        {FORMATS.map((f) => (
          <button
            key={f}
            onClick={() => onFormat(f)}
            className={
              f === format
                ? cm.cn(
                    cm.sp('px', 4),
                    cm.roundedFull,
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'py-1.5 bg-primary text-on-primary whitespace-nowrap',
                  )
                : cm.cn(
                    cm.sp('px', 4),
                    cm.roundedFull,
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'py-1.5 bg-surface-container hover:bg-surface-container-highest text-on-surface-variant transition-colors whitespace-nowrap',
                  )
            }
          >
            {formatLabels[f] ?? f}
          </button>
        ))}
      </div>
      <div className={cm.flex({ align: 'center', gap: 6 })}>
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-on-surface-variant uppercase tracking-wider',
            )}
          >
            {t('modelFilterBar.polycountLabel', {}, { defaultValue: 'Polycount' })}
          </span>
          <input
            className={cm.cn(
              cm.w(32),
              cm.h(1.5),
              cm.roundedFull,
              cm.cursorPointer,
              'accent-primary bg-surface-variant appearance-none',
            )}
            max={100}
            min={0}
            type="range"
            value={polycount}
            onChange={(e) => onPolycount(Number(e.target.value))}
          />
        </div>
        <div
          className={cm.cn(cm.h(6), cm.w('[1px]'), 'bg-outline-variant/50 hidden md:block')}
        ></div>
        <div className={cm.cn(cm.cursorPointer, 'relative group')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('px', 3),
              'text-on-surface py-1.5 rounded-md hover:bg-surface-container transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              sort
            </span>
            <select
              value={sort}
              onChange={(e) => onSort(e.target.value)}
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.cursorPointer,
                'bg-transparent text-on-surface focus:outline-none',
              )}
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {sortLabels[s] ?? s}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              expand_more
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModelFilterBar
export { ModelFilterBar }
