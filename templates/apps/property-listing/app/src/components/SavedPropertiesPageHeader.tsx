import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function SavedPropertiesPageHeader({ count }: { count: number }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      {/* Page Header */}
      <section
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between', gap: 'lg' }),
          cm.sp('mb', 16),
          'md:flex-row md:items-end',
        )}
        data-mol-id="page-header-01"
      >
        <div>
          <h1
            className={cm.cn(
              'text-5xl',
              'font-extrabold',
              cm.sp('mb', 2),
              'font-headline tracking-tighter text-on-surface',
            )}
          >
            {t('saved.title', {}, { defaultValue: 'Saved Properties' })}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), 'font-body text-on-surface-variant')}>
            {t(
              'saved.subtitle',
              { count },
              { defaultValue: '{{count}} saved architectural masterpieces.' },
            )}
          </p>
        </div>
        <div className={cm.cn('relative inline-block')} ref={dropdownRef}>
          <button
            type="button"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('medium'),
              'bg-surface-container-low rounded-xl text-on-surface hover:bg-surface-container-high transition-colors',
            )}
            onClick={() => setIsOpen(!isOpen)}
          >
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider opacity-60',
              )}
            >
              {t('saved.sortBy', {}, { defaultValue: 'Sort by:' })}
            </span>
            <span>{t('saved.recentlySaved', {}, { defaultValue: 'Recently Saved' })}</span>
            <span className={cm.cn('material-symbols-outlined')}>expand_more</span>
          </button>
          {isOpen && (
            <div
              className={cm.cn(
                cm.sp('mt', 2),
                cm.sp('py', 2),
                'absolute right-0 w-56 bg-surface-container-low rounded-xl shadow-lg z-10 border border-outline-variant',
              )}
            >
              <button
                type="button"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'block w-full text-left text-on-surface hover:bg-surface-container-high transition-colors',
                )}
                onClick={() => {
                  navigate('/saved?sort=recent')
                  setIsOpen(false)
                }}
              >
                {t('saved.recentlySaved', {}, { defaultValue: 'Recently Saved' })}
              </button>
              <button
                type="button"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'block w-full text-left text-on-surface hover:bg-surface-container-high transition-colors',
                )}
                onClick={() => {
                  navigate('/saved?sort=price_asc')
                  setIsOpen(false)
                }}
              >
                {t('saved.priceAsc', {}, { defaultValue: 'Price: Low to High' })}
              </button>
              <button
                type="button"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'block w-full text-left text-on-surface hover:bg-surface-container-high transition-colors',
                )}
                onClick={() => {
                  navigate('/saved?sort=price_desc')
                  setIsOpen(false)
                }}
              >
                {t('saved.priceDesc', {}, { defaultValue: 'Price: High to Low' })}
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
export default SavedPropertiesPageHeader
