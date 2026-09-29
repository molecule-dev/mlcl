import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface SettingsPageHeaderProps {
  onSave: () => void
  onDiscard: () => void
  saving: boolean
  savedAt: number | null
}
function SettingsPageHeader({ onSave, onDiscard, saving, savedAt }: SettingsPageHeaderProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 12),
        cm.sp('mb', 8),
        'glass-header rounded-xl shadow-lg border border-surface/40',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between', gap: 6 }),
          'md:flex-row md:items-end',
        )}
      >
        <div>
          <nav
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.textPrimary,
              cm.sp('mb', 4),
              'uppercase tracking-widest',
            )}
          >
            <Link to="/">
              {t('common.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </Link>
            <span className={cm.cn('material-symbols-outlined text-[12px]')}>chevron_right</span>
            <span>{t('settingsPageHeader.title', {}, { defaultValue: 'Account Settings' })}</span>
          </nav>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-black tracking-tight text-foreground')}
            data-mol-id="page-title"
          >
            {t('settingsPageHeader.title', {}, { defaultValue: 'Account Settings' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.maxW('lg'), 'text-foreground-secondary')}>
            {t(
              'settingsPageHeader.description',
              {},
              {
                defaultValue:
                  'Manage your personal information, security preferences, and delivery addresses all in one place.',
              },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          <button
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'bg-surface text-foreground rounded-md border border-border shadow-sm hover:bg-surface-secondary transition-all',
            )}
            data-mol-id="discard-changes"
            onClick={onDiscard}
            disabled={saving}
          >
            {t('common.discard', {}, { defaultValue: 'Discard' })}
          </button>
          {savedAt && (
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.sp('ml', 2),
                'text-success',
              )}
            >
              {t('common.saved', {}, { defaultValue: 'Saved' })}
            </span>
          )}
          <button
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover transition-all',
            )}
            data-mol-id="save-settings"
            onClick={onSave}
            disabled={saving}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveChanges', {}, { defaultValue: 'Save Changes' })}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPageHeader
export { SettingsPageHeader }
