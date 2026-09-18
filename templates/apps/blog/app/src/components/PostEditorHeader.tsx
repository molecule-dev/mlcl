import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface PostEditorHeaderProps {
  title: string
  setTitle: (v: string) => void
  excerpt: string
  setExcerpt: (v: string) => void
}
function PostEditorHeader({ title, setTitle, excerpt, setExcerpt }: PostEditorHeaderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      {/* Editor Header */}
      <div className={cm.stack(6)}>
        <input
          className={cm.cn(
            cm.sp('p', 0),
            'text-5xl',
            cm.fontWeight('bold'),
            cm.w('full'),
            'editor-input bg-transparent border-none font-headline md:text-6xl tracking-tight text-on-background placeholder:text-surface-container-highest',
          )}
          id="input-post-title"
          aria-label={t('postEditorHeader.titleLabel', {}, { defaultValue: 'Post title' })}
          placeholder={t('form.title', {}, { defaultValue: 'Title' })}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className={cm.cn(cm.sp('pb', 4), 'living-line')}>
          <input
            className={cm.cn(
              cm.sp('p', 0),
              cm.textSize('2xl'),
              cm.w('full'),
              'editor-input bg-transparent border-none font-headline italic text-on-surface-variant placeholder:text-surface-container-highest',
            )}
            id="input-post-excerpt"
            aria-label={t('postEditorHeader.excerptLabel', {}, { defaultValue: 'Post subtitle' })}
            placeholder={t(
              'postEditorHeader.excerptPlaceholder',
              {},
              { defaultValue: 'Write a subtitle...' },
            )}
            type="text"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
        </div>
      </div>
    </>
  )
}

export default PostEditorHeader
export { PostEditorHeader }
