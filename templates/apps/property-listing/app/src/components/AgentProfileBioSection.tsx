import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { PublicAgentProfile } from '../types/agent-public.js'

function AgentProfileBioSection({ agent }: { agent: PublicAgentProfile }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 10),
        'lg:col-span-7 bg-surface-container-lowest lg:p-12 rounded-lg ambient-shadow',
      )}
    >
      <h2
        className={cm.cn(
          cm.textSize('3xl'),
          cm.textPrimary,
          cm.sp('mb', 8),
          'font-headline font-extrabold tracking-tight',
        )}
      >
        {t('agentProfileBioSection.heading', {}, { defaultValue: 'Biography' })}
      </h2>
      <div
        className={cm.cn(cm.stack(6), cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}
      >
        {agent.bio ? (
          <p>{agent.bio}</p>
        ) : (
          <>
            <p>
              {t(
                'agentProfileBioSection.fallbackDescription',
                {
                  name:
                    agent.name ||
                    t('agentProfileBioSection.defaultName', {}, { defaultValue: 'Marcus Thorne' }),
                },
                {
                  defaultValue:
                    '{{name}} is dedicated to helping clients find exceptional homes and building lasting relationships rooted in trust and expertise.',
                },
              )}
            </p>
            <p>
              {t(
                'agentProfileBioSection.fallbackTagline',
                {},
                {
                  defaultValue:
                    'He prides himself on transparent communication and a low-pressure, high-value consulting style.',
                },
              )}
            </p>
          </>
        )}
      </div>
    </section>
  )
}

export default AgentProfileBioSection
export { AgentProfileBioSection }
