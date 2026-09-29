import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Connector {
  icon: string
  nameKey: 'settingsIntegrations.connector.acc.name' | 'settingsIntegrations.connector.procore.name'
  nameDef: string
  statusKey: 'settingsIntegrations.connector.status'
  statusDef: string
  descKey: string
  descDef: string
}

const CONNECTORS: Connector[] = [
  {
    icon: 'view_in_ar',
    nameKey: 'settingsIntegrations.connector.acc.name',
    nameDef: 'Autodesk Construction Cloud / BIM 360',
    statusKey: 'settingsIntegrations.connector.status',
    statusDef: 'Available on paid plans',
    descKey: 'settingsIntegrations.connector.acc.desc',
    descDef:
      'Keep the BIM 360 model tree aligned with the field: sheet revisions publish to the planroom and field markups flow back to the CDE.',
  },
  {
    icon: 'handyman',
    nameKey: 'settingsIntegrations.connector.procore.name',
    nameDef: 'Procore',
    statusKey: 'settingsIntegrations.connector.status',
    statusDef: 'Available on paid plans',
    descKey: 'settingsIntegrations.connector.procore.desc',
    descDef:
      'Mirror punch items and RFI determinations into Procore so the office and the field read one record without double entry.',
  },
]

/**
 * Workspace settings — CDE & cloud BIM integrations (design section 4.0).
 * Informational: which common data environment bridges are available on the
 * workspace's plan. No connection is stored client-side; connecting happens
 * through the account owner's billing contact.
 *
 * @returns The rendered integrations settings section.
 */
function IntegrationsSettingsSection() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      data-mol-id="settings-integrations"
      className={cm.cn(cm.card(), cm.sp('p', 6))}
      aria-labelledby="settings-integrations-heading"
    >
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}>
        <h2
          id="settings-integrations-heading"
          className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}
        >
          {t(
            'settingsIntegrations.heading',
            {},
            { defaultValue: '4.0 CDE & Cloud BIM Integrations' },
          )}
        </h2>
        <span
          className={cm.cn(
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'rounded-full bg-secondary-container text-on-secondary-container',
          )}
        >
          {t('settingsIntegrations.pipelineBadge', {}, { defaultValue: 'ISO 19650 pipeline' })}
        </span>
      </div>
      <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
        {t(
          'settingsIntegrations.subheading',
          {},
          {
            defaultValue:
              'Bridge the field record to your common data environment. Sheets, revisions, and field markups stay in sync so the model the office sees is the one the deck builds from.',
          },
        )}
      </p>
      <ul className={cm.cn(cm.sp('mt', 4), cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
        {CONNECTORS.map((connector) => (
          <li
            key={connector.nameKey}
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-lg border border-outline-variant bg-surface-container-low space-y-2',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container text-on-surface shrink-0"
              >
                <span
                  className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {connector.icon}
                </span>
              </span>
              <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t(connector.nameKey, {}, { defaultValue: connector.nameDef })}
              </h3>
            </div>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(connector.descKey, {}, { defaultValue: connector.descDef })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-secondary uppercase tracking-wider',
              )}
            >
              {t(connector.statusKey, {}, { defaultValue: connector.statusDef })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default IntegrationsSettingsSection
