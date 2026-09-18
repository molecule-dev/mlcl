import { useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface DescriptionSectionProps {
  description: string
  onDescriptionChange: (v: string) => void
}
export default function ListingEditorPropertyDescriptionSection({
  description,
  onDescriptionChange,
}: DescriptionSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const wrapSelection = (before: string, after: string = before) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = description.substring(start, end)
    const newText =
      description.substring(0, start) + before + selected + after + description.substring(end)
    onDescriptionChange(newText)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + before.length, end + before.length)
    })
  }

  const insertBullet = () => {
    const el = textareaRef.current
    if (!el) return
    const pos = el.selectionStart
    const text = description
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1
    const newText = text.substring(0, lineStart) + '- ' + text.substring(lineStart)
    onDescriptionChange(newText)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(pos + 2, pos + 2)
    })
  }

  return (
    <section>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
        <h3
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'font-headline text-on-surface',
          )}
        >
          {t('propertyDescriptionSection.title', {}, { defaultValue: 'Property Description' })}
        </h3>
        <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
          <button
            onClick={() => wrapSelection('**')}
            className={cm.cn(
              cm.sp('p', 2),
              'rounded-lg hover:bg-surface-container-low text-foreground-tertiary hover:text-primary transition-colors',
            )}
          >
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
              format_bold
            </span>
          </button>
          <button
            onClick={() => wrapSelection('*')}
            className={cm.cn(
              cm.sp('p', 2),
              'rounded-lg hover:bg-surface-container-low text-foreground-tertiary hover:text-primary transition-colors',
            )}
          >
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
              format_italic
            </span>
          </button>
          <button
            onClick={insertBullet}
            className={cm.cn(
              cm.sp('p', 2),
              'rounded-lg hover:bg-surface-container-low text-foreground-tertiary hover:text-primary transition-colors',
            )}
          >
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
              format_list_bulleted
            </span>
          </button>
          <button
            onClick={() =>
              wrapSelection(
                '[',
                `](${t('propertyDescriptionSection.linkUrlPlaceholder', {}, { defaultValue: 'url' })})`,
              )
            }
            className={cm.cn(
              cm.sp('p', 2),
              'rounded-lg hover:bg-surface-container-low text-foreground-tertiary hover:text-primary transition-colors',
            )}
          >
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>link</span>
          </button>
        </div>
      </div>
      <div className={cm.cn('relative')}>
        <textarea
          ref={textareaRef}
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 8),
            cm.sp('px', 10),
            cm.fontWeight('medium'),
            cm.textSize('lg'),
            'bg-surface-container-lowest border-0 rounded-2xl text-on-surface placeholder:text-foreground-tertiary leading-relaxed resize-none shadow-sm',
          )}
          placeholder={t(
            'propertyDescriptionSection.placeholder',
            {},
            { defaultValue: 'Begin writing the narrative for this exceptional residence...' },
          )}
          rows={8}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={2500}
        ></textarea>
        <div
          className={cm.cn(
            cm.fontWeight('bold'),
            'absolute bottom-4 right-6 text-[10px] text-foreground-tertiary uppercase tracking-widest',
          )}
        >
          {t(
            'propertyDescriptionSection.characterCount',
            { current: description.length, max: 2500 },
            { defaultValue: '{{current}} / {{max}} Characters' },
          )}
        </div>
      </div>
    </section>
  )
}
export { ListingEditorPropertyDescriptionSection }
