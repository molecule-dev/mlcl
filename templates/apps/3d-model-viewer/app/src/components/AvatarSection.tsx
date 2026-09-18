import { useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AvatarSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [avatarSrc, setAvatarSrc] = useState('https://picsum.photos/seed/AvatarSection-1/1200/800')
  const [loading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChangePhoto = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarSrc(URL.createObjectURL(file))
  }

  const handleRemove = () => {
    setAvatarSrc('')
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 6 }),
        cm.sp('mb', 12),
        cm.sp('p', 6),
        'bg-surface-container-highest rounded-lg border border-outline-variant/15',
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/gif,image/png"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        aria-label={t('avatarSection.changePhoto', {}, { defaultValue: 'Change photo' })}
        className={cm.cn(
          cm.w(24),
          cm.h(24),
          cm.roundedFull,
          cm.shrink0,
          cm.cursorPointer,
          'bg-surface-container overflow-hidden border-2 border-surface relative group',
        )}
        onClick={handleChangePhoto}
      >
        <img
          alt={t('avatarSection.currentAvatar', {}, { defaultValue: 'Current Avatar' })}
          className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
          data-alt="professional headshot of a young woman with soft natural lighting against a dark neutral background"
          src={avatarSrc}
        />
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm',
          )}
        >
          <span className="material-symbols-outlined text-on-surface">upload</span>
        </div>
      </button>
      <div>
        <div className={cm.cn(cm.flex({ gap: 3 }), cm.sp('mb', 2))}>
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.textPrimary,
              'rounded-lg border border-outline-variant/20 hover:bg-surface-bright transition-colors bg-surface-container-low',
            )}
            onClick={handleChangePhoto}
            disabled={loading}
          >
            {t('avatarSection.changePhoto', {}, { defaultValue: 'Change photo' })}
          </button>
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-error hover:text-error-container transition-colors',
            )}
            onClick={handleRemove}
            disabled={loading}
          >
            {t('common.remove', {}, { defaultValue: 'Remove' })}
          </button>
        </div>
        <p className={cm.cn(cm.textSize('xs'), 'text-outline font-body')}>
          {t('avatarSection.formatHint', {}, { defaultValue: 'JPG, GIF or PNG. 1MB max.' })}
        </p>
      </div>
    </div>
  )
}

export default AvatarSection
export { AvatarSection }
