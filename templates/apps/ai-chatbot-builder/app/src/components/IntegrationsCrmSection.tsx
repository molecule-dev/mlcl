import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

// Salesforce / HubSpot connectors are not implemented yet. We render the
// catalogue with disabled "Coming soon" buttons so users see what is
// planned without firing requests that would 404.
function IntegrationsCRMSection() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const cards = [
    {
      key: 'salesforce',
      name: 'Salesforce',
      icon: 'cloud',
      iconClass: 'text-[#00A1E0]',
      description: t(
        'integrationsCrm.salesforceDescription',
        {},
        {
          defaultValue: 'Sync chatbot leads and conversation history directly to your CRM records.',
        },
      ),
    },
    {
      key: 'hubspot',
      name: 'HubSpot',
      icon: 'hub',
      iconClass: 'text-[#FF7A59]',
      description: t(
        'integrationsCrm.hubspotDescription',
        {},
        {
          defaultValue: 'Automate lead capture and update contact properties from chat sessions.',
        },
      ),
    },
  ]

  return (
    <div data-mol-id="crm-group">
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 6), 'gap-4')}>
        <h3
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'font-headline tracking-tight',
          )}
        >
          {t('integrationsCrm.sectionTitle', {}, { defaultValue: 'CRM & Marketing' })}
        </h3>
        <div className={cm.cn(cm.flex1, 'h-px bg-outline-variant/20')}></div>
      </div>
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 lg:grid-cols-4')}>
        {cards.map((card) => (
          <article
            key={card.key}
            data-mol-id={`card-${card.key}`}
            className={cm.cn(
              cm.sp('p', 6),
              'group bg-surface-container-lowest rounded-[1.5rem] ambient-shadow transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(14),
                cm.h(14),
                cm.sp('mb', 5),
                'rounded-2xl bg-surface-container-high group-hover:scale-110 transition-transform',
              )}
            >
              <span
                className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined', card.iconClass)}
              >
                {card.icon}
              </span>
            </div>
            <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
              {card.name}
            </h4>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mb', 6),
                'text-on-surface-variant leading-relaxed',
              )}
            >
              {card.description}
            </p>
            <button
              type="button"
              disabled
              title={t(
                'common.comingSoonHint',
                {},
                { defaultValue: 'This integration is not available yet.' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-xl bg-surface-container-high text-on-surface-variant cursor-not-allowed',
              )}
            >
              {t('common.comingSoon', {}, { defaultValue: 'Coming soon' })}
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}

export default IntegrationsCRMSection
export { IntegrationsCRMSection }
