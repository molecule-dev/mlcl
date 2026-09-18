import { useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface BotSettingsGeneralSectionProps {
  name: string
  setName: (v: string) => void
  description: string
  setDescription: (v: string) => void
  active: boolean
  setActive: (v: boolean) => void
  avatarDataUrl?: string
  onAvatarChange?: (dataUrl: string) => void
}
function BotSettingsGeneralSection({
  name,
  setName,
  description,
  setDescription,
  active,
  setActive,
  avatarDataUrl,
  onAvatarChange,
}: BotSettingsGeneralSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  function handleAvatarChosen(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : ''
      if (url) onAvatarChange?.(url)
    }
    reader.readAsDataURL(file)
  }
  return (
    <section className={cm.stack(6)}>
      <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
        <h3
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'font-headline tracking-tight',
          )}
        >
          {t('botSettingsGeneralSection.title', {}, { defaultValue: 'General' })}
        </h3>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
          >
            {t('botSettingsGeneralSection.activeStatus', {}, { defaultValue: 'Active Status' })}
          </span>
          <button
            type="button"
            onClick={() => setActive(!active)}
            aria-pressed={active}
            className={cm.cn(
              cm.w(12),
              cm.h(6),
              cm.roundedFull,
              cm.cursorPointer,
              active ? 'bg-tertiary' : 'bg-surface-container-highest',
              'relative transition-colors',
            )}
          >
            <div
              className={cm.cn(
                cm.w(4),
                cm.h(4),
                cm.roundedFull,
                'absolute top-1 bg-surface transition-all',
                active ? 'right-1' : 'left-1',
              )}
            ></div>
          </button>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.sp('p', 8),
          cm.stack(10),
          'bg-surface-container-lowest rounded-3xl ambient-shadow',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-10')}>
          <div className={cm.cn('relative group')}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-24 h-24 rounded-full bg-surface-container-high overflow-hidden border-4 border-surface-container-lowest',
              )}
            >
              {avatarDataUrl ? (
                <img
                  src={avatarDataUrl}
                  alt={t(
                    'botSettingsGeneralSection.currentAvatarAlt',
                    {},
                    { defaultValue: 'Bot avatar preview' },
                  )}
                  className={cm.cn('w-full h-full object-cover')}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined text-primary')}
                  style={{ fontSize: '3rem', fontVariationSettings: "'FILL' 1" }}
                >
                  smart_toy
                </span>
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              data-mol-id="bot-avatar-input"
              className={cm.cn('hidden')}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleAvatarChosen(file)
              }}
            />
            <button
              type="button"
              data-mol-id="bot-avatar-upload"
              onClick={() => avatarInputRef.current?.click()}
              aria-label={t(
                'botSettingsGeneralSection.uploadAvatar',
                {},
                { defaultValue: 'Upload bot avatar' },
              )}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full text-white border-2 border-surface-container-lowest',
              )}
            >
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                photo_camera
              </span>
            </button>
          </div>
          <div className={cm.cn(cm.flex1, cm.stack(4))}>
            <div className={cm.cn('space-y-1.5')}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wider text-on-surface-variant',
                )}
              >
                {t('botSettingsGeneralSection.botNameLabel', {}, { defaultValue: 'Bot Name' })}
              </label>
              <input
                className={cm.cn(
                  cm.w('full'),
                  cm.fontWeight('medium'),
                  'bg-surface-container-high border-none rounded-2xl px-5 py-3.5 text-on-surface focus:ring-2 focus:ring-surface-tint/15 transition-shadow',
                )}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className={cm.cn('space-y-1.5')}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wider text-on-surface-variant',
                )}
              >
                {t('form.description', {}, { defaultValue: 'Description' })}
              </label>
              <input
                className={cm.cn(
                  cm.w('full'),
                  cm.fontWeight('medium'),
                  'bg-surface-container-high border-none rounded-2xl px-5 py-3.5 text-on-surface focus:ring-2 focus:ring-surface-tint/15 transition-shadow',
                )}
                placeholder={t(
                  'botSettingsGeneralSection.descriptionPlaceholder',
                  {},
                  { defaultValue: 'Explain the primary goal of this bot...' },
                )}
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BotSettingsGeneralSection
export { BotSettingsGeneralSection }
