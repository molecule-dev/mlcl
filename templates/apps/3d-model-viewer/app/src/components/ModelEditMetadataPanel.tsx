import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface MetadataPanelProps {
  name: string
  setName: (v: string) => void
  description: string
  setDescription: (v: string) => void
  category: string
  setCategory: (v: string) => void
  tags: string[]
  setTags: (v: string[]) => void
}

function ModelEditMetadataPanel({
  name,
  setName,
  description,
  setDescription,
  category,
  setCategory,
  tags,
  setTags,
}: MetadataPanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [tagInput, setTagInput] = useState('')

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex1,
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl ambient-shadow ghost-border lg:p-8',
      )}
    >
      <h2
        className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 6), 'text-[1.375rem] text-on-surface')}
      >
        {t('modelEditMetadataPanel.heading', {}, { defaultValue: 'Metadata' })}
      </h2>
      <div className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'md:grid-cols-2')}>
        <div className={cm.cn('col-span-1 md:col-span-2')}>
          <label
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'block text-[0.6875rem] tracking-[0.05em] uppercase text-on-surface-variant',
            )}
          >
            {t('modelEditMetadataPanel.nameLabel', {}, { defaultValue: 'Model Name' })}
          </label>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'bg-surface-container-low border border-outline-variant/20 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow',
            )}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className={cm.cn('col-span-1 md:col-span-2')}>
          <label
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'block text-[0.6875rem] tracking-[0.05em] uppercase text-on-surface-variant',
            )}
          >
            {t('form.description', {}, { defaultValue: 'Description' })}
          </label>
          <textarea
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'bg-surface-container-low border border-outline-variant/20 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow resize-none',
            )}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="col-span-1">
          <label
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'block text-[0.6875rem] tracking-[0.05em] uppercase text-on-surface-variant',
            )}
          >
            {t('form.category', {}, { defaultValue: 'Category' })}
          </label>
          <div className="relative">
            <select
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'bg-surface-container-low border border-outline-variant/20 rounded-xl text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              )}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {/* Option values are stable slugs (matching the library's
              ?category= filters) — only the labels are translated. Without
              explicit values the localized display text was saved to the DB
              and never matched any filter. */}
              <option value="">
                {t('modelEditMetadataPanel.categoryNone', {}, { defaultValue: 'No category' })}
              </option>
              <option value="vehicles">
                {t(
                  'modelEditMetadataPanel.categoryVehiclesTransport',
                  {},
                  { defaultValue: 'Vehicles & Transport' },
                )}
              </option>
              <option value="characters">
                {t('modelEditMetadataPanel.categoryCharacters', {}, { defaultValue: 'Characters' })}
              </option>
              <option value="props">
                {t(
                  'modelEditMetadataPanel.categoryPropsAccessories',
                  {},
                  { defaultValue: 'Props & Accessories' },
                )}
              </option>
              <option value="architecture">
                {t(
                  'modelEditMetadataPanel.categoryArchitecture',
                  {},
                  { defaultValue: 'Architecture' },
                )}
              </option>
            </select>
            <span
              className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              data-icon="expand_more"
            >
              expand_more
            </span>
          </div>
        </div>
        <div className="col-span-1">
          <label
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'block text-[0.6875rem] tracking-[0.05em] uppercase text-on-surface-variant',
            )}
          >
            {t('form.format', {}, { defaultValue: 'Format' })}
          </label>
          <div
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.flex({ align: 'center' }),
              'bg-surface border border-outline-variant/10 rounded-xl text-on-surface-variant cursor-not-allowed opacity-70',
            )}
          >
            <span className="mono">
              {t('modelEditMetadataPanel.formatName', {}, { defaultValue: 'GLTF / GLB Binary' })}
            </span>
          </div>
        </div>
        <div className={cm.cn('col-span-1 md:col-span-2')}>
          <label
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'block text-[0.6875rem] tracking-[0.05em] uppercase text-on-surface-variant',
            )}
          >
            {t('form.tags', {}, { defaultValue: 'Tags' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ wrap: 'wrap', gap: 2 }),
              cm.sp('p', 3),
              cm.minH('[50px]'),
              'bg-surface-container-low border border-outline-variant/20 rounded-xl',
            )}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'inline-flex items-center gap-1 bg-surface-container rounded-lg text-on-surface',
                )}
              >
                {tag}
                <button
                  className={cm.cn('hover:text-primary')}
                  onClick={() => setTags(tags.filter((tag2) => tag2 !== tag))}
                >
                  <span className="material-symbols-outlined text-[14px]" data-icon="close">
                    close
                  </span>
                </button>
              </span>
            ))}
            <input
              className={cm.cn(
                cm.textSize('sm'),
                cm.flex1,
                'bg-transparent border-none focus:outline-none focus:ring-0 min-w-[100px] text-on-surface',
              )}
              aria-label={t('modelEditMetadataPanel.addTagLabel', {}, { defaultValue: 'Add tag' })}
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModelEditMetadataPanel
export { ModelEditMetadataPanel }
