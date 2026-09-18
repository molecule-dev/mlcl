import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type Format = 'All Formats' | 'GLB' | 'OBJ' | 'FBX' | 'USDZ'
const FORMATS: Format[] = ['All Formats', 'GLB', 'OBJ', 'FBX', 'USDZ']

type SortOption = 'Recent' | 'Popular' | 'Name'
const SORT_OPTIONS: SortOption[] = ['Recent', 'Popular', 'Name']

function ModelLibraryFilterRow() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const SORT_LABELS: Record<SortOption, string> = {
    Recent: t('status.recent', {}, { defaultValue: 'Recent' }),
    Popular: t('modelLibraryFilterRow.sortPopular', {}, { defaultValue: 'Popular' }),
    Name: t('form.name', {}, { defaultValue: 'Name' }),
  }
  const [activeFormat, setActiveFormat] = useState<Format>('All Formats')
  const [polycount, setPolycount] = useState(50)
  const [sortOpen, setSortOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('Recent')
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sortOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sortOpen])
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
        {FORMATS.map((fmt) => (
          <button
            key={fmt}
            onClick={() => setActiveFormat(fmt)}
            className={
              activeFormat === fmt
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
            {fmt === 'All Formats'
              ? t('modelLibraryFilterRow.allFormats', {}, { defaultValue: 'All Formats' })
              : fmt}
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
            {t('modelLibraryFilterRow.polycount', {}, { defaultValue: 'Polycount' })}
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
            onChange={(e) => setPolycount(Number(e.target.value))}
          />
        </div>
        <div
          className={cm.cn(cm.h(6), cm.w('[1px]'), 'bg-outline-variant/50 hidden md:block')}
        ></div>
        <div className={cm.cn(cm.cursorPointer, 'relative group')} ref={sortRef}>
          <button
            type="button"
            aria-expanded={sortOpen}
            aria-haspopup="true"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('px', 3),
              'text-on-surface py-1.5 rounded-md hover:bg-surface-container transition-colors',
            )}
            onClick={() => setSortOpen((o) => !o)}
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              sort
            </span>
            {SORT_LABELS[sortBy]}
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              expand_more
            </span>
          </button>
          {sortOpen && (
            <div
              className={cm.cn(
                cm.w(32),
                cm.sp('py', 1),
                cm.sp('mt', 1),
                'absolute right-0 bg-surface-container rounded-lg shadow-lg z-10',
              )}
            >
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 3),
                    cm.textSize('sm'),
                    'text-left py-1.5 text-on-surface hover:bg-surface-container-highest transition-colors',
                  )}
                  onClick={() => {
                    setSortBy(opt)
                    setSortOpen(false)
                  }}
                >
                  {SORT_LABELS[opt]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ModelLibraryFilterRow
export { ModelLibraryFilterRow }
