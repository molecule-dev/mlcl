import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { PublicAgentProfile } from '../types/agent-public.js'

export function AgentProfileHero({ agent }: { agent: PublicAgentProfile }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(cm.grid({ gap: 'xl', cols: 1 }), 'lg:grid-cols-12 items-center mb-24')}
    >
      <div
        className={cm.cn('lg:col-span-5 aspect-[4/5] overflow-hidden rounded-lg ambient-shadow')}
      >
        <img
          alt={agent.name || t('agentProfileHero.nameFallback', {}, { defaultValue: 'Agent' })}
          className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
          data-alt="Professional portrait of a male real estate agent in a dark tailored suit, standing in a bright modern office with warm natural light."
          src={
            agent.photo ||
            agent.avatar ||
            agent.image ||
            'https://picsum.photos/seed/AgentProfileHero-1/1200/800'
          }
        />
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', align: 'start' }), 'lg:col-span-7')}>
        <span
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.sp('mb', 4),
            'text-secondary font-label tracking-wide',
          )}
        >
          {agent.badge ||
            t('agentProfileHero.badgeFallback', {}, { defaultValue: 'PREMIER AGENT' })}
        </span>
        <h1
          className={cm.cn(
            cm.sp('mb', 2),
            cm.textPrimary,
            'text-6xl lg:text-7xl font-headline font-extrabold tracking-tighter',
          )}
        >
          {agent.name || t('agentProfileHero.nameFallback', {}, { defaultValue: 'Agent' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('medium'),
            cm.sp('mb', 6),
            'text-on-surface-variant',
          )}
        >
          {agent.title ||
            t('agentProfileHero.titleFallback', {}, { defaultValue: 'Licensed Real Estate Agent' })}
          {agent.location
            ? t(
                'agentProfileHero.locationSeparator',
                { location: agent.location },
                { defaultValue: ' • {{location}}' },
              )
            : ''}
        </p>
        <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'md' }), cm.sp('mt', 4))}>
          <a
            href={agent.phone ? `tel:${agent.phone}` : undefined}
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 4),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'sm' }),
              'btn-gradient text-on-primary rounded-lg font-headline transition-all hover:scale-[1.02] active:scale-100',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="call">
              call
            </span>
            {t('agentProfileHero.callButton', {}, { defaultValue: 'Call Agent' })}
          </a>
          <a
            href={agent.email ? `mailto:${agent.email}` : undefined}
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 4),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'sm' }),
              'bg-secondary text-on-secondary rounded-lg font-headline transition-all hover:scale-[1.02] active:scale-100',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="mail">
              mail
            </span>
            {t('agentProfileHero.emailButton', {}, { defaultValue: 'Email Agent' })}
          </a>
          <a
            href={
              agent.email
                ? `mailto:${agent.email}?subject=${encodeURIComponent(t('agentProfileHero.mailtoSubject', {}, { defaultValue: 'Property inquiry' }))}`
                : 'mailto:hello@propertyhub.demo?subject=Property%20inquiry'
            }
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 4),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textPrimary,
              'bg-surface-container-highest rounded-lg font-headline transition-all hover:scale-[1.02] active:scale-100',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="chat">
              chat
            </span>
            {t('agentProfileHero.messageButton', {}, { defaultValue: 'Message' })}
          </a>
        </div>
      </div>
    </section>
  )
}

export default AgentProfileHero
