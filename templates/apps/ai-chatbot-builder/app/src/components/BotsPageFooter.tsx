import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface BotsPageFooterProps {
  systemOperational: boolean
  cloudSyncActive: boolean
}

export default function BotsPageFooter({
  systemOperational,
  cloudSyncActive,
}: BotsPageFooterProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <footer
      className={cm.flex({ align: 'center', justify: 'between' })}
      style={{
        marginTop: 'auto',
        padding: 'calc(6 * 0.25rem)',
        backgroundColor:
          'color-mix(in srgb, var(--md-sys-color-surface-container-low) 50%, transparent)',
        borderTopWidth: '1px',
        borderColor: 'var(--color-panel-border-faint)',
      }}
      data-mol-id="bots-page-footer"
    >
      <div
        className={cm.flex({ align: 'center' })}
        style={{ gap: 'calc(6 * 0.25rem)' }}
        data-mol-id="footer-status-group"
      >
        <div
          className={cm.flex({ align: 'center' })}
          style={{ gap: 'calc(2 * 0.25rem)' }}
          data-mol-id="system-status"
        >
          <span
            className={`w-2 h-2 rounded-full ${systemOperational ? 'bg-tertiary' : 'bg-error'}`}
          ></span>
          <span
            className={cm.fontWeight('medium')}
            style={{
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              color: 'var(--md-sys-color-on-surface-variant)',
            }}
          >
            {systemOperational
              ? t(
                  'bots-page-footer.system-status-operational',
                  {},
                  { defaultValue: 'System Status: All systems operational' },
                )
              : t(
                  'bots-page-footer.system-status-degraded',
                  {},
                  { defaultValue: 'System Status: Degraded' },
                )}
          </span>
        </div>
        <div
          className={cm.flex({ align: 'center' })}
          style={{ gap: 'calc(2 * 0.25rem)' }}
          data-mol-id="cloud-sync-status"
        >
          <span
            style={{
              fontFamily: 'Material Symbols outlined',
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              color: 'var(--md-sys-color-on-surface-variant)',
            }}
          >
            {cloudSyncActive ? 'cloud_done' : 'cloud_off'}
          </span>
          <span
            className={cm.fontWeight('medium')}
            style={{
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              color: 'var(--md-sys-color-on-surface-variant)',
            }}
          >
            {cloudSyncActive
              ? t('bots-page-footer.cloud-sync-active', {}, { defaultValue: 'Cloud Sync Active' })
              : t(
                  'bots-page-footer.cloud-sync-inactive',
                  {},
                  { defaultValue: 'Cloud Sync Inactive' },
                )}
          </span>
        </div>
      </div>
      <div
        className={cm.cn(cm.flex(), cm.fontWeight('bold'))}
        style={{
          gap: 'calc(4 * 0.25rem)',
          fontSize: '${textSizeToRem($1)}',
          lineHeight: '${textSizeToLineHeight($1)}',
          color: 'var(--md-sys-color-outline-variant)',
          textTransform: 'uppercase',
          letterSpacing: 'widest',
        }}
        data-mol-id="footer-links"
      >
        <span
          className={'hover:text-primary'}
          style={{
            transitionProperty:
              'color, background-color, border-color, text-decoration-color, fill, stroke',
            transitionDuration: '150ms',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          data-mol-id="footer-link-documentation"
        >
          {t('bots-page-footer.documentation', {}, { defaultValue: 'Documentation' })}
        </span>
        <a
          className={'hover:text-primary'}
          style={{
            transitionProperty:
              'color, background-color, border-color, text-decoration-color, fill, stroke',
            transitionDuration: '150ms',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          href="/settings"
          data-mol-id="footer-link-api-keys"
        >
          {t('bots-page-footer.api-keys', {}, { defaultValue: 'API Keys' })}
        </a>
        <a
          className={'hover:text-primary'}
          style={{
            transitionProperty:
              'color, background-color, border-color, text-decoration-color, fill, stroke',
            transitionDuration: '150ms',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          href="/help"
          data-mol-id="footer-link-support"
        >
          {t('bots-page-footer.support', {}, { defaultValue: 'Support' })}
        </a>
        <a
          className={'hover:text-primary'}
          style={{
            transitionProperty:
              'color, background-color, border-color, text-decoration-color, fill, stroke',
            transitionDuration: '150ms',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          href="/about"
          data-mol-id="footer-link-about"
        >
          {t('nav.about', {}, { defaultValue: 'About' })}
        </a>
      </div>
    </footer>
  )
}

export { BotsPageFooter }
