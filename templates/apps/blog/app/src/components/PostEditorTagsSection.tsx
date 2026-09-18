import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface PostEditorTagsSectionProps {
  tags: string[]
  setTags: (v: string[]) => void
}
function PostEditorTagsSection({ tags, setTags }: PostEditorTagsSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [newTag, setNewTag] = useState('')
  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }
  function addTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && newTag.trim()) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }
  return (
    <>
      {/* Tags Section */}
      <div className={cm.cn(cm.sp('pt', 16), cm.stack(4), 'border-t border-surface-container')}>
        <div className={cm.flex({ wrap: 'wrap', gap: 'sm', align: 'center' })}>
          {tags.map((tag) => (
            <div
              key={tag}
              className={cm.cn(
                cm.sp('px', 4),
                'py-1.5 bg-secondary-container text-on-secondary-container font-label',
                cm.roundedFull,
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                cm.flex({ align: 'center', gap: 'sm' }),
              )}
            >
              {tag}
              <button
                type="button"
                aria-label={t(
                  'postEditorTagsSection.removeTag',
                  { tag },
                  { defaultValue: 'Remove {{tag}}' },
                )}
                className={cm.cn(cm.flex({ align: 'center' }), 'inline-flex')}
                onClick={() => removeTag(tag)}
              >
                <span
                  className={cm.cn(
                    'material-symbols-outlined hover:text-error transition-colors',
                    cm.textSize('sm'),
                  )}
                  data-icon="close"
                >
                  close
                </span>
              </button>
            </div>
          ))}
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('ml', 2))}>
            <input
              className={cm.cn(
                'bg-transparent border-none font-label focus:ring-0 placeholder:text-on-surface-variant/50',
                cm.sp('p', 0),
                cm.textSize('xs'),
                cm.w(24),
              )}
              id="input-add-tag"
              aria-label={t('postEditorTagsSection.addTagLabel', {}, { defaultValue: 'Add a tag' })}
              placeholder={t(
                'postEditorTagsSection.newTagPlaceholder',
                {},
                { defaultValue: 'Add a tag...' },
              )}
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={addTag}
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default PostEditorTagsSection
export { PostEditorTagsSection }
