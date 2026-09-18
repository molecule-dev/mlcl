import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const COLOR_SWATCHES = [
  {
    key: 'indigo',
    bg: 'bg-indigo-500',
    ring: 'ring-indigo-500',
    hoverRing: 'hover:ring-indigo-500/30',
  },
  { key: 'pink', bg: 'bg-pink-500', ring: 'ring-pink-500', hoverRing: 'hover:ring-pink-500/30' },
  {
    key: 'emerald',
    bg: 'bg-emerald-500',
    ring: 'ring-emerald-500',
    hoverRing: 'hover:ring-emerald-500/30',
  },
  {
    key: 'amber',
    bg: 'bg-amber-500',
    ring: 'ring-amber-500',
    hoverRing: 'hover:ring-amber-500/30',
  },
  { key: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-500', hoverRing: 'hover:ring-blue-500/30' },
  {
    key: 'purple',
    bg: 'bg-purple-500',
    ring: 'ring-purple-500',
    hoverRing: 'hover:ring-purple-500/30',
  },
  {
    key: 'yellow',
    bg: 'bg-yellow-400',
    ring: 'ring-yellow-400',
    hoverRing: 'hover:ring-yellow-400/30',
  },
  { key: 'teal', bg: 'bg-teal-500', ring: 'ring-teal-500', hoverRing: 'hover:ring-teal-500/30' },
]

interface TagsCreateModalProps {
  isOpen?: boolean
  onClose?: () => void
  onSubmit?: (data: { name: string; slug: string; color: string }) => Promise<void>
}

function TagsCreateModal({ isOpen = false, onClose, onSubmit }: TagsCreateModalProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState('indigo')
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-')
  const selectedSwatch = COLOR_SWATCHES.find((c) => c.key === selectedColor) ?? COLOR_SWATCHES[0]

  const handleSave = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const payload = { name: name.trim(), slug, color: selectedColor }
      if (onSubmit) await onSubmit(payload)
      else await http.post('/api/tags', payload)
      onClose?.()
      setName('')
      setSelectedColor('indigo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tags-create-modal-title"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 4),
        'fixed inset-0 z-[100]',
      )}
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cm.cn('absolute inset-0 bg-foreground/40 backdrop-blur-sm')}
      />
      <div
        className={cm.cn(
          cm.w('full'),
          cm.maxW('md'),
          'relative bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden border border-surface/20',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 6),
            cm.sp('py', 6),
            'border-b border-border',
          )}
        >
          <h3
            id="tags-create-modal-title"
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-foreground')}
          >
            {t('tagsCreateModal.createNewTag', {}, { defaultValue: 'Create New Tag' })}
          </h3>
          <button
            onClick={onClose}
            aria-label={t('common.close', {}, { defaultValue: 'Close' })}
            className={cm.fve5769aeb}
          >
            <span className={cm.fv5b245ffa}>close</span>
          </button>
        </div>
        <div className={cm.cn(cm.sp('p', 6), cm.stack(6))}>
          {/* Name */}
          <div className={cm.fv4f3df6dd}>
            <label className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-foreground')}>
              {t('form.name', {}, { defaultValue: 'Name' })}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.sp('px', 4),
                'bg-surface-container-low border border-outline-variant/30 rounded-xl focus:bg-surface focus:ring-2 focus:ring-primary/20 transition-all outline-none',
              )}
              type="text"
            />
          </div>
          {/* Slug */}
          <div className={cm.fv4f3df6dd}>
            <label
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-foreground',
              )}
            >
              {t('tagsCreateModal.slug', {}, { defaultValue: 'Slug' })}

              <span
                className={cm.cn(
                  cm.fontWeight('normal'),
                  'text-[10px] text-foreground-tertiary uppercase tracking-widest',
                )}
              >
                {t('tagsCreateModal.autoGenerated', {}, { defaultValue: 'Auto-Generated' })}
              </span>
            </label>
            <div className={cm.fvdef3facc}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'absolute left-4 top-1/2 -translate-y-1/2 text-foreground-tertiary',
                )}
              >
                {t('tagsCreateModal.slugPrefix', {}, { defaultValue: '/tag/' })}
              </span>
              <input
                readOnly
                value={slug}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'bg-surface-container-low border border-outline-variant/30 rounded-xl pl-14 pr-4 font-mono text-foreground-secondary focus:bg-surface focus:ring-2 focus:ring-primary/20 transition-all outline-none',
                )}
                type="text"
              />
            </div>
          </div>
          {/* Color Swatches */}
          <div className={cm.fv4f3dfa9e}>
            <label className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-foreground')}>
              {t('tagsCreateModal.color', {}, { defaultValue: 'Color' })}
            </label>
            <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
              {COLOR_SWATCHES.map((swatch) => {
                const isSelected = swatch.key === selectedColor
                return (
                  <button
                    key={swatch.key}
                    type="button"
                    aria-label={t(
                      'tagsCreateModal.selectColor',
                      { color: swatch.key },
                      { defaultValue: 'Select {{color}}' },
                    )}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedColor(swatch.key)}
                    className={cm.cn(
                      cm.w(8),
                      cm.h(8),
                      cm.roundedFull,
                      swatch.bg,
                      'transition-all',
                      isSelected
                        ? `ring-2 ring-offset-2 ${swatch.ring}`
                        : `ring-transparent ${swatch.hoverRing}`,
                    )}
                  ></button>
                )
              })}
            </div>
          </div>
          {/* Preview Card */}
          <div className={cm.cn(cm.sp('p', 4), cm.stack(3), 'bg-surface-container rounded-xl')}>
            <label
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-foreground-secondary uppercase tracking-widest',
              )}
            >
              {t('tagsCreateModal.livePreview', {}, { defaultValue: 'Live Preview' })}
            </label>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('p', 3),
                'bg-surface rounded-lg border border-border w-fit',
              )}
            >
              <div className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, selectedSwatch.bg)}></div>
              <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-foreground')}>
                {name || t('tagsCreateModal.previewPlaceholder', {}, { defaultValue: 'tag-name' })}
              </span>
            </div>
          </div>
        </div>
        {/* Footer Buttons */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'end', gap: 'sm' }),
            cm.sp('p', 6),
            'bg-surface-secondary/50',
          )}
        >
          <button
            onClick={onClose}
            className={cm.cn(
              cm.sp('px', 5),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'py-2.5 text-foreground-secondary hover:text-foreground transition-colors',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className={cm.cn(
              cm.sp('px', 8),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'bg-primary hover:bg-primary-container text-on-primary py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {t('tagsCreateModal.saveTag', {}, { defaultValue: 'Save Tag' })}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TagsCreateModal
export { TagsCreateModal }
