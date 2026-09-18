import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface DangerZoneSectionProps {
  accountName: string
  onDeleteAccount: () => void
}

export default function DangerZoneSection({
  accountName,
  onDeleteAccount,
}: DangerZoneSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section data-mol-id="danger-zone-section">
      <h3
        className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 4), cm.sp('ml', 2))}
        style={{
          fontSize: '${textSizeToRem($1)}',
          lineHeight: '${textSizeToLineHeight($1)}',
          color: 'var(--md-sys-color-error)',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
        }}
      >
        {t('danger-zone.critical-actions', {}, { defaultValue: 'Critical Actions' })}
      </h3>
      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
          borderRadius: '1.5rem',
          padding: 'calc(8 * 0.25rem)',
          boxShadow: '0 0 0 3px color-mix(in srgb, var(--md-sys-color-error) 10%, transparent)',
        }}
        data-mol-id="danger-zone-card"
      >
        <div
          className={cm.flex({ align: 'center', justify: 'between' })}
          data-mol-id="danger-zone-content"
        >
          <div data-mol-id="danger-zone-text">
            <h4
              className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 1))}
              style={{
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
                color: 'var(--md-sys-color-on-surface)',
              }}
            >
              {t(
                'danger-zone.delete-account-title',
                { accountName },
                { defaultValue: 'Delete {{accountName}} Account' },
              )}
            </h4>
            <p
              style={{
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
                color: 'var(--md-sys-color-on-surface-variant)',
                maxWidth: '28rem',
              }}
            >
              {t(
                'danger-zone.delete-account-description',
                {},
                {
                  defaultValue:
                    'Once you delete your account, there is no going back. All AI models, training data, and integrations will be permanently purged.',
                },
              )}
            </p>
          </div>
          <button
            className={cm.cn(cm.fontWeight('bold'), 'hover:bg-error/5')}
            style={{
              paddingLeft: 'calc(6 * 0.25rem)',
              paddingRight: 'calc(6 * 0.25rem)',
              padding: 'calc(3 * 0.25rem)',
              borderRadius: '0.75rem',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: 'color-mix(in srgb, var(--md-sys-color-error) 20%, transparent)',
              color: 'var(--md-sys-color-error)',
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              transitionProperty: 'all',
              transitionDuration: '150ms',
            }}
            onClick={onDeleteAccount}
            data-mol-id="delete-account-button"
          >
            {t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete Account' })}
          </button>
        </div>
      </div>
    </section>
  )
}

export { DangerZoneSection }
