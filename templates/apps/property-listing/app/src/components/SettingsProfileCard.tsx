import { useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SettingsProfileCardProps {
  firstName: string
  onFirstNameChange: (v: string) => void
  lastName: string
  onLastNameChange: (v: string) => void
  email: string
  onEmailChange: (v: string) => void
  phone: string
  onPhoneChange: (v: string) => void
  bio: string
  onBioChange: (v: string) => void
}
function SettingsProfileCard({
  firstName,
  onFirstNameChange,
  lastName,
  onLastNameChange,
  email,
  onEmailChange,
  phone,
  onPhoneChange,
  bio,
  onBioChange,
}: SettingsProfileCardProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const photoInputRef = useRef<HTMLInputElement>(null)
  return (
    <div
      className={cm.cn(
        'bg-surface-container-lowest rounded-xl shadow-sm border border-border',
        cm.sp('p', 6),
      )}
      data-mol-id="settings_profile_card"
    >
      <h3
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          'text-success',
          cm.sp('mb', 6),
          cm.flex({ align: 'center', gap: 'md' }),
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-primary-container')}>person</span>

        {t('settingsProfileCard.title', {}, { defaultValue: 'Profile Information' })}
      </h3>
      <div
        className={cm.cn(cm.flex({ direction: 'col', align: 'start', gap: 'xl' }), 'md:flex-row')}
      >
        <div className={cm.cn('relative group')}>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className={cm.cn('sr-only')}
            aria-hidden
            tabIndex={-1}
            onChange={() => {
              /* demo: selection only; upload when API exists */
            }}
          />
          <div
            className={cm.cn(
              cm.w(32),
              cm.h(32),
              cm.roundedFull,
              'overflow-hidden bg-surface-container-highest',
              cm.flex({ align: 'center', justify: 'center' }),
              'border-4 border-surface-container',
            )}
          >
            <img
              alt={t('settingsProfileCard.avatarAlt', {}, { defaultValue: 'Avatar Placeholder' })}
              className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
              data-alt="Professional studio headshot of an agent, warm natural lighting, minimalist high-end aesthetic"
              src="https://picsum.photos/seed/SettingsProfileCard-1/1200/800"
            />
          </div>
          <button
            type="button"
            aria-label={t(
              'settingsProfileCard.changePhoto',
              {},
              { defaultValue: 'Change profile photo' },
            )}
            className={cm.cn(
              'absolute bottom-0 right-0 bg-primary text-on-primary',
              cm.sp('p', 2),
              cm.roundedFull,
              'shadow-lg hover:scale-105 transition-transform',
            )}
            onClick={() => photoInputRef.current?.click()}
          >
            <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>
              photo_camera
            </span>
          </button>
        </div>
        <div className={cm.cn(cm.flex1, cm.grid({ cols: 2, gap: 'lg' }), cm.w('full'))}>
          <div className={cm.cn('col-span-1')}>
            <label
              className={cm.cn(
                'block',
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-outline',
                cm.sp('mb', 2),
                cm.sp('ml', 4),
              )}
            >
              {t('common.firstName', {}, { defaultValue: 'First Name' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                'bg-surface-container-lowest ghost-border rounded-xl',
                cm.sp('px', 6),
                cm.sp('py', 4),
                'focus:ring-2 focus:ring-surface-tint focus:outline-none transition-all',
              )}
              type="text"
              value={firstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
            />
          </div>
          <div className={cm.cn('col-span-1')}>
            <label
              className={cm.cn(
                'block',
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-outline',
                cm.sp('mb', 2),
                cm.sp('ml', 4),
              )}
            >
              {t('common.lastName', {}, { defaultValue: 'Last Name' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                'bg-surface-container-lowest ghost-border rounded-xl',
                cm.sp('px', 6),
                cm.sp('py', 4),
                'focus:ring-2 focus:ring-surface-tint focus:outline-none transition-all',
              )}
              type="text"
              value={lastName}
              onChange={(e) => onLastNameChange(e.target.value)}
            />
          </div>
          <div className={cm.cn('col-span-2')}>
            <label
              className={cm.cn(
                'block',
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-outline',
                cm.sp('mb', 2),
                cm.sp('ml', 4),
              )}
            >
              {t('common.emailAddress', {}, { defaultValue: 'Email Address' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                'bg-surface-container-lowest ghost-border rounded-xl',
                cm.sp('px', 6),
                cm.sp('py', 4),
                'focus:ring-2 focus:ring-surface-tint focus:outline-none transition-all',
              )}
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
          </div>
          <div className={cm.cn('col-span-2')}>
            <label
              className={cm.cn(
                'block',
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-outline',
                cm.sp('mb', 2),
                cm.sp('ml', 4),
              )}
            >
              {t('common.phoneNumber', {}, { defaultValue: 'Phone Number' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                'bg-surface-container-lowest ghost-border rounded-xl',
                cm.sp('px', 6),
                cm.sp('py', 4),
                'focus:ring-2 focus:ring-surface-tint focus:outline-none transition-all',
              )}
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
            />
          </div>
          <div className={cm.cn('col-span-2')}>
            <label
              className={cm.cn(
                'block',
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-outline',
                cm.sp('mb', 2),
                cm.sp('ml', 4),
              )}
            >
              {t('settingsProfileCard.bioLabel', {}, { defaultValue: 'Professional Bio' })}
            </label>
            <textarea
              className={cm.cn(
                cm.w('full'),
                'bg-surface-container-lowest ghost-border rounded-xl',
                cm.sp('px', 6),
                cm.sp('py', 4),
                'focus:ring-2 focus:ring-surface-tint focus:outline-none transition-all resize-none',
              )}
              rows={4}
              value={bio}
              onChange={(e) => onBioChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsProfileCard
export { SettingsProfileCard }
