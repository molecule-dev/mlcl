import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ModelItem {
  id?: string | number
  name?: string
  format?: string
  fileSize?: string
  triCount?: string
  updatedAt?: string
  thumbnailUrl?: string
}
function ModelLibraryCard({
  model,
  onDeleted,
}: {
  model?: ModelItem
  onDeleted?: (id: string | number) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const title =
    model?.name || t('modelViewerNavBar.unnamedModel', {}, { defaultValue: 'Untitled model' })
  const fmt = model?.format ?? 'GLB'
  const meta = `${model?.fileSize ?? '—'} • ${model?.updatedAt ? t('modelLibraryCard.updatedAt', { date: model.updatedAt }, { defaultValue: 'Updated {{date}}' }) : t('modelLibraryCard.notUpdatedYet', {}, { defaultValue: 'Not updated yet' })}`
  const triCount = model?.triCount ?? '—'
  const imgSrc = model?.thumbnailUrl ?? 'https://picsum.photos/seed/ModelLibraryCard-1/1200/800'
  const http = useHttpClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const handleDelete = async () => {
    setMenuOpen(false)
    if (!model?.id) return
    setDeleting(true)
    try {
      await http.delete(`/api/models/${model.id}`)
      // Tell the parent list to drop this row — navigating to the (already
      // current) /models route never refetched, so the card lingered.
      onDeleted?.(model.id)
    } catch (_error) {
      // delete failed — user stays on same page; they can retry
      setDeleting(false)
    }
  }
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }), 'group')}>
      <Link
        to={model?.id != null ? `/models/${model.id}` : '/models'}
        className={cm.cn(
          cm.w('full'),
          'block relative aspect-[16/10] bg-on-background rounded-xl overflow-hidden outline outline-1 outline-white/10 outline-offset-[-1px]',
        )}
      >
        <img
          alt={title}
          className={cm.cn(
            cm.w('full'),
            cm.h('full'),
            'object-cover transition-transform duration-500 group-hover:scale-[1.03]',
          )}
          src={imgSrc}
        />
        {/* Badges */}
        <div
          className={cm.cn(
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.sp('py', 1),
            'absolute top-3 right-3 bg-primary-container text-on-primary-container text-[10px] px-2.5 uppercase tracking-wider shadow-sm',
          )}
        >
          {fmt}
        </div>
        <div
          className={cm.cn(
            cm.roundedFull,
            cm.flex({ align: 'center' }),
            cm.sp('py', 1),
            'absolute bottom-3 left-3 bg-surface-container-lowest/80 backdrop-blur-md text-on-surface font-mono text-[11px] px-2.5 gap-1.5 border border-outline-variant/20',
          )}
        >
          <span className={cm.cn(cm.w(1.5), cm.h(1.5), cm.roundedFull, 'bg-success')}></span>
          {triCount}
        </div>
      </Link>
      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), cm.sp('px', 1))}>
        <div>
          <Link to={model?.id != null ? `/models/${model.id}` : '/models'}>
            <h3
              className={cm.cn(
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'text-on-surface tracking-tight group-hover:text-primary transition-colors',
              )}
            >
              {title}
            </h3>
          </Link>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {meta}
          </p>
        </div>
        <div ref={menuRef} className="relative">
          <button
            className={cm.cn(
              cm.sp('p', 1),
              'text-on-surface-variant hover:text-on-surface rounded-md hover:bg-surface-container transition-colors',
            )}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="material-symbols-outlined text-[20px]">more_vert</span>
          </button>
          {menuOpen && (
            <div
              className={cm.cn(
                cm.sp('py', 1),
                cm.sp('mt', 1),
                'absolute right-0 top-full z-10 bg-surface-container border border-outline/20 rounded-lg shadow-lg min-w-[140px]',
              )}
            >
              <button
                className={cm.cn(
                  cm.w('full'),
                  cm.textSize('sm'),
                  cm.sp('px', 3),
                  'text-left py-1.5 text-error hover:bg-surface-container-high transition-colors',
                )}
                disabled={deleting}
                onClick={handleDelete}
              >
                {t('common.delete', {}, { defaultValue: 'Delete' })}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ModelLibraryCard
export { ModelLibraryCard }
