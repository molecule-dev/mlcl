import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SettingsPasswordCardProps {
  currentPassword: string
  setCurrentPassword: (v: string) => void
  newPassword: string
  setNewPassword: (v: string) => void
  onSave: () => void
  saving: boolean
  error: string | null
}
function SettingsPasswordCard({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  onSave,
  saving,
  error,
}: SettingsPasswordCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  return (
    <section
      className={cm.cn(cm.sp('p', 6), cm.stack(6), 'bg-surface rounded-xl shadow-sm')}
      data-mol-id="section-password"
      id="security"
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 2))}>
        <span className={cm.cn('material-symbols-outlined text-success')}>lock</span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('settingsPasswordCard.title', {}, { defaultValue: 'Security & Password' })}
        </h2>
      </div>
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
        <div className={cm.stack(2)}>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'block text-foreground-secondary uppercase tracking-wider mb-1.5',
            )}
          >
            {t(
              'settings.changePasswordModal.currentPassword',
              {},
              { defaultValue: 'Current Password' },
            )}
          </label>
          <div className={cm.cn('relative')}>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 3),
                cm.textSize('sm'),
                'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500',
              )}
              data-mol-id="input-current-password"
              type={showPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <button
              className={cm.cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-foreground-tertiary hover:text-primary transition-colors',
              )}
              type="button"
              onClick={() => setShowPassword((v) => !v)}
            >
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>
        <div className={cm.stack(2)}>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'block text-foreground-secondary uppercase tracking-wider mb-1.5',
            )}
          >
            {t('settings.changePasswordModal.newPassword', {}, { defaultValue: 'New Password' })}
          </label>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('p', 3),
              cm.textSize('sm'),
              'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500',
            )}
            data-mol-id="input-new-password"
            placeholder={t(
              'settingsPasswordCard.minLengthHint',
              { minLength: 8 },
              { defaultValue: 'Min. {{minLength}} characters' },
            )}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
      </div>
      {error && (
        <p className={cm.cn(cm.textSize('xs'), 'text-error')} role="alert">
          {error}
        </p>
      )}
      <div className={cm.cn(cm.flex({ justify: 'end' }))}>
        <button
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover transition-all',
          )}
          data-mol-id="save-password"
          onClick={onSave}
          disabled={saving}
        >
          {saving
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('settingsPasswordCard.updatePassword', {}, { defaultValue: 'Update Password' })}
        </button>
      </div>
    </section>
  )
}

export default SettingsPasswordCard
export { SettingsPasswordCard }
