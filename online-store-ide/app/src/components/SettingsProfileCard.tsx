import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { avatarUrl } from '../utils/avatar.js'

interface SettingsProfileCardProps {
  name: string
  setName: (v: string) => void
  email: string
  setEmail: (v: string) => void
  phone: string
  setPhone: (v: string) => void
  location: string
  setLocation: (v: string) => void
}
function SettingsProfileCard({
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  location,
  setLocation,
}: SettingsProfileCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(cm.sp('p', 6), cm.stack(6), 'bg-surface rounded-xl shadow-sm')}
      data-mol-id="section-profile"
      id="profile"
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 2))}>
        <span className={cm.cn('material-symbols-outlined text-success')}>person</span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('settingsProfileCard.sectionTitle', {}, { defaultValue: 'Personal Information' })}
        </h2>
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 10 }), 'md:flex-row')}>
        <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 4 }))}>
          <div className={cm.cn('relative group')}>
            <div
              className={cm.cn(
                cm.w(32),
                cm.h(32),
                cm.roundedFull,
                'overflow-hidden border-4 border-surface-secondary shadow-inner',
              )}
            >
              <img
                alt={t('settingsProfileCard.avatarAlt', {}, { defaultValue: 'Profile avatar' })}
                className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                src={avatarUrl(name || email)}
              />
            </div>
          </div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-foreground-secondary uppercase tracking-wider',
            )}
          >
            {t('settingsProfileCard.avatarHint', {}, { defaultValue: 'Avatar (JPG/PNG)' })}
          </p>
        </div>
        <div className={cm.cn(cm.flex1, cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
          <div>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'block text-foreground-secondary uppercase tracking-wider mb-1.5',
              )}
            >
              {t('settingsProfileCard.fullNameLabel', {}, { defaultValue: 'Full Name' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 3),
                cm.textSize('sm'),
                'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500',
              )}
              data-mol-id="input-full-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'block text-foreground-secondary uppercase tracking-wider mb-1.5',
              )}
            >
              {t('settingsProfileCard.emailLabel', {}, { defaultValue: 'Email Address' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 3),
                cm.textSize('sm'),
                'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500',
              )}
              data-mol-id="input-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'block text-foreground-secondary uppercase tracking-wider mb-1.5',
              )}
            >
              {t('settingsProfileCard.phoneLabel', {}, { defaultValue: 'Phone Number' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 3),
                cm.textSize('sm'),
                'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500',
              )}
              data-mol-id="input-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'block text-foreground-secondary uppercase tracking-wider mb-1.5',
              )}
            >
              {t('form.location', {}, { defaultValue: 'Location' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 3),
                cm.textSize('sm'),
                'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500',
              )}
              data-mol-id="input-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default SettingsProfileCard
export { SettingsProfileCard }
