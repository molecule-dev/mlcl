import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Contextual support FAB on the knowledge base. The original baseline
 * toggled a local `open` flag that rendered nothing — now it routes to
 * the new-ticket form ("still need help? contact support").
 */
function FloatingHelpButton() {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <button
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.w(14),
        cm.h(14),
        cm.roundedFull,
        'fixed bottom-8 right-8 bg-on-background text-background shadow-2xl transition-transform hover:scale-110 active:scale-95 z-50',
      )}
      data-mol-id="fab-help"
      onClick={() => navigate('/tickets/new')}
      aria-label={t('floatingHelp.contactSupport', {}, { defaultValue: 'Contact support' })}
    >
      <span className={cm.cn('material-symbols-outlined')} data-icon="chat_bubble">
        chat_bubble
      </span>
    </button>
  )
}

export default FloatingHelpButton
export { FloatingHelpButton }
