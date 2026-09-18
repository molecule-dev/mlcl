import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface Agent {
  id?: string
  name?: string
  title?: string
  phone?: string
  photo?: string
}
interface AgentCardProps {
  agent?: Agent | null
}
function PropertyAgentCard({ agent }: AgentCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const name =
    agent?.name ?? t('propertyAgentCard.fallbackName', {}, { defaultValue: 'Marcus Thorne' })
  const agentTitle =
    agent?.title ??
    t('propertyAgentCard.fallbackTitle', {}, { defaultValue: 'Senior Listing Agent' })
  const phone =
    agent?.phone ?? t('propertyAgentCard.fallbackPhone', {}, { defaultValue: '(503) 555-0128' })
  const photo = agent?.photo ?? 'https://picsum.photos/seed/PropertyAgentCard-1/1200/800'
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl shadow-sm border border-border',
      )}
      data-mol-id="property_agent_card"
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mb', 6))}>
        <div
          className={cm.cn(cm.w(16), cm.h(16), 'rounded-2xl overflow-hidden ring-4 ring-primary/5')}
        >
          <img
            alt={name}
            className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
            data-alt="professional portrait of a male real estate agent in a navy suit with confident expression and blurred office background"
            src={photo}
          />
        </div>
        <div>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>{name}</h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{agentTitle}</p>
          <p className={cm.cn(cm.textPrimary, cm.fontWeight('semibold'), cm.textSize('sm'))}>
            {phone}
          </p>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <button
          onClick={() => navigate(agent?.id ? `/agent/${agent.id}` : '/')}
          className={cm.cn(
            cm.button(),
            cm.w('full'),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl font-headline shadow-lg hover:brightness-110 transition-all',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')}>calendar_month</span>
          {t('propertyAgentCard.scheduleTour', {}, { defaultValue: 'Schedule Tour' })}
        </button>
        <button
          onClick={() => setSaved((s) => !s)}
          className={cm.cn(
            cm.button(),
            cm.w('full'),
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            'rounded-xl border-none bg-surface-container-highest text-on-surface hover:bg-surface-container-high transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')}>
            {saved ? 'favorite' : 'favorite_border'}
          </span>
          {saved
            ? t('common.saved', {}, { defaultValue: 'Saved' })
            : t('propertyAgentCard.saveProperty', {}, { defaultValue: 'Save Property' })}
        </button>
      </div>
    </div>
  )
}

export default PropertyAgentCard
export { PropertyAgentCard }
