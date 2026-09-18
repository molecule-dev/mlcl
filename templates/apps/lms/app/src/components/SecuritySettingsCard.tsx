import React from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SecuritySettingsCardProps {
  currentPassword: string
  setCurrentPassword: (v: string) => void
  newPassword: string
  setNewPassword: (v: string) => void
  confirmPassword: string
  setConfirmPassword: (v: string) => void
  passwordLoading: boolean
  passwordError: string
  passwordSuccess: boolean
  onSubmit: React.FormEventHandler<HTMLFormElement>
}
function SecuritySettingsCard({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordLoading,
  passwordError,
  passwordSuccess,
  onSubmit,
}: SecuritySettingsCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.card(),
        cm.sp('p', 6),
        cm.sp('mt', 8),
        'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10',
      )}
    >
      <div className={cm.maxW('xl')}>
        <h3
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            cm.flex({ align: 'center', gap: 2 }),
            'font-headline',
          )}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textPrimary)} data-icon="lock">
            lock
          </span>
          {t('securitySettingsCard.title', {}, { defaultValue: 'Security & Privacy' })}
        </h3>
        <form className={cm.stack(6)} onSubmit={onSubmit}>
          <div className={cm.stack(2)}>
            <label
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.sp('ml', 1),
                cm.textMuted,
                cm.textSize('xs'),
                'uppercase tracking-wider',
              )}
            >
              {t(
                'settings.changePasswordModal.currentPassword',
                {},
                { defaultValue: 'Current Password' },
              )}
            </label>
            <input
              id="settings-current-password"
              name="currentPassword"
              className={cm.cn(
                cm.input(),
                cm.w('full'),
                cm.sp('p', 4),
                'bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface font-body outline-none',
              )}
              placeholder={t(
                'securitySettingsCard.currentPasswordPlaceholder',
                {},
                { defaultValue: '••••••••••••' },
              )}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className={cm.grid({ cols: 2, gap: 'lg' })}>
            <div className={cm.stack(2)}>
              <label
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 1),
                  cm.textMuted,
                  cm.textSize('xs'),
                  'uppercase tracking-wider',
                )}
              >
                {t(
                  'settings.changePasswordModal.newPassword',
                  {},
                  { defaultValue: 'New Password' },
                )}
              </label>
              <input
                id="settings-new-password"
                name="newPassword"
                className={cm.cn(
                  cm.input(),
                  cm.w('full'),
                  cm.sp('p', 4),
                  'bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface font-body outline-none',
                )}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className={cm.stack(2)}>
              <label
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 1),
                  cm.textMuted,
                  cm.textSize('xs'),
                  'uppercase tracking-wider',
                )}
              >
                {t(
                  'securitySettingsCard.confirmPassword',
                  {},
                  { defaultValue: 'Confirm New Password' },
                )}
              </label>
              <input
                id="settings-confirm-password"
                name="confirmPassword"
                className={cm.cn(
                  cm.input(),
                  cm.w('full'),
                  cm.sp('p', 4),
                  'bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface font-body outline-none',
                )}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          {passwordError && (
            <p className={cm.cn(cm.textSize('xs'), 'text-error')} role="alert">
              {passwordError}
            </p>
          )}
          {passwordSuccess && (
            <p className={cm.cn(cm.textSize('xs'), 'text-success')} role="status">
              {t(
                'securitySettingsCard.successMessage',
                {},
                { defaultValue: 'Password updated successfully.' },
              )}
            </p>
          )}
          <button
            className={cm.cn(
              cm.button(),
              cm.fontWeight('bold'),
              cm.sp('py', 3),
              cm.sp('px', 8),
              cm.textSize('sm'),
              'primary-gradient text-on-primary rounded-xl hover:shadow-lg hover:brightness-110 transition-all font-headline',
            )}
            type="submit"
            disabled={passwordLoading}
          >
            {passwordLoading
              ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
              : t('securitySettingsCard.submit', {}, { defaultValue: 'Update Password' })}
          </button>
        </form>
      </div>
    </section>
  )
}

export default SecuritySettingsCard
export { SecuritySettingsCard }
