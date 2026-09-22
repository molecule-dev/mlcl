import { useEffect, useRef, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface KnowledgeDocument {
  id: string
  name?: string
  title?: string
  pages?: number
  page_count?: number
  status?: string
}

function KnowledgeSourceCard({
  doc,
  onDelete,
}: {
  doc?: KnowledgeDocument
  onDelete?: (id: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const name =
    doc?.name ??
    doc?.title ??
    t('knowledgeSourceCard.untitledDocument', {}, { defaultValue: 'Untitled Document' })
  const pages = doc?.pages ?? doc?.page_count
  const icon = name.endsWith('.md') ? 'description' : 'picture_as_pdf'
  const isTraining = ['training', 'processing'].includes((doc?.status ?? '').toLowerCase())
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const http = useHttpClient()
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
      <div className={cm.flex({ align: 'center', gap: 'lg' })}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(14),
            cm.h(14),
            'rounded-xl bg-primary/5 text-primary',
          )}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('3xl'))} data-icon={icon}>
            {icon}
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
            {name}
          </h4>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'gap-1.5 text-on-surface-variant',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
                data-icon="file_open"
              >
                file_open
              </span>
              {pages != null
                ? pages === 1
                  ? t('knowledgeSourceCard.pageCountOne', {}, { defaultValue: '1 page' })
                  : t(
                      'knowledgeSourceCard.pageCount',
                      { count: pages },
                      { defaultValue: '{{count}} pages' },
                    )
                : t(
                    'knowledgeSourceCard.pageCountUnavailable',
                    {},
                    { defaultValue: 'Pages unknown' },
                  )}
            </span>
            <span className={cm.cn(cm.h(1), cm.w(1), cm.roundedFull, 'bg-outline-variant')}></span>
            {isTraining ? (
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.flex({ align: 'center' }),
                  cm.sp('px', 2),
                  'text-[10px] uppercase tracking-wider py-0.5 rounded-full bg-warning-light text-warning gap-1 italic',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[12px] animate-pulse')}
                  data-icon="sync"
                >
                  sync
                </span>
                {t('knowledgeSourceCard.statusTraining', {}, { defaultValue: 'Training...' })}
              </span>
            ) : (
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.flex({ align: 'center' }),
                  cm.sp('px', 2),
                  'text-[10px] uppercase tracking-wider py-0.5 rounded-full bg-success-light text-success gap-1',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[12px]')}
                  data-icon="check_circle"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                {t('knowledgeSourceCard.statusTrained', {}, { defaultValue: 'Trained' })}
              </span>
            )}
          </div>
        </div>
      </div>
      <div ref={menuRef} className={cm.cn('relative')}>
        <button
          aria-label={t('knowledgeSourceCard.moreActions', {}, { defaultValue: 'More actions' })}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
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
              'absolute right-0 top-12 z-50 min-w-[160px] bg-surface-container rounded-xl shadow-lg border border-outline-variant/20 overflow-hidden',
            )}
          >
            <button
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.w('full'),
                'gap-3 text-error hover:bg-error/5 transition-colors',
              )}
              onClick={async () => {
                setMenuOpen(false)
                if (doc?.id) {
                  await http.delete(`/api/training/documents/${doc.id}`)
                  void track({
                    name: 'knowledge.document_removed',
                    properties: { document_id: doc.id },
                  })
                  onDelete?.(doc.id)
                }
              }}
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

export default KnowledgeSourceCard
export { KnowledgeSourceCard }
