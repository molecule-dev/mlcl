import { useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
export default function ConnectedIntegrationCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const __navigate = useNavigate()
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      await logout()
    } finally {
      __navigate('/login')
    }
  }
  return (
    <article
      className={cm.cn(
        cm.sp('p', 6),
        'group bg-surface-container-lowest rounded-[1.5rem] transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 relative',
      )}
      data-mol-id="card-slack"
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.roundedFull,
          cm.fontWeight('bold'),
          'absolute top-4 right-4 gap-1.5 px-2.5 py-1 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] tracking-wider uppercase',
        )}
      >
        <span className={cm.cn(cm.roundedFull, 'w-1.5 h-1.5 bg-tertiary animate-pulse')}></span>

        {t('status.connected', {}, { defaultValue: 'Connected' })}
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mb', 5),
          'w-14 h-14 rounded-2xl bg-surface-container-high group-hover:scale-110 transition-transform',
        )}
      >
        <span className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-[#E01E5A]')}>
          tag
        </span>
      </div>
      <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {t('connectedIntegrationCard.serviceName', {}, { defaultValue: 'Slack' })}
      </h4>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.sp('mb', 6),
          'text-on-surface-variant leading-relaxed',
        )}
      >
        {t(
          'connectedIntegrationCard.description',
          {},
          {
            defaultValue:
              'Send real-time bot notifications and manage conversations directly in channels.',
          },
        )}
      </p>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('pt', 4),
          'border-t border-outline-variant/10',
        )}
      >
        <button
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.textPrimary,
            'hover:underline transition-all',
          )}
          onClick={() => __navigate('/settings/integrations/slack')}
        >
          {t('connectedIntegrationCard.configure', {}, { defaultValue: 'Configure' })}
        </button>
        <button
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-error hover:text-error/80 transition-colors',
          )}
          onClick={handleLogout}
        >
          {t('common.disconnect', {}, { defaultValue: 'Disconnect' })}
        </button>
      </div>
    </article>
  )
}
export { ConnectedIntegrationCard }
