import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'orders',
    titleKey: 'about.featureOrders',
    titleDefault: 'Orders to pick lists',
    bodyDefault:
      'Every order flows into wave-aware pick lists, so pickers, packers, and dock leads always know what ships next.',
    bodyKey: 'about.featureOrdersBody',
  },
  {
    id: 'fulfillment',
    titleKey: 'about.featureFulfillment',
    titleDefault: 'Pick, pack, and ship',
    bodyDefault:
      'A scan-first floor flow captures each pick, pack, and label the moment it happens — with rush, express, and standard lanes that never cross.',
    bodyKey: 'about.featureFulfillmentBody',
  },
  {
    id: 'inventory',
    titleKey: 'about.featureInventory',
    titleDefault: 'Inventory and locations',
    bodyDefault:
      'Live stock, reservations, zones, and bins stay accurate across every movement, so you can trust what the shelf says.',
    bodyKey: 'about.featureInventoryBody',
  },
  {
    id: 'inbound',
    titleKey: 'about.featureInbound',
    titleDefault: 'Receiving and returns',
    bodyDefault:
      'Receipts and RMAs are first-class: check in supplier shipments, restock returns to the right bin, and keep counts honest.',
    bodyKey: 'about.featureInboundBody',
  },
  {
    id: 'visibility',
    titleKey: 'about.featureVisibility',
    titleDefault: 'Reporting and realtime',
    bodyDefault:
      'On-time ship rates, throughput, and SLA boards update in realtime so operators can defend every promise they make.',
    bodyKey: 'about.featureVisibilityBody',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="about-intro" className={cm.cn(cm.stack(2))}>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is operator-grade warehouse fulfillment software — orders, picks, packs, and shipments under one roof. It is built for fulfillment teams that move real volume and need every action on the floor to be fast, observable, and impossible to fake.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'Operations runs on the boring stuff — picks, packs, and shipped labels. We make the boring stuff fast, observable, and dependable, so warehouses ship rush, express, and standard orders without ever crossing the lanes.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((feature) => (
              <li key={feature.id} className={cm.cn(cm.stack(1))}>
                <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </p>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Have feedback, found a bug, or want to see {{app}} on your dock? Reach out from the in-app help — every message goes to a real human on the team.',
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
