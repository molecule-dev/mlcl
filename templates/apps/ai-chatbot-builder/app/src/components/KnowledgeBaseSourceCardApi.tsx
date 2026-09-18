import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface KnowledgeBaseSourceCardApiProps {
  onViewDetails?: () => void
  onRemove?: () => void
}

function KnowledgeBaseSourceCardApi({
  onViewDetails,
  onRemove,
}: KnowledgeBaseSourceCardApiProps = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('p', 5),
        'group bg-surface-container-lowest hover:bg-surface-bright rounded-2xl border border-outline-variant/20 transition-all',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-5')}>
        <div
          className={cm.cn(
            cm.w(14),
            cm.h(14),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-xl bg-primary/5 text-primary',
          )}
        >
          <span
            className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined')}
            data-icon="description"
          >
            description
          </span>
        </div>
        <div>
          <h4
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              cm.sp('mb', 1),
              'text-on-surface group-hover:text-primary transition-colors',
            )}
          >
            {t('knowledgeBaseSourceCard.title', {}, { defaultValue: 'API Reference.md' })}
          </h4>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'gap-1.5 text-on-surface-variant',
              )}
            >
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                data-icon="file_open"
              >
                file_open
              </span>
              {t(
                'knowledgeBaseSourceCard.pageCount',
                { count: 28 },
                { defaultValue: '{{count}} pages' },
              )}
            </span>
            <span className={cm.cn(cm.h(1), cm.w(1), cm.roundedFull, 'bg-outline-variant')}></span>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.flex({ align: 'center' }),
                cm.sp('px', 2),
                'text-[10px] uppercase tracking-wider py-0.5 rounded bg-success-light text-success gap-1',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[12px]')}
                data-icon="check_circle"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              {t('knowledgeBaseSourceCard.statusTrained', {}, { defaultValue: 'Trained' })}
            </span>
          </div>
        </div>
      </div>
      <div ref={menuRef} className={cm.cn('relative')}>
        <button
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'text-outline hover:bg-surface-container-high transition-colors',
          )}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="more_vert">
            more_vert
          </span>
        </button>
        {menuOpen && (
          <div
            className={cm.cn(
              cm.sp('mt', 1),
              cm.w(40),
              cm.sp('py', 1),
              'absolute right-0 bg-surface-container rounded-xl shadow-lg border border-outline-variant/20 z-10',
            )}
          >
            <button
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-full text-left text-on-surface hover:bg-surface-container-high transition-colors',
              )}
              onClick={() => {
                setMenuOpen(false)
                onViewDetails?.()
              }}
              data-mol-id="kb-api-view-details"
            >
              {t('common.viewDetails', {}, { defaultValue: 'View details' })}
            </button>
            <button
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-full text-left text-error hover:bg-surface-container-high transition-colors',
              )}
              onClick={() => {
                setMenuOpen(false)
                onRemove?.()
              }}
              data-mol-id="kb-api-remove"
            >
              {t('common.remove', {}, { defaultValue: 'Remove' })}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default KnowledgeBaseSourceCardApi
export { KnowledgeBaseSourceCardApi }
