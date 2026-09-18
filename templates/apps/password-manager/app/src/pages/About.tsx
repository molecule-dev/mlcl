import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
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
    id: 'vault',
    icon: 'lock',
    titleKey: 'about.feature.vault.title',
    titleDefault: 'Encrypted vault',
    bodyKey: 'about.feature.vault.body',
    bodyDefault:
      'Store logins, secure notes, and custom fields in an end-to-end encrypted vault. Your master password derives the key locally — we never see it.',
  },
  {
    id: 'generator',
    icon: 'auto_awesome',
    titleKey: 'about.feature.generator.title',
    titleDefault: 'Password generator',
    bodyKey: 'about.feature.generator.body',
    bodyDefault:
      'Create strong, unguessable passwords, passphrases, and PINs on-device, with a strength meter so you always know how well you are protected.',
  },
  {
    id: 'sharing',
    icon: 'group',
    titleKey: 'about.feature.sharing.title',
    titleDefault: 'Secure sharing',
    bodyKey: 'about.feature.sharing.body',
    bodyDefault:
      'Share individual items or whole vaults with teammates using per-user envelope encryption, granular roles, and a tamper-proof audit trail.',
  },
  {
    id: 'security',
    icon: 'shield',
    titleKey: 'about.feature.security.title',
    titleDefault: 'Security reports',
    bodyKey: 'about.feature.security.body',
    bodyDefault:
      'Continuous checks surface weak, reused, and exposed credentials so you can fix problems before they become breaches.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ContentPageShell bare containerSize="xl" header={<Header />} footer={<Footer />}>
      <div data-mol-id="page-about" className={cm.cn(cm.mxAuto, cm.maxW('3xl'), cm.stack(10))}>
        <header className={cm.cn(cm.stack(3))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-primary-dark',
            )}
          >
            {t('about.eyebrow', {}, { defaultValue: 'About' })}
          </span>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}>
            {t('about.tagline', { tagline: APP_TAGLINE }, { defaultValue: APP_TAGLINE })}
          </p>
        </header>

        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a zero-knowledge password manager that keeps every login, secret note, and shared credential sealed behind encryption only you can unlock. Your master password derives the encryption key on your own device, so the keys to your digital life never leave your hands.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { appName: APP_NAME },
              {
                defaultValue: `Security should not be a trade-off against convenience. ${APP_NAME} pairs end-to-end encryption with a fast, friendly experience so individuals and teams can practice good security habits without friction — strong unique passwords everywhere, shared safely, and watched for exposure.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2')}>
            {FEATURES.map((f) => (
              <article
                key={f.id}
                data-mol-id={`about-feature-${f.id}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  'bg-surface-container-low/60 rounded-2xl border-l-4 border-primary',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('p', 2),
                    'self-start bg-primary-light text-primary rounded-xl material-symbols-outlined text-[22px]',
                  )}
                  aria-hidden="true"
                >
                  {f.icon}
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue: `Questions, feedback, or a security concern? We want to hear it. Reach the ${APP_NAME} team from your account settings — every message goes to a real person.`,
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
