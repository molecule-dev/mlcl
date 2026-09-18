import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

/**
 * Public "About" page — explains what {@link APP_NAME} is for, grounded in
 * the app's real feature set (infinite canvas, organic branching, real-time
 * collaboration). Wrapped in the same public chrome as Pricing
 * (`ContentPageShell` + `Footer`).
 *
 * @returns The rendered About page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
    >
      <div className={cm.cn(cm.stack(6))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is a spacious, infinite canvas for mind mapping — brainstorms, concept diagrams, SWOTs, and project plans. Drag nodes anywhere, connect ideas with flowing links, zoom and pan without bumping into edges, and let the map grow with your thinking.',
            },
          )}
        </p>

        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 6))}>
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.missionBody',
            {},
            {
              defaultValue:
                'Thinking out loud should feel effortless and shared. We build tools that get out of the way — no rigid grids, no boxed-in templates, no attention-stealing UI — so individuals and teams can capture ideas the moment they strike and shape them together.',
            },
          )}
        </p>

        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 6))}>
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
          <li className={cm.cn('text-on-surface-variant')}>
            {t(
              'about.featureCanvas',
              {},
              {
                defaultValue:
                  'An infinite canvas with draggable nodes, smooth-curve connections, and fluid zoom and pan.',
              },
            )}
          </li>
          <li className={cm.cn('text-on-surface-variant')}>
            {t(
              'about.featureCollab',
              {},
              {
                defaultValue:
                  'Real-time collaboration with live cursors, so your team can branch alongside you instead of waiting their turn.',
              },
            )}
          </li>
          <li className={cm.cn('text-on-surface-variant')}>
            {t(
              'about.featureTemplates',
              {},
              {
                defaultValue:
                  'A library of starter templates plus full version history, so you can jump-start a map and roll back any change.',
              },
            )}
          </li>
          <li className={cm.cn('text-on-surface-variant')}>
            {t(
              'about.featurePricing',
              {},
              {
                defaultValue:
                  'Free forever for solo thinkers; Pro and Team plans add more maps, more nodes, advanced features, and data export.',
              },
            )}
          </li>
        </ul>

        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 6))}>
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p data-mol-id="about-contact" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.contactBody',
            {},
            {
              defaultValue:
                'Have feedback, found a bug, or want to tell us how you map your ideas? We read every note — reach out any time and a real human on the team will get back to you.',
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
