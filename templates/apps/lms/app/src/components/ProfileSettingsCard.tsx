import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ProfileSettingsCardProps {
  name: string
  setName: (v: string) => void
  email: string
  setEmail: (v: string) => void
  bio: string
  setBio: (v: string) => void
  profileSuccess: boolean
  profileError?: string | null
  /** True while the email field differs from the signed-in address. */
  emailChanged?: boolean
  emailPassword?: string
  setEmailPassword?: (v: string) => void
}

function ProfileSettingsCard({
  name,
  setName,
  email,
  setEmail,
  bio,
  setBio,
  profileSuccess,
  profileError,
  emailChanged = false,
  emailPassword = '',
  setEmailPassword,
}: ProfileSettingsCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ id?: string; email?: string; name?: string }>()
  const avatarSeed = user?.id || user?.email || name || email || 'student'
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'start' }), 'gap-12')}>
        <div className={cm.cn('relative group')} data-mol-id="profile-avatar">
          <div
            className={cm.cn(
              cm.w(20),
              cm.h(20),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'bg-surface-secondary overflow-hidden ring-4 ring-white shadow-sm',
            )}
          >
            <img
              alt={t(
                'profileSettingsCard.avatarAlt',
                { name: name || email },
                { defaultValue: 'Avatar' },
              )}
              className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
              src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(avatarSeed)}`}
            />
          </div>
        </div>
        <div className={cm.cn(cm.flex1, cm.stack(6))}>
          <div className={cm.grid({ cols: 2, gap: 'lg' })}>
            <div className={cm.stack(2)}>
              <label
                htmlFor="profile-name"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 1),
                  'text-[0.75rem] text-foreground-secondary uppercase tracking-wider',
                )}
              >
                {t('profileSettingsCard.fullName', {}, { defaultValue: 'Full Name' })}
              </label>
              <input
                id="profile-name"
                name="name"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('p', 4),
                  'bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface font-body outline-none',
                )}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className={cm.stack(2)}>
              <label
                htmlFor="profile-email"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 1),
                  'text-[0.75rem] text-foreground-secondary uppercase tracking-wider',
                )}
              >
                {t('profileSettingsCard.emailAddress', {}, { defaultValue: 'Email Address' })}
              </label>
              <input
                id="profile-email"
                name="email"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('p', 4),
                  'bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface font-body outline-none',
                )}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          {emailChanged && (
            <div className={cm.stack(2)}>
              <label
                htmlFor="profile-email-password"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 1),
                  'text-[0.75rem] text-foreground-secondary uppercase tracking-wider',
                )}
              >
                {t(
                  'profileSettingsCard.confirmCurrentPassword',
                  {},
                  { defaultValue: 'Current Password (to change email)' },
                )}
              </label>
              <input
                id="profile-email-password"
                name="currentPassword"
                autoComplete="current-password"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('p', 4),
                  'bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface font-body outline-none',
                )}
                placeholder={t(
                  'profileSettingsCard.confirmCurrentPasswordHint',
                  {},
                  { defaultValue: 'Confirm your identity to change your email' },
                )}
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword?.(e.target.value)}
              />
            </div>
          )}
          <div className={cm.stack(2)}>
            <label
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.sp('ml', 1),
                'text-[0.75rem] text-foreground-secondary uppercase tracking-wider',
              )}
            >
              {t('profileSettingsCard.academicBio', {}, { defaultValue: 'Academic Bio' })}
            </label>
            <textarea
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 4),
                'bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface font-body outline-none resize-none',
              )}
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
        </div>
      </div>
      {profileSuccess && (
        <p
          className={cm.cn(
            cm.sp('mt', 4),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-success',
          )}
          role="status"
        >
          {t(
            'profileSettingsCard.updateSuccess',
            {},
            { defaultValue: 'Profile updated successfully.' },
          )}
        </p>
      )}
      {profileError && (
        <p
          className={cm.cn(
            cm.sp('mt', 4),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-error',
          )}
          role="alert"
        >
          {profileError}
        </p>
      )}
    </section>
  )
}

export default ProfileSettingsCard
export { ProfileSettingsCard }
