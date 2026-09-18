import { useEffect, useRef, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface KnowledgeBaseSourceCardProps {
  id: string
  title?: string
  onRemove?: () => void
  onRename?: (newTitle: string) => void
}

function KnowledgeBaseSourceCard({
  id,
  title = 'Product Manual v3.pdf',
  onRemove,
  onRename,
}: KnowledgeBaseSourceCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  async function handleRemove() {
    setRemoving(true)
    try {
      await http.delete(`/knowledge-base/sources/${id}`)
      setMenuOpen(false)
      onRemove?.()
    } finally {
      setRemoving(false)
    }
  }

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
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(14),
            cm.h(14),
            'rounded-2xl bg-primary/5 text-primary',
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
          {renaming ? (
            <input
              data-mol-id="kb-source-rename-input"
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onRename?.(draftTitle)
                  setRenaming(false)
                } else if (e.key === 'Escape') {
                  setDraftTitle(title)
                  setRenaming(false)
                }
              }}
              onBlur={() => {
                onRename?.(draftTitle)
                setRenaming(false)
              }}
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                cm.sp('mb', 1),
                cm.sp('px', 2),
                'bg-surface-container-high rounded-lg text-on-surface',
              )}
            />
          ) : (
            <h4
              data-mol-id="kb-source-title"
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                cm.sp('mb', 1),
                'text-on-surface group-hover:text-primary transition-colors',
              )}
            >
              {title}
            </h4>
          )}
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
                { count: 45 },
                { defaultValue: '{{count}} pages' },
              )}
            </span>
            <span className={cm.cn(cm.h(1), cm.w(1), cm.roundedFull, 'bg-outline-variant')}></span>
            <span
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.fontWeight('bold'),
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
              'absolute right-0 top-12 z-10 bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-lg min-w-[140px]',
            )}
          >
            <button
              type="button"
              data-mol-id="kb-source-rename"
              onClick={() => {
                setDraftTitle(title)
                setRenaming(true)
                setMenuOpen(false)
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.flex({ align: 'center' }),
                'w-full text-left text-on-surface hover:bg-surface-container-high transition-colors gap-2',
              )}
            >
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                data-icon="edit"
              >
                edit
              </span>
              {t('common.rename', {}, { defaultValue: 'Rename' })}
            </button>
            <button
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.flex({ align: 'center' }),
                'w-full text-left text-error hover:bg-error/10 transition-colors gap-2',
              )}
              onClick={handleRemove}
              disabled={removing}
            >
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
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

export default KnowledgeBaseSourceCard
export { KnowledgeBaseSourceCard }
