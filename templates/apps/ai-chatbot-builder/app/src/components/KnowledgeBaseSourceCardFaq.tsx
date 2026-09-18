import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface KnowledgeBaseSourceCardFaqProps {
  onView?: () => void
  onRemove?: () => void
}

function KnowledgeBaseSourceCardFaq({ onView, onRemove }: KnowledgeBaseSourceCardFaqProps = {}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleOutsideClick = (e: MouseEvent) => {
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
            data-icon="picture_as_pdf"
          >
            picture_as_pdf
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
            {t('knowledgeBaseSourceCardFaq.documentName', {}, { defaultValue: 'FAQ Document.pdf' })}
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
                'knowledgeBaseSourceCardFaq.pageCount',
                { count: 12 },
                { defaultValue: '{{count}} pages' },
              )}
            </span>
            <span className={cm.cn(cm.h(1), cm.w(1), cm.roundedFull, 'bg-outline-variant')}></span>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.flex({ align: 'center' }),
                cm.sp('px', 2),
                'text-[10px] uppercase tracking-wider py-0.5 rounded bg-warning-light text-warning gap-1 italic',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[12px] animate-pulse')}
                data-icon="sync"
              >
                sync
              </span>
              {t('knowledgeBaseSourceCardFaq.trainingStatus', {}, { defaultValue: 'Training...' })}
            </span>
          </div>
        </div>
      </div>
      <div className={cm.cn('relative')} ref={menuRef}>
        <button
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'text-outline hover:bg-surface-container-high transition-colors',
          )}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="more_vert">
            more_vert
          </span>
        </button>
        {menuOpen && (
          <div
            className={cm.cn(
              cm.sp('py', 1),
              'absolute right-0 top-12 z-10 min-w-[140px] rounded-xl bg-surface-container-low shadow-lg border border-outline-variant/20',
            )}
          >
            <button
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-full gap-2 text-on-surface hover:bg-surface-container-high transition-colors',
              )}
              onClick={() => {
                setMenuOpen(false)
                onView?.()
              }}
              data-mol-id="kb-faq-view"
            >
              <span
                className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}
                data-icon="visibility"
              >
                visibility
              </span>
              {t('common.view', {}, { defaultValue: 'View' })}
            </button>
            <button
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-full gap-2 text-error hover:bg-error/5 transition-colors',
              )}
              onClick={() => {
                setMenuOpen(false)
                onRemove?.()
              }}
              data-mol-id="kb-faq-remove"
            >
              <span
                className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}
                data-icon="delete"
              >
                delete
              </span>
              {t('common.remove', {}, { defaultValue: 'Remove' })}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default KnowledgeBaseSourceCardFaq
export { KnowledgeBaseSourceCardFaq }
