import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

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
    id: 'search',
    icon: 'search',
    titleKey: 'about.feature.search.title',
    titleDefault: 'Search every snippet',
    bodyKey: 'about.feature.search.body',
    bodyDefault:
      'Full-text and fuzzy search across every clip you have ever copied — sub-millisecond, even on 100k+ snippets.',
  },
  {
    id: 'crossDevice',
    icon: 'devices',
    titleKey: 'about.feature.crossDevice.title',
    titleDefault: 'Sync across every device',
    bodyKey: 'about.feature.crossDevice.body',
    bodyDefault:
      'macOS, Windows, Linux, iOS, Android, and the web — your clipboard history follows you everywhere.',
  },
  {
    id: 'palette',
    icon: 'keyboard_command_key',
    titleKey: 'about.feature.palette.title',
    titleDefault: 'Command-palette first',
    bodyKey: 'about.feature.palette.body',
    bodyDefault:
      'Open the palette anywhere, pick a clip with the arrow keys, and paste with Enter. Your hands never leave the keyboard.',
  },
  {
    id: 'encryption',
    icon: 'lock',
    titleKey: 'about.feature.encryption.title',
    titleDefault: 'Encrypted by default',
    bodyKey: 'about.feature.encryption.body',
    bodyDefault:
      'Mark anything as a credential and it is AES-encrypted, hidden from previews, and unlocked only on demand.',
  },
  {
    id: 'categories',
    icon: 'category',
    titleKey: 'about.feature.categories.title',
    titleDefault: 'Categories and tags',
    bodyKey: 'about.feature.categories.body',
    bodyDefault:
      'Organize clips into color-coded categories and tag the ones you reach for most, so the right snippet is always one keystroke away.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div data-mol-id="about-content" className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a keyboard-first clipboard manager. Every snippet you copy — code, links, credentials, plain text — is captured, searchable, and instantly recallable across every device you use.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue: `Copying something should never mean losing it. ${APP_NAME} exists so that the thing you copied an hour, a week, or a year ago is always a keystroke away — without leaving your keyboard, and without trusting your most sensitive snippets to plaintext.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
            {FEATURES.map((feature) => (
              <div
                key={feature.id}
                data-mol-id={`about-feature-${feature.id}`}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/40',
                )}
              >
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-2xl text-primary"
                >
                  {feature.icon}
                </span>
                <h3
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    'text-on-surface',
                  )}
                >
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Found a bug, have a feature request, or just want to say hello? Reach out from the Settings page — every message goes to a real human on the team.',
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
