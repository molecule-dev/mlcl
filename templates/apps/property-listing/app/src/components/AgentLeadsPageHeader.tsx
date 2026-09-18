import React from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function AgentLeadsPageHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section>
      <h1
        className={cm.cn(
          cm.textSize('4xl'),
          cm.sp('mb', 2),
          'font-extrabold text-on-surface tracking-tight',
        )}
      >
        {t('agentLeadsPageHeader.title', {}, { defaultValue: 'Leads' })}
      </h1>
      <p className={cm.cn(cm.maxW('2xl'), 'text-on-surface-variant font-body')}>
        {t(
          'agentLeadsPageHeader.subtitle',
          {},
          {
            defaultValue:
              'Track inquiries, follow up with prospects, and move qualified buyers through your pipeline.',
          },
        )}
      </p>
    </section>
  )
}

export default AgentLeadsPageHeader
