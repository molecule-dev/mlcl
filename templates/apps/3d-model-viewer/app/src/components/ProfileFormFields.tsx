import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ProfileFormFieldsProps {
  firstName: string
  setFirstName: (v: string) => void
  lastName: string
  setLastName: (v: string) => void
  username: string
  setUsername: (v: string) => void
  bio: string
  setBio: (v: string) => void
  email: string
  setEmail: (v: string) => void
}
function ProfileFormFields({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  username,
  setUsername,
  bio,
  setBio,
  email,
  setEmail,
}: ProfileFormFieldsProps) {
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
          {t('profileForm.firstName', {}, { defaultValue: 'First Name' })}
        </label>
        <input
          data-testid="profile-first-name"
          className={cm.cn(
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'bg-surface-container-lowest text-on-surface border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-lg font-body placeholder-outline transition-all',
          )}
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
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
          {t('profileForm.lastName', {}, { defaultValue: 'Last Name' })}
        </label>
        <input
          data-testid="profile-last-name"
          className={cm.cn(
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'bg-surface-container-lowest text-on-surface border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-lg font-body placeholder-outline transition-all',
          )}
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
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
          {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
        </label>
        <input
          data-testid="profile-email"
          className={cm.cn(
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'bg-surface-container-lowest text-on-surface border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-lg font-body placeholder-outline transition-all',
          )}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
            cm.flex({}),
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
            tessera.io/
          </span>
          <input
            data-testid="profile-username"
            className={cm.cn(
              cm.flex1,
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'bg-transparent border-0 focus:ring-0 text-on-surface font-body',
            )}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
          onChange={(e) => setBio(e.target.value)}
        ></textarea>
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-outline font-body')}>
          {t('profileForm.markdownSupported', {}, { defaultValue: 'Supports basic markdown.' })}
        </p>
      </div>
    </div>
  )
}

export default ProfileFormFields
export { ProfileFormFields }
