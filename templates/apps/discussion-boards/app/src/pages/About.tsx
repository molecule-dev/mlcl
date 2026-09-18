import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public About page — app-specific copy grounded in the forum's purpose
 * (threaded categories, considered moderation, markdown, reputation).
 *
 * @returns The rendered about page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const features = [
    {
      key: 'categories',
      defaultTitle: 'Categories with their own culture',
      defaultBody:
        'Spin up topic spaces — each with its own moderators, etiquette, colour, and pace. Posts inherit the category colour across the whole experience.',
    },
    {
      key: 'threads',
      defaultTitle: 'Threads built for the long conversation',
      defaultBody:
        'Pin, lock, mark-as-resolved, and follow threads. Replies nest deeply so a discussion can keep going for weeks without losing the plot.',
    },
    {
      key: 'moderation',
      defaultTitle: 'Considered moderation',
      defaultBody:
        'Restraint over deletion. Mute, lock, hide, and ban — every escalation lands in a reviewable moderation queue with an audit trail your community can trust.',
    },
    {
      key: 'markdown',
      defaultTitle: 'Markdown that ages well',
      defaultBody:
        'Write in Markdown with code blocks, quotes, and footnotes as first-class citizens. Posts render for the long-form rhythm of real writing.',
    },
    {
      key: 'reputation',
      defaultTitle: 'Reputation that compounds',
      defaultBody:
        'From Newcomer to Elder, reputation is earned over time across threads. Trust unlocks pinning, drafts, and more as members invest in the community.',
    },
    {
      key: 'search',
      defaultTitle: 'Fast, full-text search',
      defaultBody:
        'Find any thread, post, or member in an instant — so the right conversation is never more than a query away.',
    },
  ]

  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t('about.tagline', { tagline: APP_TAGLINE }, { defaultValue: APP_TAGLINE })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a focused, threaded discussion space — the Reddit and Discourse spirit, modernized. It is a home for communities who care about reputation, considered moderation, and ideas that age well, instead of an endless feed engineered to steal attention.`,
            },
          )}
        </p>

        <section className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue: `We believe online discussion should reward depth over volume. ${APP_NAME} gives a community the structure to think out loud together — clear categories, durable threads, transparent moderation, and reputation that recognizes the people who show up and contribute.`,
              },
            )}
          </p>
        </section>

        <section className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul
            data-mol-id="about-features"
            className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}
          >
            {features.map((f) => (
              <li
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.stack(2),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
                )}
              >
                <h3
                  className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'text-on-surface')}
                >
                  {t(`about.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(`about.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p data-mol-id="about-contact" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue: `Have feedback, found a bug, or want to bring your community to ${APP_NAME}? We would love to hear from you — every message reaches a real person on the team.`,
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
