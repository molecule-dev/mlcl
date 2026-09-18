import { type ChangeEvent, useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PostEditorCoverImageProps {
  image: string | null
  onImageChange: (url: string | null) => void
}
function PostEditorCoverImage({ image, onImageChange }: PostEditorCoverImageProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImageChange(URL.createObjectURL(file))
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.w('full'),
          'h-[320px]',
          cm.cursorPointer,
          'group relative rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low overflow-hidden transition-all hover:bg-surface-container-highest',
        )}
      >
        <img
          alt={t('postEditorCoverImage.coverPreview', {}, { defaultValue: 'Cover Preview' })}
          className={cm.cn(
            cm.w('full'),
            cm.h('full'),
            'absolute inset-0 object-cover opacity-10 group-hover:opacity-20 transition-opacity',
          )}
          data-alt="Overhead shot of a minimalist workspace with a vintage typewriter, an open journal, and a steaming cup of coffee on a wooden desk"
          src={image ?? 'https://picsum.photos/seed/PostEditorCoverImage-1/1200/800'}
        />
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            'relative z-10 text-on-surface-variant',
          )}
        >
          <span
            className={cm.cn(cm.textSize('4xl'), 'material-symbols-outlined')}
            data-icon="add_a_photo"
          >
            add_a_photo
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-label tracking-wide uppercase',
            )}
          >
            {t('postEditorCoverImage.uploadCta', {}, { defaultValue: 'Add a cover image' })}
          </span>
        </div>
      </button>
      <input
        type="file"
        accept="image/*"
        className={cm.fvb76e9daa}
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </>
  )
}

export default PostEditorCoverImage
export { PostEditorCoverImage }
