import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SettingsProfileFormGridProps {
  firstName: string
  onFirstNameChange: (v: string) => void
  lastName: string
  onLastNameChange: (v: string) => void
  email: string
  username: string
  onUsernameChange: (v: string) => void
  bio: string
  onBioChange: (v: string) => void
}
function SettingsProfileFormGrid({
  firstName,
  onFirstNameChange,
  lastName,
  onLastNameChange,
  email,
  username,
  onUsernameChange,
  bio,
  onBioChange,
}: SettingsProfileFormGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.grid({ cols: 2 }), cm.sp('mb', 12), 'gap-x-6 gap-y-8')}>
      <div className="col-span-1">
        <label
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('mb', 2),
            'block text-on-surface font-body',
          )}
        >
          {t('settingsProfile.firstNameLabel', {}, { defaultValue: 'First Name' })}
        </label>
        <input
          className={cm.cn(
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'bg-surface-container-lowest text-on-surface border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-lg font-body placeholder-outline transition-all',
          )}
          type="text"
          value={firstName}
          onChange={(e) => onFirstNameChange(e.target.value)}
        />
      </div>
      <div className="col-span-1">
        <label
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('mb', 2),
            'block text-on-surface font-body',
          )}
        >
          {t('settingsProfile.lastNameLabel', {}, { defaultValue: 'Last Name' })}
        </label>
        <input
          className={cm.cn(
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'bg-surface-container-lowest text-on-surface border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-lg font-body placeholder-outline transition-all',
          )}
          type="text"
          value={lastName}
          onChange={(e) => onLastNameChange(e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <label
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('mb', 2),
            'block text-on-surface-variant font-body',
          )}
        >
          {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('normal'),
              cm.sp('ml', 2),
              'text-outline',
            )}
          >
            {t('settingsProfile.emailReadOnly', {}, { defaultValue: '(Cannot be changed)' })}
          </span>
        </label>
        <input
          className={cm.cn(
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'bg-surface-container-lowest/50 text-outline border-0 rounded-lg font-body cursor-not-allowed opacity-70',
          )}
          disabled={true}
          type="email"
          value={email}
        />
      </div>
      <div className="col-span-2">
        <label
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('mb', 2),
            'block text-on-surface font-body',
          )}
        >
          {t('auth.username', {}, { defaultValue: 'Username' })}
        </label>
        <div
          className={cm.cn(
            cm.flex(),
            'rounded-lg overflow-hidden bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/50 transition-all',
          )}
        >
          <span
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'text-outline border-r border-outline-variant/15 bg-surface-container-low font-body',
            )}
          >
            {t('settingsProfile.usernamePrefix', {}, { defaultValue: 'tessera.io/' })}
          </span>
          <input
            className={cm.cn(
              cm.flex1,
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'bg-transparent border-0 focus:ring-0 text-on-surface font-body',
            )}
            type="text"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
          />
        </div>
      </div>
      <div className="col-span-2">
        <label
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('mb', 2),
            'block text-on-surface font-body',
          )}
        >
          {t('form.bio', {}, { defaultValue: 'Bio' })}
        </label>
        <textarea
          className={cm.cn(
            cm.w('full'),
            cm.h('[160px]'),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'bg-surface-container-lowest text-on-surface border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-lg font-body resize-none transition-all placeholder-outline',
          )}
          value={bio}
          onChange={(e) => onBioChange(e.target.value)}
        ></textarea>
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-outline font-body')}>
          {t('settingsProfile.markdownHint', {}, { defaultValue: 'Supports basic markdown.' })}
        </p>
      </div>
    </div>
  )
}

export default SettingsProfileFormGrid
export { SettingsProfileFormGrid }
