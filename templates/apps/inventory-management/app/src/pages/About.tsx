import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Feature {
  id: string
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'sku-truth',
    icon: 'inventory_2',
    titleKey: 'about.featureSku',
    titleDefault: 'One ledger for every SKU',
    bodyKey: 'about.featureSkuBody',
    bodyDefault:
      'Products, barcodes, categories, and unit costs in a single catalog — with bin-level stock counts that stay accurate from receiving to shipment.',
  },
  {
    id: 'multi-warehouse',
    icon: 'warehouse',
    titleKey: 'about.featureWarehouses',
    titleDefault: 'Multi-warehouse stock control',
    bodyKey: 'about.featureWarehousesBody',
    bodyDefault:
      'Track quantities across every site, move units with auditable stock transfers, and see capacity and contacts for each location at a glance.',
  },
  {
    id: 'alerts',
    icon: 'notifications_active',
    titleKey: 'about.featureAlerts',
    titleDefault: 'Low-stock alerts that fire on time',
    bodyKey: 'about.featureAlertsBody',
    bodyDefault:
      'Set reorder thresholds per product and warehouse. When stock drops, an alert is raised and the right people are emailed before you run out.',
  },
  {
    id: 'orders',
    icon: 'local_shipping',
    titleKey: 'about.featureOrders',
    titleDefault: 'Purchase and sales orders',
    bodyKey: 'about.featureOrdersBody',
    bodyDefault:
      'Receive inbound stock against expected quantities and fulfill outbound orders, with every movement written to a tamper-evident history.',
  },
  {
    id: 'reporting',
    icon: 'monitoring',
    titleKey: 'about.featureReporting',
    titleDefault: 'Reporting and CSV import/export',
    bodyKey: 'about.featureReportingBody',
    bodyDefault:
      'Import your existing catalog from CSV, export movements and valuations for finance, and read live reports on stock value and turnover.',
  },
  {
    id: 'search',
    icon: 'search',
    titleKey: 'about.featureSearch',
    titleDefault: 'Instant search across the catalog',
    bodyKey: 'about.featureSearchBody',
    bodyDefault:
      'Find any product, warehouse, or order in milliseconds with full-text search built for floor teams who move fast.',
  },
]

/**
 * Public "About" page describing what {@link APP_NAME} is and what operators get.
 *
 * @returns The rendered about page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.subtitle',
        {},
        { defaultValue: 'Inventory management for operators who count every unit.' },
      )}
    >
      <div className={cm.cn(cm.stack(10))}>
        <section data-mol-id="about-intro" className={cm.cn(cm.stack(3))}>
          <p className={cm.cn(cm.prose, cm.textSize('lg'), 'text-on-surface-variant')}>
            {t(
              'about.intro',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} brings every SKU, every warehouse, and every movement into one console. Built for ops leads and warehouse teams, it replaces the spreadsheet sprawl and disconnected systems that lose units between receiving and shipment with a single, audit-ready source of truth.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'Operations runs on the boring stuff: counts, movements, and alerts. We make the boring stuff fast, observable, and impossible to fake — so the number on the screen is the number on the shelf, and your team can trust it enough to act without recounting.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.whatYouGetTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn('grid sm:grid-cols-2 gap-4')}>
            {FEATURES.map((feature) => (
              <li
                key={feature.id}
                data-mol-id={`about-feature-${feature.id}`}
                className={cm.cn(
                  cm.flex({ gap: 'sm' }),
                  cm.sp('p', 4),
                  'rounded-xl border border-outline-variant/50 bg-surface-container-lowest',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-10 w-10 shrink-0 rounded-lg bg-primary/10 text-primary',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[22px]')}
                    data-icon={feature.icon}
                  >
                    {feature.icon}
                  </span>
                </span>
                <div className={cm.cn(cm.stack(1))}>
                  <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                    {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                  </h3>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Have a question about migrating your catalog, found a bug, or want a walkthrough of {{appName}}? Reach out from your account settings — every message goes to a real person on the team.',
              },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
