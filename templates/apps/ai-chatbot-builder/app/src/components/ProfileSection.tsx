import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface ProfileSectionProps {
  avatarUrl: string
  fullName: string
  email: string
  emailVerified: boolean
  organization: string
  timezone: string
  language: string
  onChange: (field: string, value: string) => void
}

export default function ProfileSection({
  avatarUrl,
  fullName,
  email,
  emailVerified,
  organization,
  timezone,
  language,
  onChange,
}: ProfileSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section data-mol-id="profile-section">
      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
          borderRadius: '1.5rem',
          padding: 'calc(8 * 0.25rem)',
          boxShadow: 'var(--shadow-topbar)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className={cm.flex({ align: 'start' })} style={{ gap: 'calc(12 * 0.25rem)' }}>
          <div
            className={cm.cursorPointer}
            style={{ position: 'relative' }}
            data-mol-id="avatar-upload"
          >
            <img
              className={cm.cn(cm.roundedFull, 'group-hover:ring-primary/20')}
              style={{
                width: '32rem-scaled',
                height: 'calc(32 * 0.25rem)',
                objectFit: 'cover',
                boxShadow:
                  '0 0 0 var(--ring-width, 2px) var(--md-sys-color-surface-container-high)',
                transitionProperty: 'all',
                transitionDuration: '150ms',
              }}
              src={avatarUrl}
              alt={t('profile-section.avatar-alt', {}, { defaultValue: 'Profile avatar' })}
            />
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.roundedFull,
                'group-hover:opacity-100',
              )}
              style={{
                position: 'absolute',
                inset: 'calc(0 * 0.25rem)',
                backgroundColor:
                  'color-mix(in srgb, var(--md-sys-color-on-surface) 40%, transparent)',
                opacity: 'calc(0 / 100)',
                transitionProperty: 'all',
                transitionDuration: '150ms',
              }}
            >
              <span
                style={{ fontFamily: 'Material Symbols outlined', color: 'var(--color-on-error)' }}
              >
                photo_camera
              </span>
            </div>
            <div
              className={cm.roundedFull}
              style={{
                position: 'absolute',
                bottom: 'calc(-1 * 0.25rem)',
                right: 'calc(-1 * 0.25rem)',
                backgroundColor: 'var(--color-on-error)',
                padding: 'calc(2 * 0.25rem)',
                boxShadow: 'var(--tw-shadow-md, revert)',
                color: 'var(--md-sys-color-primary)',
              }}
            >
              <span
                style={{
                  fontFamily: 'Material Symbols outlined',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                }}
              >
                edit
              </span>
            </div>
          </div>
          <div
            className={cm.cn(cm.grid({ cols: 2 }), cm.flex1)}
            style={{ columnGap: 'calc(8 * 0.25rem)', rowGap: 'calc(6 * 0.25rem)' }}
            data-mol-id="profile-form"
          >
            <div style={{ gridColumn: 'span 1 / span 1' }} data-mol-id="full-name-field">
              <label
                className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 2), cm.sp('ml', 1))}
                style={{
                  display: 'block',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  color: 'var(--md-sys-color-on-surface-variant)',
                  textTransform: 'uppercase',
                  letterSpacing: 'widest',
                }}
              >
                {t('profile-section.full-name-label', {}, { defaultValue: 'Full Name' })}
              </label>
              <input
                className={cm.cn(cm.fontWeight('medium'), 'focus:ring-2 focus:ring-primary/15')}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--md-sys-color-surface-container-high)',
                  borderColor: 'var(--md-sys-color-none)',
                  borderRadius: '0.75rem',
                  paddingLeft: 'calc(5 * 0.25rem)',
                  paddingRight: 'calc(5 * 0.25rem)',
                  padding: 'calc(3 * 0.25rem)',
                  color: 'var(--md-sys-color-on-surface)',
                  transitionProperty: 'all',
                  transitionDuration: '150ms',
                }}
                type="text"
                value={fullName}
                onChange={(e) => onChange('fullName', e.target.value)}
              />
            </div>
            <div style={{ gridColumn: 'span 1 / span 1' }} data-mol-id="email-field">
              <label
                className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 2), cm.sp('ml', 1))}
                style={{
                  display: 'block',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  color: 'var(--md-sys-color-on-surface-variant)',
                  textTransform: 'uppercase',
                  letterSpacing: 'widest',
                }}
              >
                {t('profile-section.email-address-label', {}, { defaultValue: 'Email Address' })}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className={cm.cn(cm.fontWeight('medium'), 'focus:ring-2 focus:ring-primary/15')}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--md-sys-color-surface-container-high)',
                    borderColor: 'var(--md-sys-color-none)',
                    borderRadius: '0.75rem',
                    paddingLeft: 'calc(5 * 0.25rem)',
                    paddingRight: 'calc(5 * 0.25rem)',
                    padding: 'calc(3 * 0.25rem)',
                    color: 'var(--md-sys-color-on-surface)',
                    transitionProperty: 'all',
                    transitionDuration: '150ms',
                  }}
                  type="email"
                  value={email}
                  onChange={(e) => onChange('email', e.target.value)}
                />
                {emailVerified && (
                  <div
                    className={cm.cn(cm.flex({ align: 'center' }), cm.roundedFull)}
                    style={{
                      position: 'absolute',
                      inset: 'calc(4 * 0.25rem)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      gap: '1.5',
                      paddingLeft: 'calc(2.5 * 0.25rem)',
                      paddingRight: 'calc(2.5 * 0.25rem)',
                      padding: 'calc(1 * 0.25rem)',
                      backgroundColor:
                        'color-mix(in srgb, var(--md-sys-color-tertiary) 10%, transparent)',
                      color: 'var(--md-sys-color-tertiary)',
                    }}
                    data-mol-id="email-verified-badge"
                  >
                    <span
                      style={{
                        fontFamily: 'Material Symbols outlined',
                        fontSize: '14px',
                        fontVariationSettings: "'FILL' 1",
                      }}
                    >
                      verified
                    </span>
                    <span
                      className={cm.fontWeight('bold')}
                      style={{
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: "${1 === 'tighter' ? '-0.05em' : '-0.025em'}",
                      }}
                    >
                      {t('profile-section.verified', {}, { defaultValue: 'Verified' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ gridColumn: 'span 2 / span 2' }} data-mol-id="organization-field">
              <label
                className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 2), cm.sp('ml', 1))}
                style={{
                  display: 'block',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  color: 'var(--md-sys-color-on-surface-variant)',
                  textTransform: 'uppercase',
                  letterSpacing: 'widest',
                }}
              >
                {t('form.organization', {}, { defaultValue: 'Organization' })}
              </label>
              <input
                className={cm.cn(cm.fontWeight('medium'), 'focus:ring-2 focus:ring-primary/15')}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--md-sys-color-surface-container-high)',
                  borderColor: 'var(--md-sys-color-none)',
                  borderRadius: '0.75rem',
                  paddingLeft: 'calc(5 * 0.25rem)',
                  paddingRight: 'calc(5 * 0.25rem)',
                  padding: 'calc(3 * 0.25rem)',
                  color: 'var(--md-sys-color-on-surface)',
                  transitionProperty: 'all',
                  transitionDuration: '150ms',
                }}
                type="text"
                value={organization}
                onChange={(e) => onChange('organization', e.target.value)}
              />
            </div>
            <div style={{ gridColumn: 'span 1 / span 1' }} data-mol-id="timezone-field">
              <label
                className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 2), cm.sp('ml', 1))}
                style={{
                  display: 'block',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  color: 'var(--md-sys-color-on-surface-variant)',
                  textTransform: 'uppercase',
                  letterSpacing: 'widest',
                }}
              >
                {t('form.timezone', {}, { defaultValue: 'Timezone' })}
              </label>
              <select
                className={cm.cn(cm.fontWeight('medium'), 'focus:ring-2 focus:ring-primary/15')}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--md-sys-color-surface-container-high)',
                  borderColor: 'var(--md-sys-color-none)',
                  borderRadius: '0.75rem',
                  paddingLeft: 'calc(5 * 0.25rem)',
                  paddingRight: 'calc(5 * 0.25rem)',
                  padding: 'calc(3 * 0.25rem)',
                  color: 'var(--md-sys-color-on-surface)',
                  transitionProperty: 'all',
                  transitionDuration: '150ms',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                }}
                value={timezone}
                onChange={(e) => onChange('timezone', e.target.value)}
              >
                <option value="Pacific Time (PT) - UTC-8">
                  {t(
                    'profile-section.timezone-pt',
                    {},
                    { defaultValue: 'Pacific Time (PT) - UTC-8' },
                  )}
                </option>
                <option value="Eastern Time (ET) - UTC-5">
                  {t(
                    'profile-section.timezone-et',
                    {},
                    { defaultValue: 'Eastern Time (ET) - UTC-5' },
                  )}
                </option>
                <option value="UTC +0:00">
                  {t('profile-section.timezone-utc', {}, { defaultValue: 'UTC +0:00' })}
                </option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 1 / span 1' }} data-mol-id="language-field">
              <label
                className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 2), cm.sp('ml', 1))}
                style={{
                  display: 'block',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  color: 'var(--md-sys-color-on-surface-variant)',
                  textTransform: 'uppercase',
                  letterSpacing: 'widest',
                }}
              >
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </label>
              <select
                className={cm.cn(cm.fontWeight('medium'), 'focus:ring-2 focus:ring-primary/15')}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--md-sys-color-surface-container-high)',
                  borderColor: 'var(--md-sys-color-none)',
                  borderRadius: '0.75rem',
                  paddingLeft: 'calc(5 * 0.25rem)',
                  paddingRight: 'calc(5 * 0.25rem)',
                  padding: 'calc(3 * 0.25rem)',
                  color: 'var(--md-sys-color-on-surface)',
                  transitionProperty: 'all',
                  transitionDuration: '150ms',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                }}
                value={language}
                onChange={(e) => onChange('language', e.target.value)}
              >
                <option value="English (US)">
                  {t('profile-section.language-en-us', {}, { defaultValue: 'English (US)' })}
                </option>
                <option value="Spanish (LatAm)">
                  {t('profile-section.language-es-latam', {}, { defaultValue: 'Spanish (LatAm)' })}
                </option>
                <option value="French (FR)">
                  {t('profile-section.language-fr', {}, { defaultValue: 'French (FR)' })}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export { ProfileSection }
