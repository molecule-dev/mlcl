import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ProfileIdentitySection({
  name,
  email,
  onNameChange,
  onEmailChange,
}: {
  name: string
  email: string
  onNameChange: (v: string) => void
  onEmailChange: (v: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(cm.sp('p', 8), 'rounded-3xl', 'bg-surface-container-lowest ambient-shadow')}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), cm.sp('mb', 6))}>
        <div
          className={cm.cn(
            cm.w(24),
            cm.h(24),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'bg-surface-container-high font-headline text-success border-4 border-surface overflow-hidden shadow-sm',
          )}
          data-mol-id="profile-avatar"
          aria-label={t('profileIdentitySection.avatarLabel', {}, { defaultValue: 'Avatar' })}
        >
          {name
            ? name
                .split(' ')
                .map((n) => n[0] ?? '')
                .slice(0, 2)
                .join('')
                .toUpperCase()
            : (email[0] ?? '?').toUpperCase()}
        </div>
        <div>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              cm.sp('mb', 6),
              'text-success',
            )}
          >
            {t('profileIdentitySection.title', {}, { defaultValue: 'Profile Identity' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
            {t(
              'profileIdentitySection.subtitle',
              {},
              { defaultValue: 'Update your photo and personal details.' },
            )}
          </p>
        </div>
      </div>
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2')}>
        <div className={cm.stack(2)}>
          <label
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 1),
              'text-[10px] uppercase tracking-widest text-foreground-tertiary',
            )}
          >
            {t('profileIdentitySection.fullNameLabel', {}, { defaultValue: 'Full Name' })}
          </label>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.sp('px', 4),
              cm.fontWeight('medium'),
              'bg-surface-container-low border-none rounded-lg text-on-surface focus:ring-0 focus:border-b-2 focus:border-primary transition-all',
            )}
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <div className={cm.stack(2)}>
          <label
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 1),
              'text-[10px] uppercase tracking-widest text-foreground-tertiary',
            )}
          >
            {t('profileIdentitySection.emailAddressLabel', {}, { defaultValue: 'Email Address' })}
          </label>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.sp('px', 4),
              cm.fontWeight('medium'),
              'bg-surface-container-low border-none rounded-lg text-on-surface focus:ring-0 focus:border-b-2 focus:border-primary transition-all',
            )}
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
          />
        </div>
      </div>
    </section>
  )
}

export default ProfileIdentitySection
export { ProfileIdentitySection }
